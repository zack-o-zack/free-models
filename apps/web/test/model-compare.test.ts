import { describe, expect, it } from "bun:test";
import {
  compareRows,
  createCompareSearch,
  getBestIndexes,
  parseCompareModelIds,
  parseHighlightBest,
} from "../src/lib/model-compare";
import type { ModelSummary } from "../src/lib/model-types";

describe("parseCompareModelIds", () => {
  it("preserves order", () => {
    expect(parseCompareModelIds("?models=b,a")).toEqual(["b", "a"]);
  });

  it("removes duplicates", () => {
    expect(parseCompareModelIds("?models=a,a,b")).toEqual(["a", "b"]);
  });

  it("limits selection to four models", () => {
    expect(parseCompareModelIds("?models=a,b,c,d,e")).toEqual(["a", "b", "c", "d"]);
  });

  it("ignores empty values", () => {
    expect(parseCompareModelIds("?models=a,,b,")).toEqual(["a", "b"]);
  });
});

describe("parseHighlightBest", () => {
  it("reads true", () => {
    expect(parseHighlightBest("?highlight=true")).toBe(true);
  });

  it("defaults to false", () => {
    expect(parseHighlightBest("")).toBe(false);
  });
});

describe("createCompareSearch", () => {
  it("writes selected models", () => {
    expect(createCompareSearch("", ["a", "b"], false)).toBe("?models=a%2Cb");
  });

  it("preserves unrelated parameters", () => {
    expect(createCompareSearch("?sort=name", ["a"], false)).toBe("?sort=name&models=a");
  });

  it("removes empty model selection", () => {
    expect(createCompareSearch("?models=a", [], false)).toBe("");
  });

  it("writes highlight state", () => {
    expect(createCompareSearch("", ["a"], true)).toBe("?models=a&highlight=true");
  });
});

describe("getBestIndexes", () => {
  const model = (overrides: Partial<ModelSummary>): ModelSummary => ({
    id: "test/model",
    name: "Test model",
    author: "Test",
    description: "",
    contextLength: 0,
    created: null,
    inputModalities: [],
    outputModalities: [],
    providers: [],
    providerNames: {},
    connections: [],
    providerDocs: {},
    supportedParameters: [],
    supportsReasoning: false,
    supportsTools: false,
    isStealth: false,
    intelligenceScore: null,
    codingScore: null,
    agenticScore: null,
    designArena: [],
    ...overrides,
  });

  const getRow = (id: string) => {
    const row = compareRows.find((r) => r.id === id);
    if (!row) throw new Error(`Row ${id} not found`);
    return row;
  };

  const contextRow = getRow("context");
  const intelligenceRow = getRow("intelligence");
  const authorRow = getRow("author");
  const providersRow = getRow("providers");

  it("highest context wins", () => {
    const models = [
      model({ id: "a", contextLength: 32_000 }),
      model({ id: "b", contextLength: 128_000 }),
      model({ id: "c", contextLength: 8_000 }),
    ];
    const best = getBestIndexes(models, contextRow);
    expect(best).toEqual(new Set([1]));
  });

  it("highest benchmark wins", () => {
    const models = [
      model({ id: "a", intelligenceScore: 45.2 }),
      model({ id: "b", intelligenceScore: 68.7 }),
      model({ id: "c", intelligenceScore: 50.1 }),
    ];
    const best = getBestIndexes(models, intelligenceRow);
    expect(best).toEqual(new Set([1]));
  });

  it("ties are both highlighted", () => {
    const models = [
      model({ id: "a", intelligenceScore: 70.0 }),
      model({ id: "b", intelligenceScore: 70.0 }),
      model({ id: "c", intelligenceScore: 50.0 }),
    ];
    const best = getBestIndexes(models, intelligenceRow);
    expect(best).toEqual(new Set([0, 1]));
  });

  it("missing values are ignored", () => {
    const models = [
      model({ id: "a", intelligenceScore: null }),
      model({ id: "b", intelligenceScore: 55.0 }),
      model({ id: "c", intelligenceScore: null }),
    ];
    const best = getBestIndexes(models, intelligenceRow);
    expect(best).toEqual(new Set([1]));
  });

  it("rows without ranking do not highlight", () => {
    const models = [model({ id: "a", author: "Anthropic" }), model({ id: "b", author: "OpenAI" })];
    const best = getBestIndexes(models, authorRow);
    expect(best).toEqual(new Set());
  });

  it("provider count highlights the highest provider count", () => {
    const models = [
      model({ id: "a", providers: ["openrouter"] }),
      model({ id: "b", providers: ["openrouter", "cloudflare", "groq"] }),
      model({ id: "c", providers: ["openrouter", "groq"] }),
    ];
    const best = getBestIndexes(models, providersRow);
    expect(best).toEqual(new Set([1]));
  });
});
