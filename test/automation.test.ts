import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

async function workflow(name: string): Promise<string> {
  return Bun.file(resolve(import.meta.dir, `../.github/workflows/${name}`)).text();
}

function scheduledResolutionGate(source: string): string {
  const prefix = "if bun -e '";
  const start = source.indexOf(prefix);
  const end = source.indexOf("'; then", start + prefix.length);
  if (start < 0 || end < 0) {
    throw new Error("Scheduled workflow has no executable unresolved-offer gate");
  }
  return source.slice(start + prefix.length, end);
}

function runGate(workspace: string, script: string) {
  return Bun.spawnSync({
    cmd: [process.execPath, "-e", script],
    cwd: workspace,
    stdout: "pipe",
    stderr: "pipe",
  });
}

describe("catalogue automation", () => {
  test("scheduled discovery gates metadata refresh and renders afterward", async () => {
    const source = await workflow("catalogue-discovery.yml");
    const discoverIndex = source.indexOf("bun run catalogue:discover");
    const unresolvedGateIndex = source.indexOf("if bun -e");
    const refreshIndex = source.indexOf("bun run catalogue:refresh");
    const renderIndex = source.indexOf("bun run catalogue:render");

    expect(discoverIndex).toBeGreaterThan(-1);
    expect(unresolvedGateIndex).toBeGreaterThan(discoverIndex);
    expect(refreshIndex).toBeGreaterThan(unresolvedGateIndex);
    expect(renderIndex).toBeGreaterThan(refreshIndex);
    expect(source).toContain(
      "catalogue/canonical-models.json catalogue/snapshots catalogue/unresolved.json free-models.json",
    );
    expect(source).toContain(
      "git add -- catalogue/canonical-models.json catalogue/snapshots catalogue/unresolved.json free-models.json",
    );

    const workspace = await mkdtemp(join(tmpdir(), "catalogue-automation-gate-"));
    try {
      await mkdir(join(workspace, "catalogue"));
      const unresolvedPath = join(workspace, "catalogue/unresolved.json");
      const gate = scheduledResolutionGate(source);

      await Bun.write(unresolvedPath, '{"providers":{}}\n');
      expect(runGate(workspace, gate).exitCode).toBe(0);

      await Bun.write(unresolvedPath, '{"providers":{"fixture":["model"]}}\n');
      expect(runGate(workspace, gate).exitCode).toBe(1);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  test("review workflows reconcile and render without live metadata refresh", async () => {
    for (const name of ["pull-request.yml", "merged-catalogue.yml"]) {
      const source = await workflow(name);
      const reconcileIndex = source.indexOf("bun run catalogue:reconcile");
      const unresolvedDiffIndex = source.indexOf("git diff --quiet -- catalogue/unresolved.json");
      const renderIndex = source.indexOf("bun run catalogue:render");
      const publicDiffIndex = source.indexOf("git diff --quiet -- free-models.json");

      expect(reconcileIndex, name).toBeGreaterThan(-1);
      expect(source, name).not.toContain("bun run catalogue:refresh");
      expect(unresolvedDiffIndex, name).toBeGreaterThan(reconcileIndex);
      expect(renderIndex, name).toBeGreaterThan(unresolvedDiffIndex);
      expect(publicDiffIndex, name).toBeGreaterThan(renderIndex);
    }
  });
});
