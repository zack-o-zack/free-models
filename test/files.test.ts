import { expect, test } from "bun:test";
import { mkdtemp, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeTextFilesAtomically } from "../src/catalogue/files.ts";

test("an atomic persistence failure rolls back an earlier installed registry update", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "catalogue-atomic-write-"));
  const canonicalPath = join(workspace, "canonical-models.json");
  const unresolvedPath = join(workspace, "unresolved.json");
  const originalCanonical = '{\n  "models": []\n}\n';
  const originalUnresolved = '{\n  "providers": {}\n}\n';
  let installCount = 0;

  try {
    await Bun.write(canonicalPath, originalCanonical);
    await Bun.write(unresolvedPath, originalUnresolved);

    expect(
      writeTextFilesAtomically(
        [
          { path: unresolvedPath, contents: '{"providers":{"fixture":["model"]}}\n' },
          { path: canonicalPath, contents: '{"models":[{"id":"acme/model"}]}\n' },
        ],
        {
          rename: async (source, destination) => {
            if (source.endsWith(".tmp")) {
              installCount += 1;
              if (installCount === 2) {
                throw new Error("fixture install failure");
              }
            }
            await rename(source, destination);
          },
        },
      ),
    ).rejects.toThrow("fixture install failure");
    expect(installCount).toBe(2);
    expect(await Bun.file(canonicalPath).text()).toBe(originalCanonical);
    expect(await Bun.file(unresolvedPath).text()).toBe(originalUnresolved);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
