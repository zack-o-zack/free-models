import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("SSG uses the local catalogue even while the CDN still serves the previous version", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "web-catalogue-"));
  try {
    await Bun.write(
      join(workspace, ".generated/free-models.json"),
      JSON.stringify({
        models: [
          { id: "maker/new", name: "New model", providers: {} },
          { id: "maker/empty", name: "Empty", description: "", providers: {} },
          { id: "maker/blank", name: "Blank", description: "  ", providers: {} },
        ],
      }),
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
          console.log(JSON.stringify({ ids: result.models.map(model => model.id), stars: result.githubStars, descriptions: result.models.map(model => model.description) }));
        `,
      ],
      { cwd: workspace, stdout: "pipe", stderr: "pipe" },
    );
    const output = await new Response(child.stdout).text();
    const errors = await new Response(child.stderr).text();
    expect(await child.exited, errors).toBe(0);
    expect(JSON.parse(output)).toEqual({
      ids: ["maker/new", "maker/empty", "maker/blank"],
      stars: 42,
      descriptions: Array(3).fill("No description available yet."),
    });
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("normalizes speech modalities to audio and embedding to embeddings", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "web-catalogue-"));
  try {
    await Bun.write(
      join(workspace, ".generated/free-models.json"),
      JSON.stringify({
        models: [
          {
            id: "maker/voice",
            name: "Voice Model",
            architecture: {
              input_modalities: ["speech"],
              output_modalities: ["speech", "audio"],
            },
            providers: {},
          },
          {
            id: "maker/embed",
            name: "Embed Model",
            architecture: {
              input_modalities: ["text"],
              output_modalities: ["embedding"],
            },
            providers: {},
          },
          {
            id: "maker/files",
            name: "File Model",
            architecture: {
              input_modalities: ["pdf", "document", "file"],
              output_modalities: ["document", "pdf"],
            },
            providers: {},
          },
        ],
      }),
    );
    const modulePath = new URL("../src/lib/model-data.ts", import.meta.url).pathname;
    const child = Bun.spawn(
      [
        "bun",
        "--eval",
        `
          import { getModels } from ${JSON.stringify(modulePath)};
          globalThis.fetch = async () => Response.json({ stargazers_count: 0 });
          const result = await getModels();
          console.log(JSON.stringify(result.models.map(m => ({ id: m.id, in: m.inputModalities, out: m.outputModalities }))));
        `,
      ],
      { cwd: workspace, stdout: "pipe", stderr: "pipe" },
    );
    const output = await new Response(child.stdout).text();
    const errors = await new Response(child.stderr).text();
    expect(await child.exited, errors).toBe(0);
    expect(JSON.parse(output)).toEqual([
      { id: "maker/voice", in: ["audio"], out: ["audio"] },
      { id: "maker/embed", in: ["text"], out: ["embeddings"] },
      { id: "maker/files", in: ["file"], out: ["file"] },
    ]);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("maps embedding dimensions and the paid list price", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "web-catalogue-"));
  try {
    await Bun.write(
      join(workspace, ".generated/free-models.json"),
      JSON.stringify({
        models: [
          {
            id: "maker/embed",
            name: "Embed Model",
            embedding_dimensions: [1024, 256],
            pricing: { prompt: "0.0000001" },
            providers: {},
          },
          { id: "maker/free", name: "Free Model", pricing: { prompt: "0" }, providers: {} },
          { id: "maker/router", name: "Router", pricing: { prompt: "-1" }, providers: {} },
          { id: "maker/bare", name: "Bare", providers: {} },
        ],
      }),
    );
    const modulePath = new URL("../src/lib/model-data.ts", import.meta.url).pathname;
    const child = Bun.spawn(
      [
        "bun",
        "--eval",
        `
          import { getModels } from ${JSON.stringify(modulePath)};
          globalThis.fetch = async () => Response.json({ stargazers_count: 0 });
          const result = await getModels();
          console.log(JSON.stringify(result.models.map(m => ({ id: m.id, dims: m.embeddingDimensions, price: m.promptPrice }))));
        `,
      ],
      { cwd: workspace, stdout: "pipe", stderr: "pipe" },
    );
    const output = await new Response(child.stdout).text();
    const errors = await new Response(child.stderr).text();
    expect(await child.exited, errors).toBe(0);
    expect(JSON.parse(output)).toEqual([
      { id: "maker/embed", dims: [1024, 256], price: 0.0000001 },
      { id: "maker/free", dims: [], price: 0 },
      { id: "maker/router", dims: [], price: null },
      { id: "maker/bare", dims: [], price: null },
    ]);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("catalogue changes affect the web deployment's workspace dependency graph", async () => {
  const web = await Bun.file(new URL("../package.json", import.meta.url)).json();
  const catalogue = await Bun.file(
    new URL("../../../packages/json/package.json", import.meta.url),
  ).json();

  // The build renders the catalogue through the workspace package, so it must stay a workspace dependency.
  expect(web.dependencies[catalogue.name]).toBe("workspace:*");
});
