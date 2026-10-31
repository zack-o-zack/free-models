import type { ModelSummary } from "@/lib/model-types";

/** Tab for models without a type and for types too small to earn their own tab. */
export const OTHER_MODEL_TYPE = "other";

export interface ModelTypeTab {
  readonly value: string;
  readonly label: string;
}

type TypedModel = Pick<ModelSummary, "modelType">;

const labels: Record<string, string> = {
  chat: "Chat",
  embedding: "Embedding",
  image: "Image",
  speech: "Speech",
  realtime: "Realtime",
  video: "Video",
  reranking: "Reranking",
  transcription: "Transcription",
  moderation: "Moderation",
  decision: "Decision",
  [OTHER_MODEL_TYPE]: "Other",
};

function label(value: string): string {
  return (
    labels[value] ?? value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

/**
 * Builds the model type tabs, largest first, with "Other" last. A type gets its own tab when it
 * holds at least 10 models, or a tenth of a smaller list, so collection pages keep their types.
 */
export function getModelTypeTabs(models: readonly TypedModel[]): ModelTypeTab[] {
  const counts = new Map<string, number>();
  for (const { modelType } of models) {
    const value = modelType ?? OTHER_MODEL_TYPE;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const minimum = Math.min(10, Math.max(1, Math.ceil(models.length / 10)));
  const tabs = [...counts]
    .filter(([value, count]) => value !== OTHER_MODEL_TYPE && count >= minimum)
    .sort(
      ([leftValue, left], [rightValue, right]) =>
        right - left || leftValue.localeCompare(rightValue),
    )
    .map(([value]) => ({ value, label: label(value) }));
  const tabValues = new Set(tabs.map(({ value }) => value));
  if (models.some((model) => !model.modelType || !tabValues.has(model.modelType))) {
    tabs.push({ value: OTHER_MODEL_TYPE, label: label(OTHER_MODEL_TYPE) });
  }
  return tabs;
}

/** Returns the tab value a model belongs to, given the tabs from `getModelTypeTabs`. */
export function modelTypeTab(model: TypedModel, tabs: readonly ModelTypeTab[]): string {
  return model.modelType && tabs.some(({ value }) => value === model.modelType)
    ? model.modelType
    : OTHER_MODEL_TYPE;
}
