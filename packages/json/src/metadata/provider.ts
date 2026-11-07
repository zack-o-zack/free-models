import type { CanonicalModel, DiscoveredOffer, JsonValue } from "../catalogue/schema.ts";

export interface ResolvedCanonicalOffer {
  readonly provider: string;
  readonly offer: DiscoveredOffer;
}

export interface ActiveCanonicalModel {
  readonly model: CanonicalModel;
  readonly offers: readonly ResolvedCanonicalOffer[];
  readonly previousMetadata?: CanonicalMetadata;
}

export type CanonicalMetadata = Readonly<Record<string, JsonValue>>;

/** Supplies one batch of source-owned fields keyed by reviewed canonical model ID. */
export interface CanonicalMetadataProvider {
  enrich(models: readonly ActiveCanonicalModel[]): Promise<ReadonlyMap<string, CanonicalMetadata>>;
}

export function withMetadataFallback(
  primary: CanonicalMetadataProvider,
  fallback: CanonicalMetadataProvider,
): CanonicalMetadataProvider {
  return {
    async enrich(models) {
      const preferred = await primary.enrich(models);
      const missing = models.filter(({ model }) => !preferred.has(model.id));
      if (!missing.length) return preferred;
      try {
        const additional = await fallback.enrich(missing);
        const previous = new Map(
          missing.map(({ model, previousMetadata }) => [model.id, previousMetadata]),
        );
        return new Map([
          ...[...additional].map(
            ([id, fields]) => [id, { ...previous.get(id), ...fields }] as const,
          ),
          ...preferred,
        ]);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "unknown failure";
        console.warn(`Fallback metadata refresh failed; retaining primary results: ${detail}`);
        return preferred;
      }
    },
  };
}
