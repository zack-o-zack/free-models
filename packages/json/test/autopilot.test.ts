import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { freeReviewer, reviewerTiers } from "../src/automation/inference.ts";
import { assertMergeCandidate } from "../src/automation/merge.ts";
import {
  allowedCataloguePath,
  decideHolds,
  diffParts,
  HOLD_DAYS,
  identityCandidates,
  metadataChanges,
  providerAnomalies,
  restoreCommittedIdentities,
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
  test("reuses the canonical other providers already agree on", () => {
    const base = state(["vendor/beam:free"]);
    const mappings = new Map(base.mappings);
    const data = { ...base, mappings };
    data.canonicalModels.models.push({ id: "vendor/beam-1.0", name: "Beam 1.0" });
    mappings.set("other", {
      provider: "other",
      mappings: { "vendor/beam-free": "vendor/beam-1.0" },
    });
    expect(identityCandidates(data, offer("vendor/beam:free"))).toEqual([
      { id: "vendor/beam-1.0", name: "Beam 1.0" },
    ]);
    mappings.set("third", { provider: "third", mappings: { "vendor/beam": "vendor/model" } });
    expect(identityCandidates(data, offer("vendor/beam:free"))).toEqual([
      { id: "vendor/beam", name: "vendor/beam:free" },
    ]);
  });
  test("preserves reviewed canonical names", () => {
    expect(identityCandidates(state(), offer("vendor/model:free"))).toEqual([
      { id: "vendor/model", name: "Model" },
    ]);
  });
  test("restores edited or removed identities and mappings while keeping additions", () => {
    const before = state();
    const after = state();
    after.canonicalModels.models = [{ id: "vendor/new", name: "New" }];
    const mapping = after.mappings.get("fixture");
    if (!mapping) throw new Error("Missing fixture mapping");
    mapping.mappings["vendor/model"] = "vendor/new";
    mapping.mappings["vendor/new:free"] = "vendor/new";
    const healed = restoreCommittedIdentities(before, after);
    expect(healed.restored).toEqual(["identity vendor/model", "mapping fixture/vendor/model"]);
    expect(healed.models).toEqual([
      { id: "vendor/model", name: "Model" },
      { id: "vendor/new", name: "New" },
    ]);
    expect(healed.mappings.get("fixture")?.mappings).toEqual({
      "vendor/model": "vendor/model",
      "vendor/new:free": "vendor/new",
    });
    expect(mapping.mappings["vendor/model"]).toBe("vendor/new");
    expect(restoreCommittedIdentities(before, state()).restored).toEqual([]);
  });
  test("flags provider loss, mass removal and connection changes per provider", () => {
    expect(providerAnomalies(state(), state([])).get("fixture")).toContain("emptied");
    const ids = Array.from({ length: 10 }, (_, i) => `vendor/model-${i}`);
    expect(providerAnomalies(state(ids), state(ids.slice(3))).get("fixture")).toBe(
      "3 of 10 offers removed",
    );
    expect(providerAnomalies(state(ids), state(ids.slice(1))).size).toBe(0);
    const changed = state();
    const changedOffer = changed.snapshots.get("fixture")?.offers[0];
    if (!changedOffer) throw new Error("Missing fixture offer");
    changedOffer.connection.base_url = "https://evil.example";
    expect(providerAnomalies(state(), changed).get("fixture")).toContain("connection changed");
  });
  test("holds an anomaly until it persists for the hold window, then accepts it", () => {
    const anomalies = new Map([["fixture", "provider disappeared or emptied"]]);
    const first = decideHolds(anomalies, {}, "2026-10-26");
    expect(first.held.get("fixture")).toEqual({
      since: "2026-10-26",
      reason: "provider disappeared or emptied",
    });
    expect(first.accepted.size).toBe(0);
    const previous = Object.fromEntries(first.held);
    expect(decideHolds(anomalies, previous, "2026-10-28").held.has("fixture")).toBe(true);
    const later = new Date(Date.parse("2026-10-26") + HOLD_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const settled = decideHolds(anomalies, previous, later);
    expect(settled.held.size).toBe(0);
    expect(settled.accepted.get("fixture")?.since).toBe("2026-10-26");
    expect(decideHolds(new Map(), previous, later).held.size).toBe(0);
  });
  test("file scope cannot include executable files or traversal", () => {
    expect(allowedCataloguePath("packages/json/catalogue/mappings/opencode.json")).toBe(true);
    expect(allowedCataloguePath("packages/json/catalogue/held-providers.json")).toBe(true);
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

function reviewerPool() {
  const opencode = {
    protocol: "openai" as const,
    base_url: "https://opencode.ai/inference/openai/v1",
    endpoint: "https://opencode.ai/inference/openai/v1/chat/completions",
  };
  const mistral = { protocol: "openai" as const, base_url: "https://api.mistral.ai/v1" };
  const cohere = {
    protocol: "openai" as const,
    base_url: "https://api.cohere.ai/compatibility/v1",
  };
  const offers = {
    opencode: [
      { model_id: "small-free", connection: opencode },
      { model_id: "smart-free", connection: opencode },
      { model_id: "mid-free", connection: opencode },
      { model_id: "unscored-free", connection: opencode },
    ],
    mistral: [
      { model_id: "mistral-medium-latest", connection: mistral },
      { model_id: "mistral-medium-3.5", connection: mistral },
      { model_id: "mistral-embed", connection: mistral },
    ],
    cohere: [{ model_id: "command-a", connection: cohere }],
  };
  const canonical: Record<string, string> = {
    "small-free": "vendor/small",
    "smart-free": "vendor/smart",
    "mid-free": "vendor/mid",
    "unscored-free": "vendor/unscored",
    "mistral-medium-latest": "mistralai/medium",
    "mistral-medium-3.5": "mistralai/medium",
    "mistral-embed": "mistralai/embed",
    "command-a": "cohere/command-a",
  };
  const scores: Record<string, number | undefined> = {
    "vendor/small": 10,
    "vendor/smart": 30,
    "vendor/mid": 20,
    "vendor/unscored": undefined,
    "mistralai/medium": 14,
    "mistralai/embed": undefined,
    "cohere/command-a": 13,
  };
  const build = (providers: Record<string, { model_id: string; connection: object }[]>) =>
    ({
      canonicalModels: { models: [] },
      metadata: {
        metadata: Object.entries(scores).map(([id, intelligence_index]) => ({
          id,
          metadata: {
            context_length: id === "vendor/smart" ? 8_000 : 256_000,
            architecture: { output_modalities: id.endsWith("embed") ? ["embeddings"] : ["text"] },
            supported_parameters: ["max_tokens"],
            ...(intelligence_index === undefined
              ? {}
              : { benchmarks: { artificial_analysis: { intelligence_index } } }),
          },
        })),
      },
      mappings: new Map(
        Object.entries(providers).map(([provider, list]) => [
          provider,
          {
            provider,
            mappings: Object.fromEntries(
              list.map((offer) => [offer.model_id, canonical[offer.model_id]]),
            ),
          },
        ]),
      ),
      snapshots: new Map(
        Object.entries(providers).map(([provider, list]) => [
          provider,
          {
            provider,
            name: provider,
            doc: {},
            offers: list.map((offer) => ({ ...offer, name: offer.model_id, limits: {} })),
          },
        ]),
      ),
    }) as unknown as CatalogueState;
  const env = { OPENCODE_API_KEY: "oc", MISTRAL_FREE_API_KEY: "mi", COHERE_TRIAL_API_KEY: "co" };
  return { baseline: build(offers), live: build(offers), unavailable: new Set<string>(), env };
}

test("reviewer tiers prefer OpenCode, then rank providers and models by catalogued intelligence", () => {
  const pool = reviewerPool();
  const tiers = reviewerTiers(pool).map((tier) => tier.map((offer) => offer.model));
  expect(tiers).toEqual([["smart-free", "mid-free"], ["mistral-medium-3.5"], ["command-a"]]);
  expect(reviewerTiers({ ...pool, unavailable: new Set(["opencode"]) })[0]?.[0]?.provider).toBe(
    "mistral",
  );
  expect(
    reviewerTiers({ ...pool, env: { ...pool.env, MISTRAL_FREE_API_KEY: undefined } }).map(
      (tier) => tier[0]?.provider,
    ),
  ).toEqual(["opencode", "cohere"]);
  const live = reviewerPool().live;
  const snapshot = live.snapshots.get("opencode");
  if (!snapshot) throw new Error("Missing fixture snapshot");
  snapshot.offers.splice(1, 1);
  const moved = snapshot.offers[1];
  if (!moved) throw new Error("Missing fixture offer");
  // Live offers share connection objects with the baseline fixture, so replace rather than mutate.
  Object.assign(moved, {
    connection: { ...moved.connection, endpoint: "https://evil.example/chat/completions" },
  });
  expect(reviewerTiers({ ...pool, live })[0]?.map((offer) => offer.model)).toEqual([
    "small-free",
    "unscored-free",
  ]);
});

test("reviewer tiers keep unscored chat models when upstream drops benchmarks", () => {
  const pool = reviewerPool();
  for (const entry of pool.baseline.metadata.metadata) delete entry.metadata.benchmarks;
  const tiers = reviewerTiers(pool).map((tier) => tier.map((offer) => offer.model));
  // Without scores, longer context ranks first and embedding models are never reviewers.
  expect(tiers).toEqual([["mid-free", "small-free"], ["mistral-medium-3.5"], ["command-a"]]);
});

test("reviewer falls back across provider tiers and records every attempt", async () => {
  const seen: string[] = [];
  const review = freeReviewer(reviewerPool(), async (_url, init) => {
    const { model } = JSON.parse(String(init.body)) as { model: string };
    seen.push(model);
    if (model === "mid-free") return new Response("quota", { status: 403 });
    return Response.json({ choices: [{ message: { content: '{"approve":true}' } }] });
  });
  const verdict = await review("x".repeat(30_000), z.object({ approve: z.boolean() }));
  expect(verdict).toEqual({ model: "mistral/mistral-medium-3.5", result: { approve: true } });
  expect(seen).toEqual(["mid-free", "mistral-medium-3.5"]);
  expect(review.attempts).toEqual([
    { model: "opencode/smart-free", outcome: "context too small" },
    { model: "opencode/mid-free", outcome: "HTTP 403" },
    { model: "mistral/mistral-medium-3.5", outcome: "answered" },
  ]);
  expect(() => freeReviewer({ ...reviewerPool(), env: {} })).toThrow("No catalogued free reviewer");
});

test("reviewer skips providers with account-wide errors on later requests", async () => {
  const seen: string[] = [];
  const review = freeReviewer(reviewerPool(), async (_url, init) => {
    const { model } = JSON.parse(String(init.body)) as { model: string };
    seen.push(model);
    if (model.endsWith("-free")) return new Response("quota", { status: 429 });
    return Response.json({ choices: [{ message: { content: '{"approve":true}' } }] });
  });
  const schema = z.object({ approve: z.boolean() });
  await review("part one", schema);
  await review("part two", schema);
  expect(seen).toEqual(["smart-free", "mistral-medium-3.5", "mistral-medium-3.5"]);
});

test("summarizes refreshed metadata per field path", () => {
  const before = {
    metadata: [
      { id: "a/one", metadata: { benchmarks: { score: 13 }, description: "old" } },
      { id: "a/two", metadata: { benchmarks: { score: 7 } } },
      { id: "a/gone", metadata: {} },
    ],
  };
  const after = {
    metadata: [
      { id: "a/one", metadata: { description: "new", endpoints: ["/chat"] } },
      { id: "a/two", metadata: { benchmarks: { score: 9 } } },
      { id: "a/new", metadata: {} },
    ],
  };
  expect(metadataChanges(before, after)).toEqual({
    added: ["a/new"],
    removed: ["a/gone"],
    fields: [
      {
        path: "benchmarks.score",
        added: 0,
        removed: 1,
        changed: 1,
        examples: [
          { id: "a/one", before: "13" },
          { id: "a/two", before: "7", after: "9" },
        ],
      },
      {
        path: "description",
        added: 0,
        removed: 0,
        changed: 1,
        examples: [{ id: "a/one", before: '"old"', after: '"new"' }],
      },
      {
        path: "endpoints",
        added: 1,
        removed: 0,
        changed: 0,
        examples: [{ id: "a/one", after: '["/chat"]' }],
      },
    ],
  });
});

test("splits large diffs by file, then by hunk with the file header repeated", () => {
  const file = (name: string, ...hunks: string[]) =>
    `diff --git a/${name} b/${name}\n--- a/${name}\n+++ b/${name}\n${hunks.join("")}`;
  const small = file("small.json", "@@ -1 +1 @@\n-a\n+b\n");
  const big = file(
    "big.json",
    `@@ -1 +1 @@\n${"-x\n".repeat(30)}`,
    `@@ -9 +9 @@\n${"+y\n".repeat(30)}`,
  );
  const parts = diffParts(small + big, 200);
  expect(parts).toHaveLength(3);
  expect(parts[0]).toBe(small);
  expect(parts.slice(1).every((part) => part.startsWith("diff --git a/big.json"))).toBe(true);
  expect(parts.join("").replaceAll(/diff --git[^@]*/g, "")).toBe(
    (small + big).replaceAll(/diff --git[^@]*/g, ""),
  );
  expect(diffParts("", 200)).toEqual([]);
  expect(() => diffParts(big, 60)).toThrow("single catalogue diff hunk");
});
