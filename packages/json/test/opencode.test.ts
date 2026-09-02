import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { openCodePublishedLimits } from "../src/providers/limits.ts";

const openCodeLimits = openCodePublishedLimits();

const fixtureCliPath = resolve(import.meta.dir, "support/opencode-fixture-cli.ts");
const validDocumentationPath = resolve(import.meta.dir, "fixtures/opencode/zen.html");
const validModelsPath = resolve(import.meta.dir, "fixtures/opencode/models.json");
const decoder = new TextDecoder();

interface FixtureFiles {
  readonly documentation: string;
  readonly models: string;
}

function runFixtureCli(workspace: string, fixtures: FixtureFiles) {
  return Bun.spawnSync({
    cmd: [process.execPath, fixtureCliPath, "discover", "--workspace", workspace],
    env: {
      ...process.env,
      OPENCODE_DOCUMENTATION_FIXTURE_PATH: fixtures.documentation,
      OPENCODE_MODELS_FIXTURE_PATH: fixtures.models,
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
  const workspace = await mkdtemp(join(tmpdir(), "opencode-catalogue-"));
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

async function customFixtures(
  workspace: string,
  documentation: string,
  models: string,
): Promise<FixtureFiles> {
  const documentationPath = join(workspace, "provider-fixtures/zen.html");
  const modelsPath = join(workspace, "provider-fixtures/models.json");
  await mkdir(resolve(documentationPath, ".."), { recursive: true });
  await Bun.write(documentationPath, documentation);
  await Bun.write(modelsPath, models);
  return { documentation: documentationPath, models: modelsPath };
}

async function validFixtureText(): Promise<{ documentation: string; models: string }> {
  return {
    documentation: await Bun.file(validDocumentationPath).text(),
    models: await Bun.file(validModelsPath).text(),
  };
}

describe("OpenCode Zen discovery", () => {
  test("discovers connection fields from pricing, endpoint, and live-model fixtures", async () => {
    await withWorkspace(async (workspace) => {
      const discovery = runFixtureCli(workspace, {
        documentation: validDocumentationPath,
        models: validModelsPath,
      });
      expect(discovery.exitCode).toBe(0);
      expect(decoder.decode(discovery.stderr)).toBe("");

      expect(await Bun.file(join(workspace, "catalogue/snapshots/opencode.json")).json()).toEqual({
        provider: "opencode",
        doc: {
          models: "https://opencode.ai/docs/zen/#models",
          overview: "https://opencode.ai/docs/zen/",
          pricing: "https://opencode.ai/docs/zen/#pricing",
          rate_limit: "https://opencode.ai/docs/zen/",
        },
        offers: [
          {
            model_id: "big-pickle",
            connection: {
              ai_sdk_package: "@ai-sdk/openai-compatible",
              endpoint: "https://opencode.example.test/zen/v1/chat/completions",
            },
            limits: openCodeLimits,
          },
          {
            model_id: "suffix-free",
            connection: {
              ai_sdk_package: "@ai-sdk/openai",
              endpoint: "https://opencode.example.test/zen/v1/responses",
            },
            limits: openCodeLimits,
          },
        ],
      });
      expect(await Bun.file(join(workspace, "catalogue/unresolved.json")).json()).toEqual({
        providers: { opencode: ["big-pickle", "suffix-free"] },
      });
    });
  });

  test("rejects missing columns, malformed tables, and empty required cells", async () => {
    await withWorkspace(async (workspace) => {
      const valid = await validFixtureText();
      const cases = [
        {
          documentation: valid.documentation.replace("AI SDK Package", "SDK Package"),
          message: "exactly one endpoint table with columns",
        },
        {
          documentation: "<html><body><p>No tables</p></body></html>",
          message: "exactly one endpoint table with columns",
        },
        {
          documentation: valid.documentation.replace(
            "<td>paid-model</td>",
            "<td>paid-model</td><td>Unexpected</td>",
          ),
          message: "endpoint table row 3 must contain exactly 4 cells",
        },
        {
          documentation: valid.documentation.replace("<td>paid-model</td>", "<td></td>"),
          message: "endpoint row 3 contains an empty cell",
        },
      ];

      for (const [index, testCase] of cases.entries()) {
        const fixtures = await customFixtures(workspace, testCase.documentation, valid.models);
        const discovery = runFixtureCli(workspace, fixtures);
        expect(decoder.decode(discovery.stderr), `case ${index}`).toContain(testCase.message);
        expect(discovery.exitCode).toBe(1);
      }
    });
  });

  test("rejects duplicate documentation identities", async () => {
    await withWorkspace(async (workspace) => {
      const valid = await validFixtureText();
      const duplicateEndpointName = endpointRow(
        "Big Pickle",
        "another-id",
        "https://duplicate.example.test",
        "@ai-sdk/openai",
      );
      const duplicateEndpointId = endpointRow(
        "Another Name",
        "big-pickle",
        "https://duplicate.example.test",
        "@ai-sdk/openai",
      );
      const duplicatePrice = pricingRow("Big Pickle", "Free", "Free", "Free", "-");
      const cases = [
        {
          documentation: appendToFirstTable(valid.documentation, duplicateEndpointName),
          message: "endpoint table contains duplicate model name: Big Pickle",
        },
        {
          documentation: appendToFirstTable(valid.documentation, duplicateEndpointId),
          message: "endpoint table contains duplicate model ID: big-pickle",
        },
        {
          documentation: appendToLastTable(valid.documentation, duplicatePrice),
          message: "pricing table contains duplicate model name: Big Pickle",
        },
      ];

      for (const testCase of cases) {
        const fixtures = await customFixtures(workspace, testCase.documentation, valid.models);
        const discovery = runFixtureCli(workspace, fixtures);
        expect(discovery.exitCode).toBe(1);
        expect(decoder.decode(discovery.stderr)).toContain(testCase.message);
      }
    });
  });

  test("rejects unmatched free rows and billable cache values", async () => {
    await withWorkspace(async (workspace) => {
      const valid = await validFixtureText();
      const cases = [
        {
          documentation: appendToLastTable(
            valid.documentation,
            pricingRow("Undocumented Free", "Free", "Free", "Free", "-"),
          ),
          message: "free pricing row has no endpoint row: Undocumented Free",
        },
        {
          documentation: appendToLastTable(
            valid.documentation,
            pricingRow("Billable Cache Free", "Free", "Free", "$0.50", "-"),
          ),
          message: "free pricing row has a billable cache value: Billable Cache Free",
        },
      ];

      for (const testCase of cases) {
        const fixtures = await customFixtures(workspace, testCase.documentation, valid.models);
        const discovery = runFixtureCli(workspace, fixtures);
        expect(discovery.exitCode).toBe(1);
        expect(decoder.decode(discovery.stderr)).toContain(testCase.message);
      }
    });
  });

  test("rejects malformed, duplicate, and incomplete live model data", async () => {
    await withWorkspace(async (workspace) => {
      const valid = await validFixtureText();
      const parsedModels = JSON.parse(valid.models) as { data: unknown[]; object: string };
      const cases = [
        {
          models: JSON.stringify({ object: "collection", data: [] }),
          message: 'expected object to equal "list"',
        },
        {
          models: JSON.stringify({ object: "list", models: [] }),
          message: "expected a data array",
        },
        {
          models: JSON.stringify({ object: "list", data: [{ object: "model" }] }),
          message: "has no valid id",
        },
        {
          models: JSON.stringify({
            ...parsedModels,
            data: [...parsedModels.data, parsedModels.data[0]],
          }),
          message: "contains duplicate model ID: paid-model",
        },
        {
          models: '{"object":"list","data":[{"id":"unsafe","created":1e400}]}',
          message: "expected a JSON-safe object",
        },
        {
          models: JSON.stringify({
            ...parsedModels,
            data: parsedModels.data.filter(
              (model) =>
                typeof model !== "object" ||
                model === null ||
                !("id" in model) ||
                model.id !== "big-pickle",
            ),
          }),
          message: "free model is missing from the live catalogue: big-pickle",
        },
      ];

      for (const testCase of cases) {
        const fixtures = await customFixtures(workspace, valid.documentation, testCase.models);
        const discovery = runFixtureCli(workspace, fixtures);
        expect(discovery.exitCode).toBe(1);
        expect(decoder.decode(discovery.stderr)).toContain(testCase.message);
      }
    });
  });

  test("a provider failure leaves the previous snapshot and reports unchanged", async () => {
    await withWorkspace(async (workspace) => {
      const validFixtures = {
        documentation: validDocumentationPath,
        models: validModelsPath,
      };
      expect(runFixtureCli(workspace, validFixtures).exitCode).toBe(0);
      const snapshotPath = join(workspace, "catalogue/snapshots/opencode.json");
      const unresolvedPath = join(workspace, "catalogue/unresolved.json");
      const publicPath = join(workspace, "free-models.json");
      const previousSnapshot = await Bun.file(snapshotPath).text();
      const previousUnresolved = await Bun.file(unresolvedPath).text();
      const previousPublic = await Bun.file(publicPath).text();
      const fixtures = await customFixtures(workspace, "<html></html>", "not-json");

      expect(runFixtureCli(workspace, fixtures).exitCode).toBe(1);
      expect(await Bun.file(snapshotPath).text()).toBe(previousSnapshot);
      expect(await Bun.file(unresolvedPath).text()).toBe(previousUnresolved);
      expect(await Bun.file(publicPath).text()).toBe(previousPublic);
    });
  });

  test("response-generation timestamps do not create semantic changes", async () => {
    await withWorkspace(async (workspace) => {
      const valid = await validFixtureText();
      const fixtures = await customFixtures(workspace, valid.documentation, valid.models);
      expect(runFixtureCli(workspace, fixtures).exitCode).toBe(0);

      const snapshotPath = join(workspace, "catalogue/snapshots/opencode.json");
      const firstSnapshot = await Bun.file(snapshotPath).text();
      const changedTimestamp = valid.models.replaceAll(/"created": \d+/g, '"created": 999999');
      await Bun.write(fixtures.models, changedTimestamp);

      expect(runFixtureCli(workspace, fixtures).exitCode).toBe(0);
      expect(await Bun.file(snapshotPath).text()).toBe(firstSnapshot);
    });
  });
});

function endpointRow(name: string, id: string, endpoint: string, sdk: string): string {
  return `<tr><td>${name}</td><td>${id}</td><td>${endpoint}</td><td>${sdk}</td></tr>`;
}

function pricingRow(
  name: string,
  input: string,
  output: string,
  cachedRead: string,
  cachedWrite: string,
): string {
  return `<tr><td>${name}</td><td>${input}</td><td>${output}</td><td>${cachedRead}</td><td>${cachedWrite}</td></tr>`;
}

function appendToFirstTable(html: string, row: string): string {
  return html.replace("</tbody>", `${row}</tbody>`);
}

function appendToLastTable(html: string, row: string): string {
  const index = html.lastIndexOf("</tbody>");
  if (index < 0) {
    throw new Error("Fixture has no table body");
  }
  return `${html.slice(0, index)}${row}${html.slice(index)}`;
}
