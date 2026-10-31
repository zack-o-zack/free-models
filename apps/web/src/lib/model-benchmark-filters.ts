import { formatDesignArenaCategory } from "@/lib/model-format";
import type { ModelSummary } from "@/lib/model-types";

export type BenchmarkRange = [number, number];

export type BenchmarkSource =
  | { kind: "artificial-analysis"; field: "intelligenceScore" | "codingScore" | "agenticScore" }
  | { kind: "design-arena"; category: string };

export interface BenchmarkFilterOption {
  value: string;
  label: string;
  min: number;
  max: number;
  count: number;
  source: BenchmarkSource;
}

export interface ActiveBenchmarkFilter {
  option: BenchmarkFilterOption;
  range: BenchmarkRange;
}

type BenchmarkModel = Pick<
  ModelSummary,
  "intelligenceScore" | "codingScore" | "agenticScore" | "designArena"
>;

const designArenaName = "models";
// Categories with fewer rated models rarely narrow a result set, so they stay hidden.
const minDesignArenaCount = 10;

const artificialAnalysisScores = [
  { field: "intelligenceScore", label: "Intelligence index" },
  { field: "codingScore", label: "Coding index" },
  { field: "agenticScore", label: "Agentic index" },
] as const;

function getBenchmarkScore(model: BenchmarkModel, source: BenchmarkSource): number | null {
  if (source.kind === "artificial-analysis") return model[source.field];

  const entry = model.designArena.find(
    (benchmark) => benchmark.arena === designArenaName && benchmark.category === source.category,
  );
  return entry?.elo ?? null;
}

function buildOption(
  models: BenchmarkModel[],
  option: Pick<BenchmarkFilterOption, "value" | "label" | "source">,
): BenchmarkFilterOption | null {
  const scores = models.flatMap((model) => {
    const score = getBenchmarkScore(model, option.source);
    return score === null ? [] : [score];
  });
  if (scores.length === 0) return null;

  const min = Math.floor(Math.min(...scores));
  return {
    ...option,
    count: scores.length,
    min,
    max: Math.max(min + 1, Math.ceil(Math.max(...scores))),
  };
}

export function getBenchmarkFilterOptions(models: BenchmarkModel[]) {
  const artificialAnalysis = artificialAnalysisScores.flatMap(({ field, label }) => {
    const option = buildOption(models, {
      value: `artificial-analysis:${field}`,
      label,
      source: { kind: "artificial-analysis", field },
    });
    return option ? [option] : [];
  });

  const categories = new Set(
    models.flatMap((model) =>
      model.designArena
        .filter((benchmark) => benchmark.arena === designArenaName && benchmark.elo !== null)
        .map((benchmark) => benchmark.category),
    ),
  );
  const designArena = [...categories]
    .flatMap((category) => {
      const option = buildOption(models, {
        value: `design-arena:${category}`,
        label: formatDesignArenaCategory(category),
        source: { kind: "design-arena", category },
      });
      return option && option.count >= minDesignArenaCount ? [option] : [];
    })
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

  return { artificialAnalysis, designArena };
}

export function isBenchmarkNarrowed(option: BenchmarkFilterOption, range: BenchmarkRange): boolean {
  return range[0] > option.min || range[1] < option.max;
}

export function getActiveBenchmarkFilters(
  options: BenchmarkFilterOption[],
  ranges: Partial<Record<string, BenchmarkRange>>,
): ActiveBenchmarkFilter[] {
  return options.flatMap((option) => {
    const range = ranges[option.value];
    return range && isBenchmarkNarrowed(option, range) ? [{ option, range }] : [];
  });
}

export function matchesBenchmarkFilters(
  model: BenchmarkModel,
  filters: ActiveBenchmarkFilter[],
): boolean {
  return filters.every(({ option, range }) => {
    const score = getBenchmarkScore(model, option.source);
    return score !== null && score >= range[0] && score <= range[1];
  });
}
