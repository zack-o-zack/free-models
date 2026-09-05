import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fixtureLimits } from "./support/limits.ts";

const fixtureCliPath = resolve(import.meta.dir, "support/fixture-cli.ts");
const decoder = new TextDecoder();

const fixtureAOffers = [
  {
    model_id: "alpha/free",
    name: "Alpha (free)",
    connection: { base_url: "https://a.example.test/v1", protocol: "openai" },
    limits: fixtureLimits,
  },
];
const fixtureZOffers = [
  {
    model_id: "zeta/beta-free",
    name: "Zeta Beta (free)",
    connection: { base_url: "https://z.example.test/v1", protocol: "openai" },
    limits: fixtureLimits,
  },
];

interface RunOptions {
  readonly metadata?: boolean;
  readonly capture?: boolean;
}

function runFixtureCli(workspace: string, command: string, options: RunOptions = {}) {
  return Bun.spawnSync({
    cmd: [process.execPath, fixtureCliPath, command, "--workspace", workspace],
    env: {
      ...process.env,
      CATALOGUE_FIXTURE_DIRECTORY: join(workspace, "provider-fixtures"),
      ...(options.metadata
        ? { CATALOGUE_METADATA_FIXTURE_PATH: join(workspace, "metadata-fixture.json") }
        : {}),
      ...(options.capture
        ? { CATALOGUE_METADATA_CAPTURE_PATH: join(workspace, "metadata-capture.json") }
        : {}),
    },
    stdout: "pipe",
    stderr: "pipe",
  });
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function withWorkspace(run: (workspace: string) => Promise<void>): Promise<void> {
  const workspace = await mkdtemp(join(tmpdir(), "canonical-metadata-"));
  try {
    await writeJson(join(workspace, "catalogue/canonical-models.json"), {
      models: [
        { id: "zeta/beta", name: "Beta" },
        { id: "stealth:inactive", name: "Inactive" },
        { id: "acme/alpha", name: "Alpha" },
      ],
    });
    await writeJson(join(workspace, "catalogue/canonical-metadata.json"), {
      metadata: [
        {
          id: "acme/alpha",
          metadata: { old_generated: "remove me" },
        },
        {
          id: "stealth:inactive",
          metadata: { private_field: { must: "remain" } },
        },
        {
          id: "zeta/beta",
          metadata: { stale_only: true, nested: { stale: "whole record" } },
        },
      ],
    });
    await writeJson(join(workspace, "catalogue/unresolved.json"), { providers: {} });
    await writeJson(join(workspace, "free-models.json"), { schema_version: 4, models: [] });
    await writeJson(join(workspace, "provider-fixtures/fixture-a.json"), {
      offers: fixtureAOffers,
    });
    await writeJson(join(workspace, "provider-fixtures/fixture-z.json"), {
      offers: fixtureZOffers,
    });
    expect(runFixtureCli(workspace, "discover").exitCode).toBe(0);
    await run(workspace);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function reviewOffers(workspace: string): Promise<void> {
  await writeJson(join(workspace, "catalogue/mappings/fixture-a.json"), {
    provider: "fixture-a",
    mappings: { "alpha/free": "acme/alpha" },
  });
  await writeJson(join(workspace, "catalogue/mappings/fixture-z.json"), {
    provider: "fixture-z",
    mappings: { "zeta/beta-free": "zeta/beta" },
  });
  expect(runFixtureCli(workspace, "reconcile").exitCode).toBe(0);
}

describe("canonical metadata refresh", () => {
  test("enriches active models in one batch and publishes protected schema v4 fields", async () => {
    await withWorkspace(async (workspace) => {
      await reviewOffers(workspace);
      await writeJson(join(workspace, "metadata-fixture.json"), {
        results: {
          "zeta/beta": { summary: "fresh beta" },
          "acme/alpha": {
            z_field: true,
            a_field: { z: 2, a: 1 },
            id: "attacker/model",
            name: "Provider name",
            providers: { attacker: true },
          },
        },
      });

      const refresh = runFixtureCli(workspace, "refresh", {
        metadata: true,
        capture: true,
      });
      expect(refresh.exitCode).toBe(0);
      expect(decoder.decode(refresh.stderr)).toBe("");

      const capture = await Bun.file(join(workspace, "metadata-capture.json")).json();
      expect(capture).toEqual([
        {
          model: { id: "acme/alpha", name: "Alpha" },
          offers: [{ provider: "fixture-a", offer: fixtureAOffers[0] }],
        },
        {
          model: { id: "zeta/beta", name: "Beta" },
          offers: [{ provider: "fixture-z", offer: fixtureZOffers[0] }],
        },
      ]);

      // Catalogue stays identity-only; metadata lives in its own file.
      expect(await Bun.file(join(workspace, "catalogue/canonical-models.json")).json()).toEqual({
        models: [
          { id: "zeta/beta", name: "Beta" },
          { id: "stealth:inactive", name: "Inactive" },
          { id: "acme/alpha", name: "Alpha" },
        ],
      });
      expect(await Bun.file(join(workspace, "catalogue/canonical-metadata.json")).json()).toEqual({
        metadata: [
          {
            id: "acme/alpha",
            metadata: { a_field: { a: 1, z: 2 }, z_field: true },
          },
          {
            id: "stealth:inactive",
            metadata: { private_field: { must: "remain" } },
          },
          { id: "zeta/beta", metadata: { summary: "fresh beta" } },
        ],
      });

      expect(runFixtureCli(workspace, "render").exitCode).toBe(0);
      expect(runFixtureCli(workspace, "check").exitCode).toBe(0);
      const publicCatalogue = await Bun.file(join(workspace, "free-models.json")).json();
      expect(publicCatalogue.schema_version).toBe(4);
      expect(publicCatalogue.models[0]).toMatchObject({
        id: "acme/alpha",
        name: "Alpha",
        a_field: { a: 1, z: 2 },
        z_field: true,
        providers: { "fixture-a": { offers: fixtureAOffers } },
      });
      expect(publicCatalogue.models.map((model: { id: string }) => model.id)).toEqual([
        "acme/alpha",
        "zeta/beta",
      ]);
    });
  });

  test("applies partial results while retaining missing, inactive, and extra records", async () => {
    await withWorkspace(async (workspace) => {
      await reviewOffers(workspace);
      const metadataPath = join(workspace, "catalogue/canonical-metadata.json");
      const cataloguePath = join(workspace, "catalogue/canonical-models.json");
      const beforeMetadata = await Bun.file(metadataPath).json();
      const beforeCatalogue = await Bun.file(cataloguePath).text();
      await writeJson(join(workspace, "metadata-fixture.json"), {
        results: {
          "acme/alpha": { refreshed: true },
          "stealth:inactive": { private_field: "must be ignored" },
          "unknown/model": { created: "must be ignored" },
        },
      });

      const refresh = runFixtureCli(workspace, "refresh", { metadata: true });
      expect(refresh.exitCode).toBe(0);
      const warnings = decoder.decode(refresh.stderr);
      expect(warnings).toContain("omitted 1 active model(s)");
      expect(warnings).toContain("zeta/beta");
      expect(warnings).toContain("ignored 2 out-of-scope result(s) (1 unknown, 1 inactive)");

      const after = await Bun.file(metadataPath).json();
      expect(after.metadata.find((entry: { id: string }) => entry.id === "acme/alpha")).toEqual({
        id: "acme/alpha",
        metadata: { refreshed: true },
      });
      expect(after.metadata.find((entry: { id: string }) => entry.id === "zeta/beta")).toEqual(
        beforeMetadata.metadata.find((entry: { id: string }) => entry.id === "zeta/beta"),
      );
      expect(
        after.metadata.find((entry: { id: string }) => entry.id === "stealth:inactive"),
      ).toEqual(
        beforeMetadata.metadata.find((entry: { id: string }) => entry.id === "stealth:inactive"),
      );
      expect(after.metadata.some((entry: { id: string }) => entry.id === "unknown/model")).toBe(
        false,
      );
      // Catalogue is untouched by a metadata refresh.
      expect(await Bun.file(cataloguePath).text()).toBe(beforeCatalogue);
    });
  });

  test("provider failure warns once and preserves the complete registry", async () => {
    await withWorkspace(async (workspace) => {
      await reviewOffers(workspace);
      await writeJson(join(workspace, "metadata-fixture.json"), {
        error: "fixture source unavailable",
      });
      const metadataPath = join(workspace, "catalogue/canonical-metadata.json");
      const cataloguePath = join(workspace, "catalogue/canonical-models.json");
      const beforeMetadata = await Bun.file(metadataPath).text();
      const beforeCatalogue = await Bun.file(cataloguePath).text();

      const refresh = runFixtureCli(workspace, "refresh", { metadata: true });
      expect(refresh.exitCode).toBe(0);
      expect(decoder.decode(refresh.stderr).trim().split("\n")).toEqual([
        "Canonical metadata refresh failed for 2 active model(s); retaining stale metadata for acme/alpha, zeta/beta: fixture source unavailable",
      ]);
      expect(await Bun.file(metadataPath).text()).toBe(beforeMetadata);
      expect(await Bun.file(cataloguePath).text()).toBe(beforeCatalogue);
      expect(runFixtureCli(workspace, "render").exitCode).toBe(0);
    });
  });

  test("does not invoke enrichment before all offers resolve", async () => {
    await withWorkspace(async (workspace) => {
      await writeJson(join(workspace, "metadata-fixture.json"), {
        results: { "acme/alpha": { refreshed: true } },
      });
      const metadataPath = join(workspace, "catalogue/canonical-metadata.json");
      const before = await Bun.file(metadataPath).text();

      const refresh = runFixtureCli(workspace, "refresh", {
        metadata: true,
        capture: true,
      });
      expect(refresh.exitCode).toBe(1);
      expect(decoder.decode(refresh.stderr)).toContain(
        "Cannot continue while 2 provider model(s) are unresolved",
      );
      expect(await Bun.file(join(workspace, "metadata-capture.json")).exists()).toBe(false);
      expect(await Bun.file(metadataPath).text()).toBe(before);
    });
  });

  test("keeps reconciliation offline when a metadata provider is configured", async () => {
    await withWorkspace(async (workspace) => {
      await reviewOffers(workspace);
      const metadataPath = join(workspace, "catalogue/canonical-metadata.json");
      const before = await Bun.file(metadataPath).text();
      expect(
        runFixtureCli(workspace, "reconcile", { metadata: true, capture: true }).exitCode,
      ).toBe(0);
      expect(await Bun.file(join(workspace, "metadata-capture.json")).exists()).toBe(false);
      expect(await Bun.file(metadataPath).text()).toBe(before);
    });
  });

  test("requires a metadata provider for explicit refresh", async () => {
    await withWorkspace(async (workspace) => {
      await reviewOffers(workspace);
      expect(runFixtureCli(workspace, "reconcile").exitCode).toBe(0);
      const refresh = runFixtureCli(workspace, "refresh");
      expect(refresh.exitCode).toBe(1);
      expect(decoder.decode(refresh.stderr)).toContain(
        "No canonical metadata provider is configured",
      );
    });
  });

  test("normalizes equivalent metadata payload key order without file churn", async () => {
    await withWorkspace(async (workspace) => {
      await reviewOffers(workspace);
      await writeJson(join(workspace, "metadata-fixture.json"), {
        results: {
          "acme/alpha": { outer: { z: true, a: false }, rank: 1 },
          "zeta/beta": { second: 2, first: 1 },
        },
      });
      expect(runFixtureCli(workspace, "refresh", { metadata: true }).exitCode).toBe(0);
      expect(runFixtureCli(workspace, "render").exitCode).toBe(0);
      const metadataPath = join(workspace, "catalogue/canonical-metadata.json");
      const cataloguePath = join(workspace, "catalogue/canonical-models.json");
      const publicPath = join(workspace, "free-models.json");
      const firstMetadata = await Bun.file(metadataPath).text();
      const firstCatalogue = await Bun.file(cataloguePath).text();
      const firstPublic = await Bun.file(publicPath).text();

      await writeJson(join(workspace, "metadata-fixture.json"), {
        results: {
          "zeta/beta": { first: 1, second: 2 },
          "acme/alpha": { rank: 1, outer: { a: false, z: true } },
        },
      });
      expect(runFixtureCli(workspace, "refresh", { metadata: true }).exitCode).toBe(0);
      expect(runFixtureCli(workspace, "render").exitCode).toBe(0);
      expect(await Bun.file(metadataPath).text()).toBe(firstMetadata);
      expect(await Bun.file(cataloguePath).text()).toBe(firstCatalogue);
      expect(await Bun.file(publicPath).text()).toBe(firstPublic);
    });
  });

  test("renders catalogue identity when metadata is missing", async () => {
    await withWorkspace(async (workspace) => {
      await reviewOffers(workspace);
      await writeJson(join(workspace, "catalogue/canonical-metadata.json"), { metadata: [] });

      expect(runFixtureCli(workspace, "render").exitCode).toBe(0);
      expect(runFixtureCli(workspace, "check").exitCode).toBe(0);
      const publicCatalogue = await Bun.file(join(workspace, "free-models.json")).json();
      expect(publicCatalogue.models).toEqual([
        {
          id: "acme/alpha",
          name: "Alpha",
          providers: {
            "fixture-a": {
              name: "fixture-a",
              doc: {},
              offers: fixtureAOffers,
            },
          },
        },
        {
          id: "zeta/beta",
          name: "Beta",
          providers: {
            "fixture-z": {
              name: "fixture-z",
              doc: {},
              offers: fixtureZOffers,
            },
          },
        },
      ]);
    });
  });
});
