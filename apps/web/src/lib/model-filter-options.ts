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

export function getModelFilterOptions(
  models: (Pick<ModelSummary, "inputModalities" | "outputModalities" | "contextLength"> & {
    readonly id?: string;
    readonly connections?: readonly {
      readonly provider: string;
      readonly compliance?: ProviderCompliance;
    }[];
  })[],
) {
  const options = (values: string[]) =>
    [...new Set(values)].sort().map((value) => ({
      value,
      label: value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    }));

  const regionCounts = new Map<string, number>();
  let zdrCount = 0;

  for (const model of models) {
    if (modelHasZdr(model)) {
      zdrCount++;
    }
    const countries = getModelCountries(model);
    for (const country of countries) {
      regionCounts.set(country, (regionCounts.get(country) ?? 0) + 1);
    }
  }

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
    zdrCount,
  };
}
