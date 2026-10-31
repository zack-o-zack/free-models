import { describe, expect, test } from "bun:test";
import { getModelTypeTabs, modelTypeTab, OTHER_MODEL_TYPE } from "../src/lib/model-type-tabs";

const typed = (modelType: string | null, count: number) =>
  Array.from({ length: count }, () => ({ modelType }));

describe("model type tabs", () => {
  test("gives large types a tab and folds small or missing types into Other", () => {
    const models = [
      ...typed("embedding", 12),
      ...typed("chat", 80),
      ...typed("tool", 3),
      ...typed(null, 5),
    ];
    const tabs = getModelTypeTabs(models);
    expect(tabs).toEqual([
      { value: "chat", label: "Chat" },
      { value: "embedding", label: "Embedding" },
      { value: OTHER_MODEL_TYPE, label: "Other" },
    ]);
    expect(modelTypeTab({ modelType: "chat" }, tabs)).toBe("chat");
    expect(modelTypeTab({ modelType: "tool" }, tabs)).toBe(OTHER_MODEL_TYPE);
    expect(modelTypeTab({ modelType: null }, tabs)).toBe(OTHER_MODEL_TYPE);
  });

  test("keeps every type on a small collection page", () => {
    expect(getModelTypeTabs([...typed("chat", 5), ...typed("reranking", 2)])).toEqual([
      { value: "chat", label: "Chat" },
      { value: "reranking", label: "Reranking" },
    ]);
  });

  test("returns no tabs for an empty list", () => {
    expect(getModelTypeTabs([])).toEqual([]);
  });
});
