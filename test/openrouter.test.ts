import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  OPENROUTER_API_BASE_URL,
  OPENROUTER_MODELS_URL,
  OpenRouterProvider,
} from "../src/providers/openrouter.ts";

const fixtureCliPath = resolve(import.meta.dir, "support/openrouter-fixture-cli.ts");
const validFixturePath = resolve(import.meta.dir, "fixtures/openrouter/models.json");
const malformedFixturePath = resolve(import.meta.dir, "fixtures/openrouter/malformed.json");
const decoder = new TextDecoder();

function runFixtureCli(workspace: string, fixturePath: string) {
  return Bun.spawnSync({
    cmd: [process.execPath, fixtureCliPath, "discover", "--workspace", workspace],
    env: { ...process.env, OPENROUTER_FIXTURE_PATH: fixturePath },
    stdout: "pipe",
    stderr: "pipe",
  });
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function createWorkspace(): Promise<string> {
  const workspace = await mkdtemp(join(tmpdir(), "openrouter-catalogue-"));
  await writeJson(join(workspace, "catalogue/canonical-models.json"), { models: [] });
  await writeJson(join(workspace, "catalogue/unresolved.json"), { providers: {} });
  await writeJson(join(workspace, "free-models.json"), { schema_version: 1, models: [] });
  return workspace;
}

async function withWorkspace(run: (workspace: string) => Promise<void>): Promise<void> {
  const workspace = await createWorkspace();
  try {
    await run(workspace);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

describe("OpenRouter discovery", () => {
  test("discovers only concrete :free variants through the catalogue CLI", async () => {
    await withWorkspace(async (workspace) => {
      const discovery = runFixtureCli(workspace, validFixturePath);
      expect(discovery.exitCode).toBe(0);
      expect(decoder.decode(discovery.stderr)).toBe("");

      expect(await Bun.file(join(workspace, "catalogue/snapshots/openrouter.json")).json()).toEqual(
        {
          provider: "openrouter",
          offers: [
            {
              model_id: "alpha/model:free",
              connection: { base_url: OPENROUTER_API_BASE_URL },
              metadata: {
                architecture: {
                  input_modalities: ["text", "image"],
                  output_modalities: ["text"],
                },
                name: "Alpha Model (free)",
                pricing: { completion: "0", prompt: "0" },
                supported_parameters: ["tools", "temperature"],
              },
            },
            {
              model_id: "zeta/model:free",
              connection: { base_url: OPENROUTER_API_BASE_URL },
              metadata: {
                name: "Zeta Model (free)",
                nullable: null,
                pricing: { completion: "0", prompt: "0" },
              },
            },
          ],
        },
      );
      expect(await Bun.file(join(workspace, "catalogue/unresolved.json")).json()).toEqual({
        providers: {
          openrouter: ["alpha/model:free", "zeta/model:free"],
        },
      });
    });
  });

  test("rejects malformed upstream data before replacing approved files", async () => {
    await withWorkspace(async (workspace) => {
      expect(runFixtureCli(workspace, validFixturePath).exitCode).toBe(0);
      const snapshotPath = join(workspace, "catalogue/snapshots/openrouter.json");
      const unresolvedPath = join(workspace, "catalogue/unresolved.json");
      const publicPath = join(workspace, "free-models.json");
      const previousSnapshot = await Bun.file(snapshotPath).text();
      const previousUnresolved = await Bun.file(unresolvedPath).text();
      const previousPublic = await Bun.file(publicPath).text();

      const discovery = runFixtureCli(workspace, malformedFixturePath);
      expect(discovery.exitCode).toBe(1);
      expect(decoder.decode(discovery.stderr)).toContain(
        "OpenRouter models response is malformed: expected a data array",
      );
      expect(await Bun.file(snapshotPath).text()).toBe(previousSnapshot);
      expect(await Bun.file(unresolvedPath).text()).toBe(previousUnresolved);
      expect(await Bun.file(publicPath).text()).toBe(previousPublic);
    });
  });

  test("rejects missing IDs, duplicate IDs, and non-JSON-safe model values", async () => {
    const cases = [
      {
        payload: { data: [{ name: "Missing" }] },
        message: "has no valid id",
      },
      {
        payload: { data: [{ id: "same/model:free" }, { id: "same/model:free" }] },
        message: "contains duplicate model ID: same/model:free",
      },
      {
        raw: '{"data":[{"id":"unsafe/model:free","score":1e400}]}',
        message: "expected a JSON-safe object",
      },
    ];

    for (const testCase of cases) {
      const provider = new OpenRouterProvider({
        fetch: async (url, init) => {
          expect(url).toBe(OPENROUTER_MODELS_URL);
          expect(new Headers(init?.headers).has("authorization")).toBe(false);
          return new Response(testCase.raw ?? JSON.stringify(testCase.payload));
        },
      });
      expect(provider.discover()).rejects.toThrow(testCase.message);
    }
  });

  test("reports HTTP and JSON failures without including response content", async () => {
    const failedRequest = new OpenRouterProvider({
      fetch: async () => new Response("private upstream response", { status: 503 }),
    });
    expect(failedRequest.discover()).rejects.toThrow(
      "OpenRouter models request failed with HTTP status 503",
    );

    const invalidJson = new OpenRouterProvider({
      fetch: async () => new Response("private upstream response"),
    });
    expect(invalidJson.discover()).rejects.toThrow("OpenRouter models response is not valid JSON");
  });
});
