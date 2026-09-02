import { type DiscoveredOffer, type ProviderDoc, providerIdSchema } from "../catalogue/schema.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";

export interface ModelProvider {
  readonly id: string;
  readonly name?: string;
  readonly doc: ProviderDoc;
  discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]>;
}

export function defineProviderRegistry(
  ...providerInstances: readonly ModelProvider[]
): readonly ModelProvider[] {
  const providerIds = new Set<string>();

  for (const provider of providerInstances) {
    if (!providerIdSchema.safeParse(provider.id).success) {
      throw new Error(`Invalid provider ID in registry: ${provider.id}`);
    }
    if (providerIds.has(provider.id)) {
      throw new Error(`Duplicate provider ID in registry: ${provider.id}`);
    }
    providerIds.add(provider.id);
  }

  return Object.freeze([...providerInstances]);
}
