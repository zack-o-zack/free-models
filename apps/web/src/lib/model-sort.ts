import type { ModelSummary } from "./model-types";

export type SortOption =
  | "newest"
  | "oldest"
  | "context"
  | "name"
  | "intelligence"
  | "coding"
  | "agentic";
export type SortDirection = "ascending" | "descending";

export const defaultModelSort: SortOption = "newest";
export const defaultModelDirection: SortDirection = "descending";

export function defaultSortDirection(sort: SortOption): SortDirection {
  return sort === "name" || sort === "oldest" ? "ascending" : "descending";
}

type SortableModel = Pick<
  ModelSummary,
  "name" | "contextLength" | "intelligenceScore" | "codingScore" | "agenticScore" | "created"
>;

export function compareModels(
  left: SortableModel,
  right: SortableModel,
  sort: SortOption,
  direction: SortDirection,
): number {
  const sign = direction === "ascending" ? 1 : -1;
  if (sort === "name") return sign * left.name.localeCompare(right.name);

  const value = (model: SortableModel): number | null => {
    switch (sort) {
      case "context":
        return model.contextLength > 0 ? model.contextLength : null;
      case "intelligence":
        return model.intelligenceScore;
      case "coding":
        return model.codingScore;
      case "agentic":
        return model.agenticScore;
      default:
        return model.created;
    }
  };
  const a = value(left);
  const b = value(right);
  // Unreported values stay last in either direction; zero is a valid score.
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return sign * (a - b);
}

export function sortCatalogue<T extends SortableModel>(models: T[]): T[] {
  return [...models].sort((left, right) =>
    compareModels(left, right, defaultModelSort, defaultModelDirection),
  );
}
