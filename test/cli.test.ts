import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const cliPath = resolve(import.meta.dir, "../src/cli.ts");
const decoder = new TextDecoder();

function runCli(args: string[]) {
  return Bun.spawnSync({
    cmd: [process.execPath, cliPath, ...args],
    stdout: "pipe",
    stderr: "pipe",
  });
}

async function withTemporaryDirectory(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "free-models-catalogue-"));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("catalogue CLI", () => {
  test("render writes a deterministic empty catalogue", async () => {
    await withTemporaryDirectory(async (directory) => {
      const outputPath = join(directory, "free-models.json");

      const firstRun = runCli(["render", "--output", outputPath]);
      expect(firstRun.exitCode).toBe(0);
      const firstOutput = await Bun.file(outputPath).text();

      const secondRun = runCli(["render", "--output", outputPath]);
      expect(secondRun.exitCode).toBe(0);
      const secondOutput = await Bun.file(outputPath).text();

      expect(firstOutput).toBe('{\n  "schema_version": 1,\n  "models": []\n}\n');
      expect(secondOutput).toBe(firstOutput);
    });
  });

  test("check accepts the rendered catalogue", async () => {
    await withTemporaryDirectory(async (directory) => {
      const outputPath = join(directory, "free-models.json");
      expect(runCli(["render", "--output", outputPath]).exitCode).toBe(0);

      const checkRun = runCli(["check", "--input", outputPath]);
      expect(checkRun.exitCode).toBe(0);
      expect(decoder.decode(checkRun.stderr)).toBe("");
    });
  });

  test("check rejects a structurally invalid catalogue", async () => {
    await withTemporaryDirectory(async (directory) => {
      const invalidPath = join(directory, "invalid.json");
      await Bun.write(invalidPath, '{"schema_version":1,"models":{}}\n');

      const checkRun = runCli(["check", "--input", invalidPath]);
      expect(checkRun.exitCode).toBe(1);
      expect(decoder.decode(checkRun.stderr)).toContain(
        "Public catalogue does not match schema version 1",
      );
    });
  });
});
