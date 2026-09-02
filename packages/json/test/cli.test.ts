import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { catalogueSchema, limitsSchema, offerSchema } from "../src/catalogue/schema.ts";
import { providerRegistry } from "../src/providers/registry.ts";

const cliPath = resolve(import.meta.dir, "../src/cli.ts");
const decoder = new TextDecoder();

function runCli(workspace: string, args: string[]) {
  return Bun.spawnSync({
    cmd: [process.execPath, cliPath, ...args, "--workspace", workspace],
    stdout: "pipe",
    stderr: "pipe",
  });
}

async function withTemporaryDirectory(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "free-models-catalogue-"));
  try {
    await prepareEmptyWorkspace(directory);
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function prepareEmptyWorkspace(workspace: string): Promise<void> {
  await mkdir(join(workspace, "catalogue/mappings"), { recursive: true });
  await mkdir(join(workspace, "catalogue/snapshots"), { recursive: true });
  await Bun.write(join(workspace, "catalogue/canonical-models.json"), '{\n  "models": []\n}\n');
  await Bun.write(join(workspace, "catalogue/unresolved.json"), '{\n  "providers": {}\n}\n');

  for (const provider of providerRegistry) {
    await Bun.write(
      join(workspace, `catalogue/mappings/${provider.id}.json`),
      `${JSON.stringify({ provider: provider.id, mappings: {} }, null, 2)}\n`,
    );
    await Bun.write(
      join(workspace, `catalogue/snapshots/${provider.id}.json`),
      `${JSON.stringify({ provider: provider.id, doc: provider.doc, offers: [] }, null, 2)}\n`,
    );
  }
}

describe("catalogue CLI", () => {
  test("requires nonempty limit terms on every offer", () => {
    expect(offerSchema.safeParse({ model_id: "model", connection: {} }).success).toBe(false);
    expect(limitsSchema.safeParse({ terms: [] }).success).toBe(false);
    expect(limitsSchema.safeParse({ terms: [""] }).success).toBe(false);
    expect(limitsSchema.safeParse({ terms: ["8 req / min"] }).success).toBe(true);
    expect(limitsSchema.safeParse({ terms: ["8 req / min"], source_url: "extra" }).success).toBe(
      false,
    );
  });

  test("schema version 4 accepts open JSON fields and requires catalogue-owned fields", () => {
    const openModel = {
      id: "acme/model",
      name: "Acme Model",
      description: "Source description",
      nested: { values: [true, null, 3] },
      providers: {},
    };

    expect(catalogueSchema.safeParse({ schema_version: 4, models: [openModel] }).success).toBe(
      true,
    );
    expect(
      catalogueSchema.safeParse({
        schema_version: 4,
        models: [{ ...openModel, providers: undefined }],
      }).success,
    ).toBe(false);
    expect(catalogueSchema.safeParse({ schema_version: 1, models: [openModel] }).success).toBe(
      false,
    );

    const offerWithMetadata = {
      ...openModel,
      providers: {
        acme: {
          doc: {},
          offers: [{ model_id: "model", connection: {}, metadata: { legacy: true } }],
        },
      },
    };
    expect(
      catalogueSchema.safeParse({ schema_version: 4, models: [offerWithMetadata] }).success,
    ).toBe(false);

    const validProviderModel = {
      ...openModel,
      providers: {
        acme: {
          doc: {
            overview: "https://example.com/docs",
          },
          offers: [{ model_id: "model", connection: {}, limits: { terms: ["1 req / min"] } }],
        },
      },
    };
    expect(
      catalogueSchema.safeParse({ schema_version: 4, models: [validProviderModel] }).success,
    ).toBe(true);
  });

  test("render writes a deterministic empty catalogue", async () => {
    await withTemporaryDirectory(async (directory) => {
      const outputPath = join(directory, "free-models.json");

      const firstRun = runCli(directory, ["render", "--output", outputPath]);
      expect(firstRun.exitCode).toBe(0);
      const firstOutput = await Bun.file(outputPath).text();

      const secondRun = runCli(directory, ["render", "--output", outputPath]);
      expect(secondRun.exitCode).toBe(0);
      const secondOutput = await Bun.file(outputPath).text();

      expect(firstOutput).toBe('{\n  "schema_version": 4,\n  "models": []\n}\n');
      expect(secondOutput).toBe(firstOutput);
    });
  });

  test("check accepts the rendered catalogue", async () => {
    await withTemporaryDirectory(async (directory) => {
      const outputPath = join(directory, "free-models.json");
      expect(runCli(directory, ["render", "--output", outputPath]).exitCode).toBe(0);

      const checkRun = runCli(directory, ["check", "--input", outputPath]);
      expect(checkRun.exitCode).toBe(0);
      expect(decoder.decode(checkRun.stderr)).toBe("");
    });
  });

  test("check rejects a structurally invalid catalogue", async () => {
    await withTemporaryDirectory(async (directory) => {
      const invalidPath = join(directory, "invalid.json");
      await Bun.write(invalidPath, '{"schema_version":4,"models":{}}\n');

      const checkRun = runCli(directory, ["check", "--input", invalidPath]);
      expect(checkRun.exitCode).toBe(1);
      expect(decoder.decode(checkRun.stderr)).toContain(
        "Public catalogue does not match schema version 4",
      );
    });
  });

  test("check rejects the retired version 3 schema", async () => {
    await withTemporaryDirectory(async (directory) => {
      const versionThreePath = join(directory, "version-three.json");
      await Bun.write(versionThreePath, '{"schema_version":3,"models":[]}\n');

      const checkRun = runCli(directory, ["check", "--input", versionThreePath]);
      expect(checkRun.exitCode).toBe(1);
      expect(decoder.decode(checkRun.stderr)).toContain(
        "Public catalogue does not match schema version 4",
      );
    });
  });
});
