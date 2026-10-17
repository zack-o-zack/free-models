import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

async function workflow(name: string): Promise<string> {
  return Bun.file(resolve(import.meta.dir, `../../../.github/workflows/${name}`)).text();
}

describe("catalogue automation", () => {
  test("autopilot validates before publishing and isolates model credentials", async () => {
    const source = await workflow("catalogue-discovery.yml");
    const steps = [
      "bun run catalogue:discover",
      "run.ts repair",
      "bun run catalogue:refresh",
      "run.ts review",
      "bun run check",
      "git push --force-with-lease",
      "automation/merge.ts",
      "gh workflow run merged-catalogue.yml",
    ];
    let previous = -1;
    for (const step of steps) {
      const index = source.indexOf(step);
      expect(index, step).toBeGreaterThan(previous);
      previous = index;
    }
    expect(source).toContain("steps.validate.outcome == 'success'");
    expect(source).toContain("!inputs.dry_run");
    expect(source).toContain("include-hidden-files: true");
    expect(source).not.toContain("pull_request_target");
    const reviewer = await Bun.file(
      resolve(import.meta.dir, "../src/automation/inference.ts"),
    ).text();
    expect(reviewer).not.toContain("GH_TOKEN");
    expect(reviewer).not.toContain("Bun.spawn");
  });

  test("review workflows reconcile and render without live metadata refresh", async () => {
    for (const name of ["pull-request.yml", "merged-catalogue.yml"]) {
      const source = await workflow(name);
      const reconcileIndex = source.indexOf("bun run catalogue:reconcile");
      const unresolvedDiffIndex = source.indexOf(
        "git diff --quiet -- packages/json/catalogue/unresolved.json",
      );
      const renderIndex = source.indexOf("bun run catalogue:render");
      const inputIndex = source.indexOf("bun run catalogue:check --input");

      expect(reconcileIndex, name).toBeGreaterThan(-1);
      expect(source, name).toContain("quality:\n    name: Repository quality gates");
      expect(source, name).toContain("catalogue:\n    name: Validate catalogue");
      expect(source, name).not.toContain("bun run catalogue:refresh");
      expect(unresolvedDiffIndex, name).toBeGreaterThan(reconcileIndex);
      expect(renderIndex, name).toBeGreaterThan(unresolvedDiffIndex);
      expect(inputIndex, name).toBeGreaterThan(renderIndex);

      if (name === "pull-request.yml") {
        expect(source, name).not.toContain("publish:");
        expect(source, name).not.toContain("needs:");
        expect(source, name).not.toContain("packages/json/free-models.json");
      } else {
        expect(source, name).toContain("publish:\n    name: Publish catalogue to R2");
        expect(source, name).toContain("actions/upload-artifact@v4");
        expect(source, name).toContain("actions/download-artifact@v4");
        expect(source, name).toContain("cloudflare/wrangler-action@v4");
        expect(source, name).toContain(
          "r2 bucket cors set zackozack-cdn --file config/r2-cors.json",
        );
        expect(source, name).toContain("zackozack-cdn/free-models.json");
        expect(source, name).toContain(`--file ${"$"}{{ runner.temp }}/free-models.json`);
        expect(source, name).toContain("CLOUDFLARE_API_TOKEN");
        expect(source, name).toContain("CLOUDFLARE_ACCOUNT_ID");
      }
    }
  });
});
