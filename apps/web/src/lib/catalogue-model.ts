import type { CatalogueModel, ModelSummary } from "@/lib/model-types";

export function toCatalogueModel(model: ModelSummary): CatalogueModel {
  const { connections, supportedParameters: _supportedParameters, ...summary } = model;
  const offers = new Map<string, CatalogueModel["connections"][number]>();
  for (const { provider, funding } of connections) {
    offers.set(`${provider}:${funding ?? "unknown"}`, { provider, funding });
  }
  return { ...summary, connections: [...offers.values()] };
}
