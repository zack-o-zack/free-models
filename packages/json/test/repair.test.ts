import { afterEach, describe, expect, test } from "bun:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type CataloguePaths, cataloguePaths, serializeJson } from "../src/catalogue/files.ts";
import { JsonCatalogueRenderer } from "../src/catalogue/render.ts";
import type { ProviderSnapshot } from "../src/catalogue/schema.ts";
import { type CatalogueState, loadCatalogueState } from "../src/catalogue/state.ts";
import { check, refreshMetadata, reconcile, render } from "../src/catalogue/workflow.ts";
import { assertSafeDelta } from "../src/automation/policy.ts";
import {
  createJevClient,
  type JevAnswer,
  type JevClient,
  type JevQuestions,
  type JevResponse,
} from "../src/automation/jev.ts";
import { type RepairReport, repairCatalogue } from "../src/automation/repair.ts";
import type { Escalate } from "../src/automation/escalation.ts";
import type { UniverseModel } from "../src/automation/identity-index.ts";
import { MINT_CAP } from "../src/automation/resolve.ts";
import { providerRegistry } from "../src/providers/registry.ts";

const workspaceRoot = resolve(import.meta.dir, "..");
const pristine = await loadCatalogueState(cataloguePaths(workspaceRoot), providerRegistry);
const BEAM = "reflection/beam-1.0-501b-a23b";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function workspace(): Promise<CataloguePaths> {
  const dir = await mkdtemp(join(tmpdir(), "catalogue-repair-"));
  directories.push(dir);
  await cp(resolve(workspaceRoot, "catalogue"), join(dir, "catalogue"), { recursive: true });
  return cataloguePaths(dir);
}

async function addOffers(
  paths: CataloguePaths,
  provider: string,
  modelIds: string[],
): Promise<void> {
  const snapshot = JSON.parse(await readFile(paths.snapshot(provider), "utf8")) as ProviderSnapshot;
  for (const modelId of modelIds) {
    snapshot.offers.push({
      model_id: modelId,
      name: `${modelId.replace(/:free$/, "")} (free)`,
      connection: { base_url: "https://example.test/v1", protocol: "openai" },
      limits: { terms: ["test limit"] },
    });
  }
  await writeFile(paths.snapshot(provider), serializeJson(snapshot));
}

function noMatchJev(): JevClient {
  return {
    async evaluate(_state: string, questions: JevQuestions) {
      const answers: Record<string, JevAnswer> = {};
      for (const [id, question] of Object.entries(questions)) {
        if (question.type === "noul") answers[id] = { type: "noul", noul: 0.1 };
        else {
          const probabilities = Object.fromEntries(
            Object.keys(question.criteria).map((key) => [key, 0]),
          );
          const [first] = Object.keys(question.criteria);
          answers[id] = { type: "choice", choice: first ?? "", confidence: 0.1, probabilities };
        }
      }
      const response: JevResponse = {
        model: "jev-test",
        answers,
        usage: { input_tokens: 1, output_tokens: 1 },
      };
      return response;
    },
  };
}

const unexpectedJev: JevClient = {
  async evaluate() {
    throw new Error("model must not be called");
  },
};

const noMatchEscalate: Escalate = async () => ({
  canonicalId: null,
  reason: "no listed candidate is this model",
  confidence: 0.9,
});

const unexpectedEscalate: Escalate = async () => {
  throw new Error("escalation must not be called");
};

function universeFor(ids: string[]): UniverseModel[] {
  return ids.map((id) => ({ id, name: id }));
}

