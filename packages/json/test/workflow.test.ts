import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { DiscoveredOffer } from "../src/catalogue/schema.ts";

const fixtureCliPath = resolve(import.meta.dir, "support/fixture-cli.ts");
const decoder = new TextDecoder();

const fixtureAOffers = [
  {
    model_id: "alpha/alternate-free",
    name: "Alpha Alternate (free)",
    connection: { base_url: "https://a.example.test/v1", protocol: "openai" },
  },
  {
    model_id: "alpha/free",
    name: "Alpha (free)",
    connection: { protocol: "openai", base_url: "https://a.example.test/v1" },
  },
];

const fixtureZOffers = [
  {
    model_id: "zeta/beta-free",
    name: "Zeta Beta (free)",
    connection: { base_url: "https://z.example.test/v1", protocol: "openai" },
  },
  {
    model_id: "zeta/alpha-free",
    name: "Zeta Alpha (free)",
    connection: { base_url: "https://z.example.test/v1", protocol: "openai" },
  },
];

function runFixtureCli(workspace: string, command: string) {
  return Bun.spawnSync({
    cmd: [process.execPath, fixtureCliPath, command, "--workspace", workspace],
    env: {
      ...process.env,
      CATALOGUE_FIXTURE_DIRECTORY: join(workspace, "provider-fixtures"),
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
  const workspace = await mkdtemp(join(tmpdir(), "free-models-workflow-"));
  await writeJson(join(workspace, "catalogue/canonical-models.json"), { models: [] });
  await writeJson(join(workspace, "catalogue/unresolved.json"), { providers: {} });
  await writeJson(join(workspace, "free-models.json"), { schema_version: 2, models: [] });
  await writeProviderFixtures(workspace);
  return workspace;
}

async function writeProviderFixtures(workspace: string): Promise<void> {
  await writeJson(join(workspace, "provider-fixtures/fixture-a.json"), {
    offers: fixtureAOffers,
  });
  await writeJson(join(workspace, "provider-fixtures/fixture-z.json"), {
    offers: fixtureZOffers,
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

async function reviewAllOffers(workspace: string): Promise<void> {
  await writeJson(join(workspace, "catalogue/canonical-models.json"), {
    models: [
      { id: "stealth:inactive", name: "Inactive Stealth Model" },
      { id: "zeta/beta", name: "Beta" },
      { id: "acme/alpha", name: "Alpha" },
    ],
  });
  await writeJson(join(workspace, "catalogue/mappings/fixture-a.json"), {
    provider: "fixture-a",
    mappings: {
      "alpha/free": "acme/alpha",
      "alpha/alternate-free": "acme/alpha",
    },
  });
  await writeJson(join(workspace, "catalogue/mappings/fixture-z.json"), {
    provider: "fixture-z",
    mappings: {
      "zeta/alpha-free": "acme/alpha",
      "zeta/beta-free": "zeta/beta",
    },
  });
}

describe("manual identity workflow", () => {
  test("discovers unresolved offers, applies reviewed mappings, and renders grouped output", async () => {
    await withWorkspace(async (workspace) => {
      const discovery = runFixtureCli(workspace, "discover");
      expect(discovery.exitCode).toBe(0);

      expect(await Bun.file(join(workspace, "catalogue/unresolved.json")).json()).toEqual({
        providers: {
          "fixture-a": ["alpha/alternate-free", "alpha/free"],
          "fixture-z": ["zeta/alpha-free", "zeta/beta-free"],
        },
      });
      expect(runFixtureCli(workspace, "render").exitCode).toBe(1);

      await reviewAllOffers(workspace);
      expect(runFixtureCli(workspace, "reconcile").exitCode).toBe(0);
      expect(await Bun.file(join(workspace, "catalogue/unresolved.json")).json()).toEqual({
        providers: {},
      });

      expect(runFixtureCli(workspace, "render").exitCode).toBe(0);
      const firstRender = await Bun.file(join(workspace, "free-models.json")).text();
      expect(runFixtureCli(workspace, "render").exitCode).toBe(0);
      expect(await Bun.file(join(workspace, "free-models.json")).text()).toBe(firstRender);
      expect(runFixtureCli(workspace, "check").exitCode).toBe(0);

      expect(JSON.parse(firstRender)).toEqual({
        schema_version: 2,
        models: [
          {
            id: "acme/alpha",
            name: "Alpha",
            providers: {
              "fixture-a": {
                name: "fixture-a",
                offers: [
                  {
                    model_id: "alpha/alternate-free",
                    name: "Alpha Alternate (free)",
                    connection: { base_url: "https://a.example.test/v1", protocol: "openai" },
                  },
                  {
                    model_id: "alpha/free",
                    name: "Alpha (free)",
                    connection: { base_url: "https://a.example.test/v1", protocol: "openai" },
                  },
                ],
              },
              "fixture-z": {
                name: "fixture-z",
                offers: [
                  {
                    model_id: "zeta/alpha-free",
                    name: "Zeta Alpha (free)",
                    connection: { base_url: "https://z.example.test/v1", protocol: "openai" },
                  },
                ],
              },
            },
          },
          {
            id: "zeta/beta",
            name: "Beta",
            providers: {
              "fixture-z": {
                name: "fixture-z",
                offers: [
                  {
                    model_id: "zeta/beta-free",
                    name: "Zeta Beta (free)",
                    connection: { base_url: "https://z.example.test/v1", protocol: "openai" },
                  },
                ],
              },
            },
          },
        ],
      });

      await writeJson(join(workspace, "free-models.json"), { schema_version: 2, models: [] });
      const staleCheck = runFixtureCli(workspace, "check");
      expect(staleCheck.exitCode).toBe(1);
      expect(decoder.decode(staleCheck.stderr)).toContain("Public catalogue is stale");
    });
  });

  test("detects an unresolved report that was edited instead of reconciled", async () => {
    await withWorkspace(async (workspace) => {
      expect(runFixtureCli(workspace, "discover").exitCode).toBe(0);
      await writeJson(join(workspace, "catalogue/unresolved.json"), { providers: {} });

      const check = runFixtureCli(workspace, "check");
      expect(check.exitCode).toBe(1);
      expect(decoder.decode(check.stderr)).toContain("Unresolved report is stale");
    });
  });

  test("rejects invalid canonical targets and malformed mapping documents", async () => {
    await withWorkspace(async (workspace) => {
      expect(runFixtureCli(workspace, "discover").exitCode).toBe(0);
      await writeJson(join(workspace, "catalogue/canonical-models.json"), {
        models: [{ id: "acme/alpha", name: "Alpha" }],
      });
      await writeJson(join(workspace, "catalogue/mappings/fixture-a.json"), {
        provider: "fixture-a",
        mappings: { "alpha/free": "missing/model" },
      });

      const unknownTarget = runFixtureCli(workspace, "reconcile");
      expect(unknownTarget.exitCode).toBe(1);
      expect(decoder.decode(unknownTarget.stderr)).toContain("targets unknown canonical model");

      await writeJson(join(workspace, "catalogue/mappings/fixture-a.json"), {
        provider: "fixture-a",
        mappings: [],
      });
      const malformed = runFixtureCli(workspace, "reconcile");
      expect(malformed.exitCode).toBe(1);
      expect(decoder.decode(malformed.stderr)).toContain(
        "Mappings for provider fixture-a is invalid",
      );
    });
  });

  test("rejects canonical IDs outside the supported lowercase formats", async () => {
    await withWorkspace(async (workspace) => {
      expect(runFixtureCli(workspace, "discover").exitCode).toBe(0);
      await writeJson(join(workspace, "catalogue/canonical-models.json"), {
        models: [{ id: "Acme/Alpha", name: "Alpha" }],
      });

      const reconciliation = runFixtureCli(workspace, "reconcile");
      expect(reconciliation.exitCode).toBe(1);
      expect(decoder.decode(reconciliation.stderr)).toContain(
        "Canonical model registry is invalid",
      );
    });
  });

  test("leaves approved generated files unchanged when discovery validation fails", async () => {
    await withWorkspace(async (workspace) => {
      expect(runFixtureCli(workspace, "discover").exitCode).toBe(0);
      const fixtureASnapshotPath = join(workspace, "catalogue/snapshots/fixture-a.json");
      const fixtureZSnapshotPath = join(workspace, "catalogue/snapshots/fixture-z.json");
      const unresolvedPath = join(workspace, "catalogue/unresolved.json");
      const previousFixtureASnapshot = await Bun.file(fixtureASnapshotPath).text();
      const previousFixtureZSnapshot = await Bun.file(fixtureZSnapshotPath).text();
      const previousUnresolved = await Bun.file(unresolvedPath).text();
      const publicPath = join(workspace, "free-models.json");
      const previousPublic = await Bun.file(publicPath).text();

      await writeJson(join(workspace, "provider-fixtures/fixture-a.json"), {
        offers: [fixtureAOffers[0], fixtureAOffers[0]],
      });
      await writeJson(join(workspace, "provider-fixtures/fixture-z.json"), {
        offers: [
          {
            ...fixtureZOffers[0],
            connection: { base_url: "https://changed.example.test/v1", protocol: "openai" },
          },
        ],
      });
      const discovery = runFixtureCli(workspace, "discover");
      expect(discovery.exitCode).toBe(1);
      expect(decoder.decode(discovery.stderr)).toContain(
        "Provider fixture-a validation failed: Duplicate provider model ID",
      );
      expect(await Bun.file(fixtureASnapshotPath).text()).toBe(previousFixtureASnapshot);
      expect(await Bun.file(fixtureZSnapshotPath).text()).toBe(previousFixtureZSnapshot);
      expect(await Bun.file(unresolvedPath).text()).toBe(previousUnresolved);
      expect(await Bun.file(publicPath).text()).toBe(previousPublic);
    });
  });

  test("handles removals, connection changes, and returning mapped offers deterministically", async () => {
    await withWorkspace(async (workspace) => {
      expect(runFixtureCli(workspace, "discover").exitCode).toBe(0);
      await reviewAllOffers(workspace);
      expect(runFixtureCli(workspace, "reconcile").exitCode).toBe(0);
      expect(runFixtureCli(workspace, "render").exitCode).toBe(0);

      const mappingAPath = join(workspace, "catalogue/mappings/fixture-a.json");
      const mappingZPath = join(workspace, "catalogue/mappings/fixture-z.json");
      const originalMappingA = await Bun.file(mappingAPath).text();
      const originalMappingZ = await Bun.file(mappingZPath).text();
      const originalSnapshotA = await Bun.file(
        join(workspace, "catalogue/snapshots/fixture-a.json"),
      ).text();
      const originalSnapshotZ = await Bun.file(
        join(workspace, "catalogue/snapshots/fixture-z.json"),
      ).text();
      const originalPublic = await Bun.file(join(workspace, "free-models.json")).text();

      await writeJson(join(workspace, "provider-fixtures/fixture-a.json"), {
        offers: [
          {
            ...fixtureAOffers[0],
            connection: {
              base_url: "https://a.example.test/v1",
              protocol: "openai",
              region: "global",
            },
          },
        ],
      });
      await writeJson(join(workspace, "provider-fixtures/fixture-z.json"), {
        offers: [fixtureZOffers[1]],
      });

      expect(runFixtureCli(workspace, "discover").exitCode).toBe(0);
      expect(await Bun.file(join(workspace, "catalogue/unresolved.json")).json()).toEqual({
        providers: {},
      });
      expect(await Bun.file(mappingAPath).text()).toBe(originalMappingA);
      expect(await Bun.file(mappingZPath).text()).toBe(originalMappingZ);
      expect(runFixtureCli(workspace, "render").exitCode).toBe(0);

      const changedPublicText = await Bun.file(join(workspace, "free-models.json")).text();
      expect(changedPublicText).not.toBe(originalPublic);
      const changedPublic = JSON.parse(changedPublicText) as {
        models: Array<{
          id: string;
          providers: Record<string, { offers: DiscoveredOffer[] }>;
        }>;
      };
      expect(changedPublic.models.map((model) => model.id)).toEqual(["acme/alpha"]);
      expect(changedPublic.models[0]?.providers["fixture-a"]?.offers[0]?.connection).toEqual({
        base_url: "https://a.example.test/v1",
        protocol: "openai",
        region: "global",
      });
      expect(
        (await Bun.file(join(workspace, "catalogue/canonical-models.json")).json()).models,
      ).toContainEqual({ id: "zeta/beta", name: "Beta" });

      await writeJson(join(workspace, "provider-fixtures/fixture-a.json"), {
        offers: [...fixtureAOffers].reverse(),
      });
      await writeJson(join(workspace, "provider-fixtures/fixture-z.json"), {
        offers: [...fixtureZOffers].reverse(),
      });
      expect(runFixtureCli(workspace, "discover").exitCode).toBe(0);
      expect(await Bun.file(join(workspace, "catalogue/unresolved.json")).json()).toEqual({
        providers: {},
      });
      expect(runFixtureCli(workspace, "render").exitCode).toBe(0);
      expect(await Bun.file(join(workspace, "free-models.json")).text()).toBe(originalPublic);
      expect(await Bun.file(join(workspace, "catalogue/snapshots/fixture-a.json")).text()).toBe(
        originalSnapshotA,
      );
      expect(await Bun.file(join(workspace, "catalogue/snapshots/fixture-z.json")).text()).toBe(
        originalSnapshotZ,
      );

      const stableUnresolved = await Bun.file(join(workspace, "catalogue/unresolved.json")).text();
      expect(runFixtureCli(workspace, "discover").exitCode).toBe(0);
      expect(runFixtureCli(workspace, "reconcile").exitCode).toBe(0);
      expect(runFixtureCli(workspace, "render").exitCode).toBe(0);
      expect(await Bun.file(join(workspace, "catalogue/unresolved.json")).text()).toBe(
        stableUnresolved,
      );
      expect(await Bun.file(join(workspace, "free-models.json")).text()).toBe(originalPublic);
    });
  });
});
