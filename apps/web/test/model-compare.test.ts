import { describe, expect, it } from "bun:test";
import {
  compareHref,
  compareRows,
  createCompareSearch,
  getBestIndexes,
  parseCompareModelIds,
  parseComparePathname,
  parseCompareRouteSegments,
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

describe("compareRows and sections", () => {
  it("includes all key comparison sections matching OpenRouter features", () => {
    const sections = new Set(compareRows.map((r) => r.section));
    expect(sections).toEqual(new Set(["overview", "features", "benchmarks", "access"]));
  });

  it("includes feature capability rows", () => {
    const featureRowIds = compareRows.filter((r) => r.section === "features").map((r) => r.id);
    expect(featureRowIds).toContain("feature-tool-use");
    expect(featureRowIds).toContain("feature-reasoning");
    expect(featureRowIds).toContain("feature-multimodal");
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
    modelType: null,
    topics: [],
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

  it("highlights models with feature support for boolean rows", () => {
    const multimodalRow = getRow("feature-multimodal");
    const models = [
      model({ id: "a", inputModalities: ["text", "image"] }),
      model({ id: "b", inputModalities: ["text"] }),
      model({ id: "c", inputModalities: ["text", "audio"] }),
    ];
    const best = getBestIndexes(models, multimodalRow);
    expect(best).toEqual(new Set([0, 2]));
  });

  it("does not highlight when no models have the feature", () => {
    const toolUseRow = getRow("feature-tool-use");
    const models = [
      model({ id: "a", supportsTools: false }),
      model({ id: "b", supportsTools: false }),
    ];
    const best = getBestIndexes(models, toolUseRow);
    expect(best).toEqual(new Set());
  });
});

describe("compareHref", () => {
  it("formats single model using slugged path", () => {
    expect(compareHref(["google/gemini-3.6-flash"])).toBe("/compare/google/gemini-3.6-flash");
  });

  it("formats multiple models using concatenated slugged paths", () => {
    expect(
      compareHref([
        "google/gemini-3.8-flash",
        "z-ai/glm-5.3",
        "google/gemini-3.7-flash",
        "z-ai/glm-5.3-flash",
      ]),
    ).toBe(
      "/compare/google/gemini-3.8-flash/z-ai/glm-5.3/google/gemini-3.7-flash/z-ai/glm-5.3-flash",
    );
  });

  it("handles stealth models", () => {
    expect(compareHref(["stealth:big-pickle", "google/gemini-3.6-flash"])).toBe(
      "/compare/stealth/big-pickle/google/gemini-3.6-flash",
    );
  });

  it("appends highlight query parameter when true", () => {
    expect(compareHref(["google/gemini-3.6-flash"], true)).toBe(
      "/compare/google/gemini-3.6-flash?highlight=true",
    );
  });

  it("returns base /compare when empty", () => {
    expect(compareHref([])).toBe("/compare");
  });

  it("deduplicates models and limits to 4", () => {
    expect(
      compareHref([
        "google/gemini-3.8-flash",
        "google/gemini-3.8-flash",
        "z-ai/glm-5.3",
        "google/gemini-3.7-flash",
        "z-ai/glm-5.3-flash",
        "openai/gpt-4o",
      ]),
    ).toBe(
      "/compare/google/gemini-3.8-flash/z-ai/glm-5.3/google/gemini-3.7-flash/z-ai/glm-5.3-flash",
    );
  });
});

describe("parseCompareRouteSegments", () => {
  it("parses pairs into model ids", () => {
    expect(
      parseCompareRouteSegments([
        "google",
        "gemini-3.8-flash",
        "z-ai",
        "glm-5.3",
        "google",
        "gemini-3.7-flash",
        "z-ai",
        "glm-5.3-flash",
      ]),
    ).toEqual([
      "google/gemini-3.8-flash",
      "z-ai/glm-5.3",
      "google/gemini-3.7-flash",
      "z-ai/glm-5.3-flash",
    ]);
  });

  it("handles stealth model segments", () => {
    expect(
      parseCompareRouteSegments(["stealth", "big-pickle", "google", "gemini-3.6-flash"]),
    ).toEqual(["stealth:big-pickle", "google/gemini-3.6-flash"]);
  });

  it("ignores odd leftover segments", () => {
    expect(parseCompareRouteSegments(["google", "gemini-3.8-flash", "orphan"])).toEqual([
      "google/gemini-3.8-flash",
    ]);
  });

  it("limits to 4 models", () => {
    expect(
      parseCompareRouteSegments(["m1", "a", "m2", "b", "m3", "c", "m4", "d", "m5", "e"]),
    ).toEqual(["m1/a", "m2/b", "m3/c", "m4/d"]);
  });
});

describe("parseComparePathname", () => {
  it("parses model ids from pathname", () => {
    expect(parseComparePathname("/compare/google/gemini-3.8-flash/z-ai/glm-5.3")).toEqual([
      "google/gemini-3.8-flash",
      "z-ai/glm-5.3",
    ]);
  });

  it("returns empty for /compare", () => {
    expect(parseComparePathname("/compare")).toEqual([]);
    expect(parseComparePathname("/compare/")).toEqual([]);
  });
});