async function runRepair(
  paths: CataloguePaths,
  options: {
    jev: JevClient;
    escalate: Escalate;
    universe: readonly UniverseModel[] | null;
  },
) {
  const current = await loadCatalogueState(paths, providerRegistry);
  const report: RepairReport = {
    phase: "repair",
    unresolvedCount: 0,
    pending: [],
    resolutions: [],
    escalationModels: [],
  };
  const persisted: RepairReport[] = [];
  const summary = await repairCatalogue({
    before: pristine,
    current,
    paths,
    jev: options.jev,
    escalate: options.escalate,
    escalationModels: () => [],
    universe: options.universe,
    report,
    persistReport: async (value) => {
      persisted.push(structuredClone(value));
    },
    reconcile: () => reconcile(paths, providerRegistry),
  });
  return { summary, report, persisted };
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

describe("repair wiring", () => {
  test("committed aliases resolve by consensus with zero model calls and persist the mapping", async () => {
    const paths = await workspace();
    await addOffers(paths, "bazaarlink", ["reflection/beam-free:free"]);

    const { summary, persisted } = await runRepair(paths, {
      jev: unexpectedJev,
      escalate: unexpectedEscalate,
      universe: null,
    });

    expect(summary.exitCode).toBe(0);
    expect(summary.counts.verified).toBe(1);
    expect(persisted).toHaveLength(1);
    const mapping = await readJson<{ mappings: Record<string, string> }>(
      paths.mapping("bazaarlink"),
    );
    expect(mapping.mappings["reflection/beam-free:free"]).toBe(BEAM);
    const unresolved = await readJson<{ providers: Record<string, string[]> }>(paths.unresolved);
    expect(unresolved.providers.bazaarlink).toBeUndefined();
  });

  test("a missing Jev key defers model-dependent offers, keeps deterministic progress, and mints nothing", async () => {
    const paths = await workspace();
    await addOffers(paths, "bazaarlink", ["reflection/beam-free:free"]);
    await addOffers(paths, "kilo", ["acme/novel-thing:free"]);
    const canonicalBefore = await readFile(paths.canonicalModels, "utf8");
    const jev = createJevClient({ env: {} });

    const { summary, persisted } = await runRepair(paths, {
      jev,
      escalate: unexpectedEscalate,
      universe: universeFor(["acme/novel-thing-pro"]),
    });

    expect(summary.counts).toEqual({ verified: 1, escalated: 0, minted: 0, deferred: 1 });
    expect(summary.exitCode).toBe(0);
    expect(
      persisted[0]?.resolutions.find((row) => row.id === "acme/novel-thing:free")?.reason,
    ).toContain("TYPESAFE_API_KEY");
    expect(await readFile(paths.canonicalModels, "utf8")).toBe(canonicalBefore);
  });

  test("no progress with deferred offers exits 1 and writes no catalogue files", async () => {
    const paths = await workspace();
    await addOffers(paths, "kilo", ["acme/novel-thing:free"]);
    const mappingBefore = await readFile(paths.mapping("kilo"), "utf8");

    const { summary } = await runRepair(paths, {
      jev: createJevClient({ env: {} }),
      escalate: unexpectedEscalate,
      universe: universeFor(["acme/novel-thing-pro"]),
    });

    expect(summary.exitCode).toBe(1);
    expect(await readFile(paths.mapping("kilo"), "utf8")).toBe(mappingBefore);
  });

  test("the mint cap refuses the eleventh identity and exits 1 after persisting the first ten", async () => {
    const paths = await workspace();
    const ids = Array.from({ length: MINT_CAP + 1 }, (_, index) => `acme/novel-${index}:free`);
    await addOffers(paths, "kilo", ids);
    const universe = universeFor(ids.map((id) => `${id.replace(/:free$/, "")}-pro`));
    const canonicalBefore = pristine.canonicalModels.models.length;

    const { summary } = await runRepair(paths, {
      jev: noMatchJev(),
      escalate: noMatchEscalate,
      universe,
    });

    expect(summary.counts.minted).toBe(MINT_CAP);
    expect(summary.counts.deferred).toBe(1);
    expect(summary.exitCode).toBe(1);
    const models = await readJson<{ models: { id: string }[] }>(paths.canonicalModels);
    expect(models.models.length).toBe(canonicalBefore + MINT_CAP);
  });

  test("more than forty unresolved identities aborts before any write", async () => {
    const paths = await workspace();
    const ids = Array.from({ length: 41 }, (_, index) => `acme/bulk-${index}:free`);
    await addOffers(paths, "kilo", ids);
    const canonicalBefore = await readFile(paths.canonicalModels, "utf8");

    await expect(
      runRepair(paths, { jev: unexpectedJev, escalate: unexpectedEscalate, universe: null }),
    ).rejects.toThrow(/anomaly limit.*\.scratch\/catalogue-agent-report\.json/);
    expect(await readFile(paths.canonicalModels, "utf8")).toBe(canonicalBefore);
  });

  test("minted provenance survives refresh, render and check", async () => {
    const paths = await workspace();
    await addOffers(paths, "kilo", ["acme/novel-a:free", "acme/novel-b:free"]);
    const universe = universeFor(["acme/novel-a-pro", "acme/novel-b-pro"]);

    const { summary } = await runRepair(paths, {
      jev: noMatchJev(),
      escalate: noMatchEscalate,
      universe,
    });
    expect(summary.counts.minted).toBe(2);
    expect(summary.exitCode).toBe(0);

    const providers = providerRegistry;
    await refreshMetadata(paths, providers, {
      enrich: async () => new Map([["acme/novel-a", { description: "Fresh description" }]]),
    });
    const metadata = await readJson<{
      metadata: { id: string; metadata: Record<string, unknown> }[];
    }>(paths.canonicalMetadata);
    const refreshed = metadata.metadata.find((entry) => entry.id === "acme/novel-a");
    expect(refreshed?.metadata.description).toBe("Fresh description");
    expect(refreshed?.metadata.identity_provenance).toMatchObject({
      source: "minted",
      provider: "kilo",
      model_id: "acme/novel-a:free",
    });

    const renderer = new JsonCatalogueRenderer();
    const output = join(paths.workspace, renderer.defaultFileName);
    await render(paths, providers, renderer, output);
    await check(paths, providers, renderer, output);
  });

  test("assertSafeDelta accepts pure additions and rejects a changed existing mapping", () => {
    const additions: CatalogueState = {
      ...pristine,
      canonicalModels: {
        models: [...pristine.canonicalModels.models, { id: "acme/novel-a", name: "Novel A" }],
      },
      mappings: new Map(pristine.mappings).set("kilo", {
        provider: "kilo",
        mappings: {
          ...pristine.mappings.get("kilo")?.mappings,
          "acme/novel-a:free": "acme/novel-a",
        },
      }),
    };
    expect(() => assertSafeDelta(pristine, additions)).not.toThrow();

    const kilo = pristine.mappings.get("kilo");
    const [firstAlias] = Object.keys(kilo?.mappings ?? {});
    const changed: CatalogueState = {
      ...pristine,
      mappings: new Map(pristine.mappings).set("kilo", {
        provider: "kilo",
        mappings: { ...kilo?.mappings, [firstAlias ?? ""]: "acme/other" },
      }),
    };
    expect(() => assertSafeDelta(pristine, changed)).toThrow(/Existing mapping changed/);
  });
});
