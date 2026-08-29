import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const metadataFixtureCliPath = resolve(import.meta.dir, "support/metadata-fixture-cli.ts");
const decoder = new TextDecoder();

const providerFixtures = {
  "fixture-a": {
    offers: [
      {
        model_id: "alpha/free",
        connection: { base_url: "https://a.example.test/v1" },
        metadata: { upstream_rank: 1 },
      },
      {
        model_id: "gamma/free",
        connection: { base_url: "https://a.example.test/v1" },
        metadata: { upstream_rank: 2 },
      },
    ],
  },
  "fixture-z": {
    offers: [
      {
        model_id: "zeta/beta-free",
        connection: { base_url: "https://z.example.test/v1" },
        metadata: { owned_by: "zeta" },
      },
      {
        model_id: "delta/none-free",
        connection: { base_url: "https://z.example.test/v1" },
        metadata: { owned_by: "delta" },
      },
    ],
  },
};

const upstreamCatalogue = {
  data: [
    {
      id: "acme/alpha",
      canonical_slug: "acme/alpha-20260101",
      architecture: {
        output_modalities: ["text"],
        input_modalities: ["text"],
        modality: "text->text",
      },
      benchmarks: { artificial_analysis: { coding_index: 55.5, agentic_index: 10.5 } },
      context_length: 128000,
      created: 1700000000,
      description: "Alpha model",
      hugging_face_id: "acme/alpha",
      knowledge_cutoff: "2025-01",
      reasoning: { mandatory: false },
      supported_parameters: ["temperature", "tools"],
      name: "Acme: Alpha",
      pricing: { prompt: "0", completion: "0" },
      top_provider: { context_length: 128000 },
    },
    {
      id: "vendor/gamma:free",
      canonical_slug: "vendor/gamma",
      architecture: { input_modalities: ["text"], output_modalities: ["text"] },
      context_length: 32768,
      created: 1700000001,
      description: "Gamma model",
      hugging_face_id: "vendor/gamma",
      reasoning: { default_enabled: false, mandatory: true },
      supported_parameters: ["temperature"],
      name: "Vendor: Gamma (free)",
    },
    {
      id: "zeta/beta-20260101:free",
      canonical_slug: "zeta/beta-20260101",
      architecture: { input_modalities: ["text"], output_modalities: ["text"] },
      benchmarks: { artificial_analysis: { intelligence_index: 20.0 } },
      context_length: 262144,
      created: 1700000002,
      description: "Beta model",
      reasoning: null,
      supported_parameters: [],
    },
    {
      id: "zeta/beta:batch",
      canonical_slug: "zeta/beta-20260101",
      context_length: 999999,
      description: "Beta batch model",
    },
    {
      id: "stealth/inactive",
      canonical_slug: "stealth/inactive-20260101",
      context_length: 8192,
      description: "Inactive model",
    },
  ],
};

const expectedSnapshot = {
  source: "openrouter",
  models: {
    "acme/alpha": {
      architecture: {
        input_modalities: ["text"],
        modality: "text->text",
        output_modalities: ["text"],
      },
      benchmarks: { artificial_analysis: { agentic_index: 10.5, coding_index: 55.5 } },
      context_length: 128000,
      created: 1700000000,
      description: "Alpha model",
      hugging_face_id: "acme/alpha",
      knowledge_cutoff: "2025-01",
      reasoning: { mandatory: false },
      supported_parameters: ["temperature", "tools"],
    },
    "vendor/gamma": {
      architecture: { input_modalities: ["text"], output_modalities: ["text"] },
      benchmarks: null,
      context_length: 32768,
      created: 1700000001,
      description: "Gamma model",
      hugging_face_id: "vendor/gamma",
      knowledge_cutoff: null,
      reasoning: { default_enabled: false, mandatory: true },
      supported_parameters: ["temperature"],
    },
    "zeta/beta": {
      architecture: { input_modalities: ["text"], output_modalities: ["text"] },
      benchmarks: { artificial_analysis: { intelligence_index: 20.0 } },
      context_length: 262144,
      created: 1700000002,
      description: "Beta model",
      hugging_face_id: null,
      knowledge_cutoff: null,
      reasoning: null,
      supported_parameters: [],
    },
  },
};

