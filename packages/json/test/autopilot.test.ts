import { describe, expect, test } from "bun:test";
import {
  fetchPublicEvidence,
  inferenceCandidates,
  mistralCandidates,
} from "../src/automation/inference.ts";
import { assertMergeCandidate } from "../src/automation/merge.ts";
import {
  allowedCataloguePath,
  assertSafeDelta,
  identityCandidates,
} from "../src/automation/policy.ts";
import type { DiscoveredOffer } from "../src/catalogue/schema.ts";
import type { CatalogueState } from "../src/catalogue/state.ts";

function offer(id: string): DiscoveredOffer {
  return {
    model_id: id,
    name: id,
    connection: {
      protocol: "openai",
      base_url: "https://opencode.ai/inference/v1",
      endpoint: "https://opencode.ai/inference/openai/v1/chat/completions",
    },
    limits: { terms: ["200 req / day"] },
  };
}
function state(ids = ["vendor/model"]): CatalogueState {
  return {
    canonicalModels: { models: [{ id: "vendor/model", name: "Model" }] },
    metadata: { metadata: [] },
    mappings: new Map([
      ["fixture", { provider: "fixture", mappings: { "vendor/model": "vendor/model" } }],
    ]),
    snapshots: new Map([
      ["fixture", { provider: "fixture", name: "Fixture", doc: {}, offers: ids.map(offer) }],
    ]),
  };
}

describe("catalogue autopilot policy", () => {
  test("grounds new canonical identities and aliases in namespaced upstream IDs", () => {
    const data = state(["vendor/new:free"]);
    expect(identityCandidates(data, offer("new-free"))).toEqual([
      { id: "vendor/new", name: "vendor/new:free" },
    ]);
    expect(identityCandidates(data, offer("unknown"))).toEqual([]);
    expect(identityCandidates(state(["vendor/new", "other/new"]), offer("new"))).toHaveLength(2);
    expect(identityCandidates(state(), offer("model-v2"))).toEqual([]);
  });
  test("preserves reviewed canonical names", () => {
    expect(identityCandidates(state(), offer("vendor/model:free"))).toEqual([
      { id: "vendor/model", name: "Model" },
    ]);
  });
  test("rejects identity rewrites, mapping changes and connection changes", () => {
    const before = state();
    const renamed = state();
    renamed.canonicalModels.models = [{ id: "vendor/model", name: "Wrong" }];
    expect(() => assertSafeDelta(before, renamed)).toThrow("Existing identity");
    const remapped = state();
    const mapping = remapped.mappings.get("fixture");
    if (!mapping) throw new Error("Missing fixture mapping");
    mapping.mappings["vendor/model"] = "vendor/other";
    expect(() => assertSafeDelta(before, remapped)).toThrow("Existing mapping");
    const changed = state();
    const changedOffer = changed.snapshots.get("fixture")?.offers[0];
    if (!changedOffer) throw new Error("Missing fixture offer");
    changedOffer.connection.base_url = "https://evil.example";
    expect(() => assertSafeDelta(before, changed)).toThrow("Connection changed");
  });
  test("stops provider loss and mass removal while permitting small retirements", () => {
    expect(() => assertSafeDelta(state(), state([]))).toThrow("emptied");
    const ids = Array.from({ length: 10 }, (_, i) => `vendor/model-${i}`);
    expect(() => assertSafeDelta(state(ids), state(ids.slice(3)))).toThrow("20%");
    expect(() => assertSafeDelta(state(ids), state(ids.slice(1)))).not.toThrow();
  });
  test("free fallback pool requires catalogue membership, live free evidence and supported endpoint", () => {
    const known = offer("known-free");
    expect(inferenceCandidates([known], [known])).toEqual([known]);
    expect(inferenceCandidates([known], [])).toEqual([]);
    expect(inferenceCandidates([], [known])).toEqual([]);
    expect(
      inferenceCandidates(
        [known],
        [
          {
            ...known,
            connection: { base_url: "https://opencode.ai/inference/v1", protocol: "systemone" },
          },
        ],
      ),
    ).toEqual([]);
    expect(
      inferenceCandidates(
        [known],
        [
          {
            ...known,
            connection: {
              base_url: "https://opencode.ai/inference/v1",
              protocol: "openai",
              endpoint: "https://evil.example/chat/completions",
            },
          },
        ],
      ),
    ).toEqual([]);
  });
  test("file scope cannot include executable files or traversal", () => {
    expect(allowedCataloguePath("packages/json/catalogue/mappings/opencode.json")).toBe(true);
    for (const path of [
      ".github/workflows/x.yml",
      "packages/json/src/cli.ts",
      "packages/json/catalogue/../../package.json",
      "packages/json/catalogue/snapshots/a.ts",
    ])
      expect(allowedCataloguePath(path)).toBe(false);
  });
});

