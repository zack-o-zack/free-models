import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { ActiveCanonicalModel } from "../src/metadata/provider.ts";
import {
  OPENROUTER_API_BASE_URL,
  OPENROUTER_LIMITS_URL,
  OPENROUTER_MODELS_URL,
  OpenRouterProvider,
  parseOpenRouterLimits,
} from "../src/providers/openrouter.ts";
import { fixtureLimits } from "./support/limits.ts";

const limitsSource =
  "const FREE_MODEL_RATE_LIMIT_RPM=20;const FREE_MODEL_NO_CREDITS_RPD=50;" +
  "const FREE_MODEL_HAS_CREDITS_RPD=1e3;const FREE_MODEL_CREDITS_THRESHOLD=10;";
const openRouterLimits = parseOpenRouterLimits(limitsSource);

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
  await writeJson(join(workspace, "free-models.json"), { schema_version: 4, models: [] });
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
          name: "OpenRouter",
          doc: {
            models: "https://openrouter.ai/models",
            overview: "https://openrouter.ai/docs/quickstart",
            pricing: "https://openrouter.ai/docs/models",
            rate_limit: "https://openrouter.ai/docs/api/reference/limits",
          },
          offers: [
            {
              model_id: "alpha/model:free",
              name: "Alpha Model (free)",
              connection: {
                auth: { env: ["OPENROUTER_API_KEY"] },
                base_url: OPENROUTER_API_BASE_URL,
                protocol: "openai",
              },
              limits: openRouterLimits,
            },
            {
              model_id: "zeta/model:free",
              name: "Zeta Model (free)",
              connection: {
                auth: { env: ["OPENROUTER_API_KEY"] },
                base_url: OPENROUTER_API_BASE_URL,
                protocol: "openai",
              },
              limits: openRouterLimits,
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

    const modelsDev = new Map([["openrouter", { id: "openrouter", env: ["OPENROUTER_API_KEY"] }]]);

    for (const testCase of cases) {
      const provider = new OpenRouterProvider({
        fetch: async (url, init) => {
          expect(new Headers(init?.headers).has("authorization")).toBe(false);
          if (url === OPENROUTER_LIMITS_URL) {
            return new Response(limitsSource);
          }
          expect(url).toBe(OPENROUTER_MODELS_URL);
          return new Response(testCase.raw ?? JSON.stringify(testCase.payload));
        },
      });
      expect(provider.discover(modelsDev)).rejects.toThrow(testCase.message);
    }
  });

  test("reports HTTP and JSON failures without including response content", async () => {
    const modelsDev = new Map([["openrouter", { id: "openrouter", env: ["OPENROUTER_API_KEY"] }]]);
    const failedRequest = new OpenRouterProvider({
      fetch: async (url) =>
        url === OPENROUTER_LIMITS_URL
          ? new Response(limitsSource)
          : new Response("private upstream response", { status: 503 }),
    });
    expect(failedRequest.discover(modelsDev)).rejects.toThrow(
      "OpenRouter models request failed with HTTP status 503",
    );

    const invalidJson = new OpenRouterProvider({
      fetch: async (url) =>
        new Response(url === OPENROUTER_LIMITS_URL ? limitsSource : "private upstream response"),
    });
    expect(invalidJson.discover(modelsDev)).rejects.toThrow(
      "OpenRouter models response is not valid JSON",
    );
  });
});

describe("OpenRouter canonical metadata", () => {
  test("retrieves source fields by resolved OpenRouter offer ID", async () => {
    const provider = new OpenRouterProvider({
      fetch: async (url) => {
        expect(url).toBe(OPENROUTER_MODELS_URL);
        return Response.json({
          data: [
            {
              id: "alpha/model:free",
              name: "Source Alpha",
              description: "Complete source description",
              nested: { preserved: true },
            },
          ],
        });
      },
    });
    const activeModels: ActiveCanonicalModel[] = [
      {
        model: { id: "alpha/model", name: "Reviewed Alpha" },
        offers: [
          {
            provider: "openrouter",
            offer: {
              model_id: "alpha/model:free",
              name: "Alpha Model (free)",
              connection: {
                base_url: OPENROUTER_API_BASE_URL,
                protocol: "openai",
              },
              limits: fixtureLimits,
            },
          },
        ],
      },
    ];

    expect(await provider.enrich(activeModels)).toEqual(
      new Map([
        [
          "alpha/model",
          {
            name: "Source Alpha",
            description: "Complete source description",
            nested: { preserved: true },
          },
        ],
      ]),
    );
  });

  test("retrieves an exact reviewed canonical identity for another offer provider", async () => {
    const provider = new OpenRouterProvider({
      fetch: async (url) => {
        expect(url).toBe(OPENROUTER_MODELS_URL);
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "paid/model",
                name: "OpenRouter source name",
                description: "Source field",
                nested: { exact: true },
              },
              { id: "paid/model:free", description: "must not be suffix-matched" },
            ],
          }),
        );
      },
    });
    const activeModels: ActiveCanonicalModel[] = [
      {
        model: { id: "paid/model", name: "Reviewed name" },
        offers: [
          {
            provider: "another-provider",
            offer: {
              model_id: "unrelated-source-id",
              name: "Unrelated source",
              connection: {
                base_url: "https://example.com/v1",
                protocol: "openai",
              },
              limits: fixtureLimits,
            },
          },
        ],
      },
    ];

    expect(await provider.enrich(activeModels)).toEqual(
      new Map([
        [
          "paid/model",
          {
            name: "OpenRouter source name",
            description: "Source field",
            nested: { exact: true },
          },
        ],
      ]),
    );
  });

  test("enriches and protects source fields through the refresh CLI", async () => {
    await withWorkspace(async (workspace) => {
      expect(runFixtureCli(workspace, validFixturePath).exitCode).toBe(0);
      await writeJson(join(workspace, "catalogue/canonical-models.json"), {
        models: [
          { id: "zeta/model", name: "Reviewed Zeta" },
          { id: "alpha/model", name: "Reviewed Alpha", removed: true },
        ],
      });
      await writeJson(join(workspace, "catalogue/mappings/openrouter.json"), {
        provider: "openrouter",
        mappings: {
          "alpha/model:free": "alpha/model",
          "zeta/model:free": "zeta/model",
        },
      });

      const refresh = Bun.spawnSync({
        cmd: [process.execPath, fixtureCliPath, "refresh", "--workspace", workspace],
        env: { ...process.env, OPENROUTER_FIXTURE_PATH: validFixturePath },
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(refresh.exitCode).toBe(0);
      expect(decoder.decode(refresh.stderr)).toBe("");

      const canonical = await Bun.file(join(workspace, "catalogue/canonical-models.json")).json();
      expect(canonical.models[0]).toEqual({
        id: "alpha/model",
        name: "Reviewed Alpha",
        architecture: {
          input_modalities: ["text", "image"],
          output_modalities: ["text"],
        },
        pricing: { completion: "0", prompt: "0" },
        supported_parameters: ["tools", "temperature"],
      });
      expect(canonical.models[1]).toEqual({
        id: "zeta/model",
        name: "Reviewed Zeta",
        nullable: null,
        pricing: { completion: "0", prompt: "0" },
      });
    });
  });
});
