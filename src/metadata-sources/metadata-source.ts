import type { ModelMetadata } from "../catalogue/schema.ts";
import { providerIdSchema } from "../catalogue/schema.ts";

export interface MetadataEntry {
  readonly id: string;
  readonly canonicalSlug: string | null;
  readonly metadata: ModelMetadata;
}

export interface ModelMetadataSource {
  readonly id: string;
  fetchEntries(): Promise<readonly MetadataEntry[]>;
}

export function defineMetadataSourceRegistry(
  ...sourceInstances: readonly ModelMetadataSource[]
): readonly ModelMetadataSource[] {
  const sourceIds = new Set<string>();

  for (const source of sourceInstances) {
    if (!providerIdSchema.safeParse(source.id).success) {
      throw new Error(`Invalid metadata source ID in registry: ${source.id}`);
    }
    if (sourceIds.has(source.id)) {
      throw new Error(`Duplicate metadata source ID in registry: ${source.id}`);
    }
    sourceIds.add(source.id);
  }

  return Object.freeze([...sourceInstances]);
}
