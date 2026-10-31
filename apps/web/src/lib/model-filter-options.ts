import type { ModelSummary } from "@/lib/model-types";
import {
  countryCodeToFlag,
  getCountryName,
  getModelCountries,
  modelHasZdr,
  type ProviderCompliance,
} from "@/lib/provider-compliance";

export interface RegionFilterOption {
  readonly value: string;
  readonly label: string;
  readonly flag: string;
  readonly count: number;
}

export interface CategoryFilterOption {
  readonly value: string;
  readonly label: string;
  readonly count: number;
}

export function getModelFilterOptions(
  models: (Pick<ModelSummary, "inputModalities" | "outputModalities" | "contextLength"> &
    Partial<Pick<ModelSummary, "modelType" | "topics">> & {
      readonly id?: string;
      readonly connections?: readonly {
        readonly provider: string;
        readonly compliance?: ProviderCompliance;
      }[];
    })[],
) {
  const humanize = (value: string) =>
    value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const options = (values: string[]) =>
    [...new Set(values)].sort().map((value) => ({ value, label: humanize(value) }));

  const regionCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();
  let zdrCount = 0;

  for (const model of models) {
    if (modelHasZdr(model)) {
      zdrCount++;
    }
    const countries = getModelCountries(model);
    for (const country of countries) {
      regionCounts.set(country, (regionCounts.get(country) ?? 0) + 1);
    }
    if (model.modelType) {
      categoryCounts.set(model.modelType, (categoryCounts.get(model.modelType) ?? 0) + 1);
    }
    for (const topic of new Set(model.topics ?? [])) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  const categories: CategoryFilterOption[] = Array.from(categoryCounts.entries())
    .map(([value, count]) => ({
      value,
      label: humanize(value),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const topics: CategoryFilterOption[] = Array.from(topicCounts.entries())
    .map(([value, count]) => ({
      value,
      label: humanize(value),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const regions: RegionFilterOption[] = Array.from(regionCounts.entries())
    .map(([value, count]) => ({
      value,
      label: getCountryName(value),
      flag: countryCodeToFlag(value),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

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
    regions,
    categories,
    topics,
    zdrCount,
  };
}