const expected = { repository: "owner/repo", head: "head-sha", base: "base-sha", branch: "main" };
const pr = {
  state: "open",
  draft: false,
  user: { login: "github-actions[bot]" },
  head: {
    sha: expected.head,
    ref: "automation/free-model-catalogue",
    repo: { full_name: expected.repository },
  },
  base: { sha: expected.base, ref: "main", repo: { full_name: expected.repository } },
};
const files = ["packages/json/catalogue/unresolved.json"];
test("merge binds repository, branch, bot, head, base, file scope and review state", () => {
  expect(() => assertMergeCandidate(pr, expected, files, [])).not.toThrow();
  expect(() => assertMergeCandidate(pr, { ...expected, head: "moved" }, files, [])).toThrow();
  expect(() => assertMergeCandidate(pr, { ...expected, base: "moved" }, files, [])).toThrow();
  expect(() =>
    assertMergeCandidate(pr, { ...expected, repository: "fork/repo" }, files, []),
  ).toThrow();
  expect(() =>
    assertMergeCandidate({ ...pr, user: { login: "human" } }, expected, files, []),
  ).toThrow();
  expect(() => assertMergeCandidate({ ...pr, draft: true }, expected, files, [])).toThrow();
  expect(() => assertMergeCandidate(pr, expected, ["package.json"], [])).toThrow();
  expect(() => assertMergeCandidate(pr, expected, [], [])).toThrow();
  expect(() =>
    assertMergeCandidate(pr, expected, files, [{ state: "CHANGES_REQUESTED" }]),
  ).toThrow();
});

test("public evidence permits same-origin redirects but blocks external origins and loops", async () => {
  const seen: string[] = [];
  const result = await fetchPublicEvidence(
    "https://opencode.ai/docs/zen/",
    undefined,
    async (url) => {
      seen.push(url);
      return seen.length === 1
        ? new Response(null, { status: 301, headers: { location: "/docs/en/zen/" } })
        : new Response("pricing");
    },
  );
  expect(await result.text()).toBe("pricing");
  expect(seen).toEqual(["https://opencode.ai/docs/zen/", "https://opencode.ai/docs/en/zen/"]);
  await expect(
    fetchPublicEvidence(
      "https://opencode.ai/docs/zen/",
      undefined,
      async () =>
        new Response(null, { status: 302, headers: { location: "https://evil.example/" } }),
    ),
  ).rejects.toThrow("outside OpenCode");
  let calls = 0;
  await expect(
    fetchPublicEvidence("https://opencode.ai/docs/zen/", undefined, async () => {
      calls++;
      return new Response(null, { status: 302, headers: { location: "/loop" } });
    }),
  ).rejects.toThrow("Too many");
  expect(calls).toBe(4);
});

test("Mistral fallback uses only catalogued live chat models on the fixed endpoint", () => {
  const model: DiscoveredOffer = {
    ...offer("mistral-small-latest"),
    connection: { protocol: "openai", base_url: "https://api.mistral.ai/v1" },
  };
  expect(mistralCandidates([model], [model])).toEqual([model]);
  expect(mistralCandidates([], [model])).toEqual([]);
  expect(mistralCandidates([model], [])).toEqual([]);
  const embedding = { ...model, model_id: "codestral-embed" };
  expect(mistralCandidates([embedding], [embedding])).toEqual([]);
  const redirected = {
    ...model,
    connection: { protocol: "openai", base_url: "https://evil.example" },
  };
  expect(mistralCandidates([redirected], [redirected])).toEqual([]);
});
