import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("SSG uses the local catalogue even while the CDN still serves the previous version", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "web-catalogue-"));
  try {
    await Bun.write(
      join(workspace, ".generated/free-models.json"),
      JSON.stringify({ models: [{ id: "maker/new", name: "New model", providers: {} }] }),
    );
    const modulePath = new URL("../src/lib/model-data.ts", import.meta.url).pathname;
    const child = Bun.spawn(
      [
        "bun",
        "--eval",
        `
          import { getModels } from ${JSON.stringify(modulePath)};
          globalThis.fetch = async (url) => Response.json(
            String(url).includes("api.github.com")
              ? { stargazers_count: 42 }
              : { models: [{ id: "maker/old", name: "Old model", providers: {} }] }
          );
          const result = await getModels();
          console.log(JSON.stringify({ ids: result.models.map(model => model.id), stars: result.githubStars }));
        `,
      ],
      { cwd: workspace, stdout: "pipe", stderr: "pipe" },
    );
    const output = await new Response(child.stdout).text();
    const errors = await new Response(child.stderr).text();
    expect(await child.exited, errors).toBe(0);
    expect(JSON.parse(output)).toEqual({ ids: ["maker/new"], stars: 42 });
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("catalogue changes affect the web deployment's workspace dependency graph", async () => {
  const web = await Bun.file(new URL("../package.json", import.meta.url)).json();
  const catalogue = await Bun.file(
    new URL("../../../packages/json/package.json", import.meta.url),
  ).json();

  // Vercel's affected-project detection cannot infer the CLI's relative file reads.
  expect(web.dependencies[catalogue.name]).toBe("workspace:*");
});