function runMetadataFixtureCli(workspace: string, command: string) {
  return Bun.spawnSync({
    cmd: [process.execPath, metadataFixtureCliPath, command, "--workspace", workspace],
    env: {
      ...process.env,
      CATALOGUE_FIXTURE_DIRECTORY: join(workspace, "provider-fixtures"),
      OPENROUTER_METADATA_FIXTURE_PATH: join(workspace, "openrouter-metadata.json"),
    },
    stdout: "pipe",
    stderr: "pipe",
  });
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function createWorkspace(): Promise<string> {
  const workspace = await mkdtemp(join(tmpdir(), "free-models-metadata-"));
  await writeJson(join(workspace, "catalogue/canonical-models.json"), { models: [] });
  await writeJson(join(workspace, "catalogue/unresolved.json"), { providers: {} });
  await writeJson(join(workspace, "free-models.json"), { schema_version: 1, models: [] });
  await writeJson(
    join(workspace, "provider-fixtures/fixture-a.json"),
    providerFixtures["fixture-a"],
  );
  await writeJson(
    join(workspace, "provider-fixtures/fixture-z.json"),
    providerFixtures["fixture-z"],
  );
  await writeJson(join(workspace, "openrouter-metadata.json"), upstreamCatalogue);
  return workspace;
}

async function reviewAllOffers(workspace: string): Promise<void> {
  await writeJson(join(workspace, "catalogue/canonical-models.json"), {
    models: [
      { id: "acme/alpha", name: "Alpha" },
      { id: "delta/missing", name: "Missing" },
      { id: "stealth/inactive", name: "Inactive" },
      { id: "vendor/gamma", name: "Gamma" },
      { id: "zeta/beta", name: "Beta" },
    ],
  });
  await writeJson(join(workspace, "catalogue/mappings/fixture-a.json"), {
    provider: "fixture-a",
    mappings: {
      "alpha/free": "acme/alpha",
      "gamma/free": "vendor/gamma",
    },
  });
  await writeJson(join(workspace, "catalogue/mappings/fixture-z.json"), {
    provider: "fixture-z",
    mappings: {
      "delta/none-free": "delta/missing",
      "zeta/beta-free": "zeta/beta",
    },
  });
}

async function withWorkspace(run: (workspace: string) => Promise<void>): Promise<void> {
  const workspace = await createWorkspace();
  try {
    await run(workspace);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

describe("canonical metadata enrichment", () => {
  test("writes a deterministic snapshot resolving free canonical models against the upstream catalogue", async () => {
    await withWorkspace(async (workspace) => {
      expect(runMetadataFixtureCli(workspace, "discover").exitCode).toBe(0);
      await reviewAllOffers(workspace);
      expect(runMetadataFixtureCli(workspace, "reconcile").exitCode).toBe(0);

      const enrichment = runMetadataFixtureCli(workspace, "enrich");
      expect(enrichment.exitCode).toBe(0);

      const snapshotPath = join(workspace, "catalogue/metadata/openrouter.json");
      const snapshotText = await Bun.file(snapshotPath).text();
      expect(JSON.parse(snapshotText)).toEqual(expectedSnapshot);

      expect(runMetadataFixtureCli(workspace, "enrich").exitCode).toBe(0);
      expect(await Bun.file(snapshotPath).text()).toBe(snapshotText);
    });
  });

  test("keeps the approved snapshot and succeeds when the upstream request fails", async () => {
    await withWorkspace(async (workspace) => {
      expect(runMetadataFixtureCli(workspace, "discover").exitCode).toBe(0);
      await reviewAllOffers(workspace);
      expect(runMetadataFixtureCli(workspace, "reconcile").exitCode).toBe(0);
      expect(runMetadataFixtureCli(workspace, "enrich").exitCode).toBe(0);

      const snapshotPath = join(workspace, "catalogue/metadata/openrouter.json");
      const approvedSnapshot = await Bun.file(snapshotPath).text();

      await writeJson(join(workspace, "openrouter-metadata.json"), { http_status: 503 });
      const failedEnrichment = runMetadataFixtureCli(workspace, "enrich");
      expect(failedEnrichment.exitCode).toBe(0);
      expect(decoder.decode(failedEnrichment.stderr)).toContain(
        "Metadata source openrouter enrichment failed",
      );
      expect(decoder.decode(failedEnrichment.stderr)).toContain("HTTP status 503");
      expect(await Bun.file(snapshotPath).text()).toBe(approvedSnapshot);

      expect(runMetadataFixtureCli(workspace, "render").exitCode).toBe(0);
      const publicAfterFailure = JSON.parse(
        await Bun.file(join(workspace, "free-models.json")).text(),
      ) as { models: Array<{ id: string; metadata: unknown }> };
      expect(publicAfterFailure.models[0]?.metadata).toEqual(
        JSON.parse(approvedSnapshot).models["acme/alpha"],
      );
    });
  });

  test("keeps the approved snapshot and succeeds when the upstream shape drifts", async () => {
    await withWorkspace(async (workspace) => {
      expect(runMetadataFixtureCli(workspace, "discover").exitCode).toBe(0);
      await reviewAllOffers(workspace);
      expect(runMetadataFixtureCli(workspace, "reconcile").exitCode).toBe(0);
      expect(runMetadataFixtureCli(workspace, "enrich").exitCode).toBe(0);

      const snapshotPath = join(workspace, "catalogue/metadata/openrouter.json");
      const approvedSnapshot = await Bun.file(snapshotPath).text();

      await writeJson(join(workspace, "openrouter-metadata.json"), { data: "not-an-array" });
      const failedEnrichment = runMetadataFixtureCli(workspace, "enrich");
      expect(failedEnrichment.exitCode).toBe(0);
      expect(decoder.decode(failedEnrichment.stderr)).toContain(
        "Metadata source openrouter enrichment failed",
      );
      expect(decoder.decode(failedEnrichment.stderr)).toContain("expected a data array");
      expect(await Bun.file(snapshotPath).text()).toBe(approvedSnapshot);
    });
  });

  test("keeps the approved snapshot and succeeds when the upstream response is not JSON", async () => {
    await withWorkspace(async (workspace) => {
      expect(runMetadataFixtureCli(workspace, "discover").exitCode).toBe(0);
      await reviewAllOffers(workspace);
      expect(runMetadataFixtureCli(workspace, "reconcile").exitCode).toBe(0);
      expect(runMetadataFixtureCli(workspace, "enrich").exitCode).toBe(0);

      const snapshotPath = join(workspace, "catalogue/metadata/openrouter.json");
      const approvedSnapshot = await Bun.file(snapshotPath).text();

      await Bun.write(join(workspace, "openrouter-metadata.json"), "<html>not json</html>");
      const failedEnrichment = runMetadataFixtureCli(workspace, "enrich");
      expect(failedEnrichment.exitCode).toBe(0);
      expect(decoder.decode(failedEnrichment.stderr)).toContain(
        "Metadata source openrouter enrichment failed",
      );
      expect(await Bun.file(snapshotPath).text()).toBe(approvedSnapshot);
    });
  });

  test("renders canonical metadata into the public catalogue with null for unresolved models", async () => {
    await withWorkspace(async (workspace) => {
      expect(runMetadataFixtureCli(workspace, "discover").exitCode).toBe(0);
      await reviewAllOffers(workspace);
      expect(runMetadataFixtureCli(workspace, "reconcile").exitCode).toBe(0);
      expect(runMetadataFixtureCli(workspace, "enrich").exitCode).toBe(0);
      expect(runMetadataFixtureCli(workspace, "render").exitCode).toBe(0);

      const publicText = await Bun.file(join(workspace, "free-models.json")).text();
      const publicCatalogue = JSON.parse(publicText) as {
        schema_version: number;
        models: Array<{ id: string; metadata: unknown; providers: unknown }>;
      };

      expect(publicCatalogue.schema_version).toBe(1);
      expect(publicCatalogue.models.map((model) => model.id)).toEqual([
        "acme/alpha",
        "delta/missing",
        "vendor/gamma",
        "zeta/beta",
      ]);
      expect(publicCatalogue.models[0]?.metadata).toEqual(expectedSnapshot.models["acme/alpha"]);
      expect(publicCatalogue.models[1]?.metadata).toBeNull();
      expect(publicCatalogue.models[2]?.metadata).toEqual(expectedSnapshot.models["vendor/gamma"]);
      expect(publicCatalogue.models[3]?.metadata).toEqual(expectedSnapshot.models["zeta/beta"]);
      expect(publicCatalogue.models[0]?.providers).toEqual({
        "fixture-a": {
          offers: [
            {
              model_id: "alpha/free",
              connection: { base_url: "https://a.example.test/v1" },
              metadata: { upstream_rank: 1 },
            },
          ],
        },
      });

      expect(runMetadataFixtureCli(workspace, "render").exitCode).toBe(0);
      expect(await Bun.file(join(workspace, "free-models.json")).text()).toBe(publicText);
      expect(runMetadataFixtureCli(workspace, "check").exitCode).toBe(0);
    });
  });

  test("rejects a malformed metadata snapshot when loading catalogue state", async () => {
    await withWorkspace(async (workspace) => {
      expect(runMetadataFixtureCli(workspace, "discover").exitCode).toBe(0);
      await reviewAllOffers(workspace);
      expect(runMetadataFixtureCli(workspace, "reconcile").exitCode).toBe(0);
      expect(runMetadataFixtureCli(workspace, "enrich").exitCode).toBe(0);

      const snapshotPath = join(workspace, "catalogue/metadata/openrouter.json");
      const snapshot = JSON.parse(await Bun.file(snapshotPath).text()) as Record<string, unknown>;
      snapshot.source = "other";
      await writeJson(snapshotPath, snapshot);

      const renderRun = runMetadataFixtureCli(workspace, "render");
      expect(renderRun.exitCode).toBe(1);
      expect(decoder.decode(renderRun.stderr)).toContain(
        "Metadata snapshot source mismatch: expected openrouter, received other",
      );
    });
  });
});
