import { describe, expect, test } from "bun:test";
import {
  compareModels,
  defaultSortDirection,
  type SortDirection,
  type SortOption,
} from "../src/lib/model-sort";
import type { ModelSummary } from "../src/lib/model-types";

const models = [
  {
    name: "Unknown",
    contextLength: 0,
    intelligenceScore: null,
    codingScore: null,
    agenticScore: null,
    created: null,
  },
  {
    name: "Beta",
    contextLength: 32000,
    intelligenceScore: 0,
    codingScore: 0,
    agenticScore: 0,
    created: 10,
  },
  {
    name: "Alpha",
    contextLength: 128000,
    intelligenceScore: 90,
    codingScore: 90,
    agenticScore: 90,
    created: 20,
  },
] as ModelSummary[];

describe("Model comparison sorting", () => {
  test.each(["context", "intelligence", "coding", "agentic", "newest", "oldest"] as SortOption[])(
    "%s keeps missing values last in both directions",
    (sort) => {
      for (const direction of ["ascending", "descending"] as SortDirection[]) {
        const result = [...models].sort((a, b) => compareModels(a, b, sort, direction));
        expect(result.map((m) => m.name)).toEqual(
          direction === "ascending" ? ["Beta", "Alpha", "Unknown"] : ["Alpha", "Beta", "Unknown"],
        );
      }
    },
  );
  test("name can be sorted in both directions", () => {
    expect(
      [...models].sort((a, b) => compareModels(a, b, "name", "ascending")).map((m) => m.name),
    ).toEqual(["Alpha", "Beta", "Unknown"]);
    expect(
      [...models].sort((a, b) => compareModels(a, b, "name", "descending")).map((m) => m.name),
    ).toEqual(["Unknown", "Beta", "Alpha"]);
  });
  test("select defaults preserve newest, oldest, and highest score ordering", () => {
    expect(defaultSortDirection("newest")).toBe("descending");
    expect(defaultSortDirection("oldest")).toBe("ascending");
    expect(defaultSortDirection("name")).toBe("ascending");
    expect(defaultSortDirection("intelligence")).toBe("descending");
  });
});
