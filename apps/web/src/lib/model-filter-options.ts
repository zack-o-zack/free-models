import type { ModelSummary } from "@/lib/model-types";

export function getModelFilterOptions(
  models: Pick<ModelSummary, "inputModalities" | "outputModalities" | "contextLength">[],
) {
  const options = (values: string[]) =>
    [...new Set(values)].sort().map((value) => ({
      value,
      label: value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    }));

  return {
    inputs: options(models.flatMap((model) => model.inputModalities)),
    outputs: options(models.flatMap((model) => model.outputModalities)),
    contextSteps: [
      ...new Set([
        0,
        ...models
          .map((model) => model.contextLength)
          .filter((value) => Number.isFinite(value) && value > 0),
      ]),
    ].sort((a, b) => a - b),
  };
}
