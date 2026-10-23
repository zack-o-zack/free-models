import type { ModelSummary } from "@/lib/model-types";

export const MAX_COMPARE_MODELS = 4;

export type CompareSection = "overview" | "features" | "benchmarks" | "access";

export type CompareValueKind =
  | "text"
  | "number"
  | "boolean"
  | "modalities"
  | "providers"
  | "provider-count"
  | "score"
  | "free-limit";

export interface CompareRow {
  id: string;
  section: CompareSection;
  label: string;
  description?: string;
  kind: CompareValueKind;
  getValue: (model: ModelSummary) => unknown;
  comparableValue?: (model: ModelSummary) => number | null;
  better?: "higher" | "lower";
}

export const DESIGN_ARENA_CATEGORIES = [
  { key: "3d", label: "3D" },
  { key: "asciiart", label: "Asciiart" },
  { key: "codecategories", label: "Code Categories" },
  { key: "dataviz", label: "Data Visualization" },
  { key: "gamedev", label: "Game Development" },
  { key: "svg", label: "SVG" },
  { key: "uicomponent", label: "UI Component" },
  { key: "website", label: "Website" },
] as const;

export function parseCompareModelIds(search: string): string[] {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const value = params.get("models");

  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_COMPARE_MODELS);
}

export function parseHighlightBest(search: string): boolean {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  return params.get("highlight") === "true";
}

export function createCompareSearch(
  currentSearch: string,
  modelIds: string[],
  highlightBest: boolean,
): string {
  const query = currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch;
  const params = new URLSearchParams(query);

  const normalizedIds = Array.from(new Set(modelIds)).filter(Boolean).slice(0, MAX_COMPARE_MODELS);

  if (normalizedIds.length > 0) {
    params.set("models", normalizedIds.join(","));
  } else {
    params.delete("models");
  }

  if (highlightBest) {
    params.set("highlight", "true");
  } else {
    params.delete("highlight");
  }

  const result = params.toString();
  return result.length > 0 ? `?${result}` : "";
}

export function getBestIndexes(models: ModelSummary[], row: CompareRow): Set<number> {
  if (!row.comparableValue || !row.better) {
    return new Set();
  }

  const values = models.map((model) => row.comparableValue?.(model));
  const validValues = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  if (validValues.length === 0) {
    return new Set();
  }

  const target = row.better === "higher" ? Math.max(...validValues) : Math.min(...validValues);

  if (row.kind === "boolean" && target === 0) {
    return new Set();
  }

  return new Set(values.flatMap((value, index) => (value === target ? [index] : [])));
}

export const compareRows: CompareRow[] = [
  {
    id: "author",
    section: "overview",
    label: "Publisher",
    kind: "text",
    getValue: (model) => model.author,
  },
  {
    id: "context",
    section: "overview",
    label: "Context window",
    description: "Maximum context window listed for this model.",
    kind: "number",
    getValue: (model) => model.contextLength,
    comparableValue: (model) => (model.contextLength > 0 ? model.contextLength : null),
    better: "higher",
  },
  {
    id: "input-modalities",
    section: "overview",
    label: "Input modalities",
    kind: "modalities",
    getValue: (model) => model.inputModalities,
  },
  {
    id: "output-modalities",
    section: "overview",
    label: "Output modalities",
    kind: "modalities",
    getValue: (model) => model.outputModalities,
  },
  {
    id: "provider-count",
    section: "overview",
    label: "Providers",
    kind: "provider-count",
    getValue: (model) => model.providers.length,
    comparableValue: (model) => (model.providers.length > 0 ? model.providers.length : null),
    better: "higher",
  },
  {
    id: "feature-tool-use",
    section: "features",
    label: "Tool use",
    description: "Ability to call external tools or functions.",
    kind: "boolean",
    getValue: (model) => model.supportsTools,
    comparableValue: (model) => (model.supportsTools ? 1 : 0),
    better: "higher",
  },
  {
    id: "feature-reasoning",
    section: "features",
    label: "Reasoning",
    description: "Chain-of-thought or reasoning capability.",
    kind: "boolean",
    getValue: (model) => model.supportsReasoning,
    comparableValue: (model) => (model.supportsReasoning ? 1 : 0),
    better: "higher",
  },
  {
    id: "feature-multimodal",
    section: "features",
    label: "Multimodal",
    description: "Accepts or generates vision, audio, or other non-text media.",
    kind: "boolean",
    getValue: (model) =>
      model.inputModalities.some((m) => m.toLowerCase() !== "text") ||
      model.outputModalities.some((m) => m.toLowerCase() !== "text"),
    comparableValue: (model) =>
      model.inputModalities.some((m) => m.toLowerCase() !== "text") ||
      model.outputModalities.some((m) => m.toLowerCase() !== "text")
        ? 1
        : 0,
    better: "higher",
  },
  {
    id: "intelligence",
    section: "benchmarks",
    label: "Intelligence Index",
    kind: "score",
    getValue: (model) => model.intelligenceScore,
    comparableValue: (model) => model.intelligenceScore,
    better: "higher",
  },
  {
    id: "coding",
    section: "benchmarks",
    label: "Coding Index",
    kind: "score",
    getValue: (model) => model.codingScore,
    comparableValue: (model) => model.codingScore,
    better: "higher",
  },
  {
    id: "agentic",
    section: "benchmarks",
    label: "Agentic Index",
    kind: "score",
    getValue: (model) => model.agenticScore,
    comparableValue: (model) => model.agenticScore,
    better: "higher",
  },
  {
    id: "providers",
    section: "access",
    label: "Free providers",
    kind: "providers",
    getValue: (model) => model.providers,
    comparableValue: (model) => (model.providers.length > 0 ? model.providers.length : null),
    better: "higher",
  },
  {
    id: "limits",
    section: "access",
    label: "Listed limits",
    kind: "free-limit",
    getValue: (model) => model.connections.flatMap((connection) => connection.limits),
  },
];
