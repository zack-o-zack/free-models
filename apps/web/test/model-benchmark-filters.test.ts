import { describe, expect, test } from "bun:test";
import {
  getActiveBenchmarkFilters,
  getBenchmarkFilterOptions,
  matchesBenchmarkFilters,
} from "../src/lib/model-benchmark-filters";
import type { DesignArenaBenchmark, ModelSummary } from "../src/lib/model-types";

type BenchmarkModel = Pick<
  ModelSummary,
  "intelligenceScore" | "codingScore" | "agenticScore" | "designArena"
>;

const model = (overrides: Partial<BenchmarkModel>): BenchmarkModel => ({
  intelligenceScore: null,
  codingScore: null,
  agenticScore: null,
  designArena: [],
  ...overrides,
});

const arena = (
  category: string,
  elo: number | null,
  overrides: Partial<DesignArenaBenchmark> = {},
): DesignArenaBenchmark => ({
  arena: "models",
  category,
  elo,
  rank: null,
  winRate: null,
  ...overrides,
});

const intelligenceValue = "artificial-analysis:intelligenceScore";

describe("getBenchmarkFilterOptions", () => {
  test("rounds artificial analysis bounds outward to whole numbers", () => {
    const { artificialAnalysis } = getBenchmarkFilterOptions([
      model({ intelligenceScore: 3.8 }),
      model({ intelligenceScore: 44.8 }),
      model({ intelligenceScore: null }),
    ]);

    expect(artificialAnalysis).toHaveLength(1);
    expect(artificialAnalysis[0]).toMatchObject({
      value: intelligenceValue,
      min: 3,
      max: 45,
      count: 2,
    });
  });

  test("omits artificial analysis scores that no model has", () => {
    const { artificialAnalysis } = getBenchmarkFilterOptions([model({ codingScore: 10 })]);
    expect(artificialAnalysis.map((option) => option.value)).toEqual([
      "artificial-analysis:codingScore",
    ]);
  });

  test("lists design arena categories with at least ten rated models", () => {
    const models = [
      ...Array.from({ length: 10 }, (_, index) =>
        model({ designArena: [arena("website", 1000 + index)] }),
      ),
      model({ designArena: [arena("svg", 1200)] }),
    ];

    const { designArena } = getBenchmarkFilterOptions(models);
    expect(designArena.map((option) => option.label)).toEqual(["Website"]);
    expect(designArena[0]).toMatchObject({ min: 1000, max: 1009, count: 10 });
  });

  test("ignores design arena entries outside the models arena", () => {
    const models = Array.from({ length: 10 }, () =>
      model({ designArena: [arena("website", 1100, { arena: "agents" })] }),
    );
    expect(getBenchmarkFilterOptions(models).designArena).toEqual([]);
  });
});

describe("matchesBenchmarkFilters", () => {
  const models = [
    model({ intelligenceScore: 10 }),
    model({ intelligenceScore: 30 }),
    model({ intelligenceScore: null }),
  ];
  const { artificialAnalysis } = getBenchmarkFilterOptions(models);

  test("a full range keeps every model, including unscored ones", () => {
    const active = getActiveBenchmarkFilters(artificialAnalysis, {
      [intelligenceValue]: [10, 30],
    });
    expect(active).toEqual([]);
    expect(models.filter((entry) => matchesBenchmarkFilters(entry, active))).toHaveLength(3);
  });

  test("a narrowed range keeps only scored models inside it", () => {
    const active = getActiveBenchmarkFilters(artificialAnalysis, {
      [intelligenceValue]: [15, 30],
    });
    expect(models.filter((entry) => matchesBenchmarkFilters(entry, active))).toEqual([models[1]]);
  });

  test("design arena ranges read the elo for the matching category", () => {
    const entries = [
      model({ designArena: [arena("website", 1150)] }),
      model({ designArena: [arena("website", 1300)] }),
      model({ designArena: [arena("svg", 1500)] }),
    ];
    const { designArena } = getBenchmarkFilterOptions([
      ...entries,
      ...Array.from({ length: 9 }, () => model({ designArena: [arena("website", 1200)] })),
    ]);
    const active = getActiveBenchmarkFilters(designArena, {
      "design-arena:website": [1200, 1300],
    });

    expect(entries.filter((entry) => matchesBenchmarkFilters(entry, active))).toEqual([entries[1]]);
  });
});
