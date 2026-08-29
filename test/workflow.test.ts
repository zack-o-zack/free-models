import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const fixtureCliPath = resolve(import.meta.dir, "support/fixture-cli.ts");
const decoder = new TextDecoder();

const fixtureAOffers = [
  {
    model_id: "alpha/alternate-free",
    connection: { base_url: "https://a.example.test/v1", protocol: "openai" },
    metadata: { upstream_rank: 2 },
  },
  {
    model_id: "alpha/free",
    connection: { protocol: "openai", base_url: "https://a.example.test/v1" },
    metadata: { upstream_rank: 1, nested: { z: true, a: "preserved" } },
  },
];

const fixtureZOffers = [
  {
    model_id: "zeta/beta-free",
    connection: { base_url: "https://z.example.test/v1" },
    metadata: { owned_by: "zeta" },
  },
  {
    model_id: "zeta/alpha-free",
    connection: { base_url: "https://z.example.test/v1" },
    metadata: { owned_by: "zeta" },
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
  await writeJson(join(workspace, "free-models.json"), { schema_version: 1, models: [] });
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
      { id: "unused/inactive", name: "Inactive Model" },
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
        schema_version: 1,
        models: [
          {
            id: "acme/alpha",
            name: "Alpha",
            providers: {
              "fixture-a": {
                offers: [
                  {
                    model_id: "alpha/alternate-free",
                    connection: { base_url: "https://a.example.test/v1", protocol: "openai" },
                    metadata: { upstream_rank: 2 },
                  },
                  {
                    model_id: "alpha/free",
                    connection: { base_url: "https://a.example.test/v1", protocol: "openai" },
                    metadata: { nested: { a: "preserved", z: true }, upstream_rank: 1 },
                  },
                ],
              },
              "fixture-z": {
                offers: [
                  {
                    model_id: "zeta/alpha-free",
                    connection: { base_url: "https://z.example.test/v1" },
                    metadata: { owned_by: "zeta" },
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
                offers: [
                  {
                    model_id: "zeta/beta-free",
                    connection: { base_url: "https://z.example.test/v1" },
                    metadata: { owned_by: "zeta" },
                  },
                ],
              },
            },
          },
        ],
      });

      await writeJson(join(workspace, "free-models.json"), { schema_version: 1, models: [] });
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

  test("rejects canonical IDs outside the lowercase owner/model format", async () => {
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
      const snapshotPath = join(workspace, "catalogue/snapshots/fixture-a.json");
      const unresolvedPath = join(workspace, "catalogue/unresolved.json");
      const previousSnapshot = await Bun.file(snapshotPath).text();
      const previousUnresolved = await Bun.file(unresolvedPath).text();
      const publicPath = join(workspace, "free-models.json");
      const previousPublic = await Bun.file(publicPath).text();

      await writeJson(join(workspace, "provider-fixtures/fixture-a.json"), {
        offers: [fixtureAOffers[0], fixtureAOffers[0]],
      });
      const discovery = runFixtureCli(workspace, "discover");
      expect(discovery.exitCode).toBe(1);
      expect(decoder.decode(discovery.stderr)).toContain("Duplicate provider model ID");
      expect(await Bun.file(snapshotPath).text()).toBe(previousSnapshot);
      expect(await Bun.file(unresolvedPath).text()).toBe(previousUnresolved);
      expect(await Bun.file(publicPath).text()).toBe(previousPublic);
    });
  });
});
