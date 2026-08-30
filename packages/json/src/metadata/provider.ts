import type { CanonicalModel, DiscoveredOffer, JsonValue } from "../catalogue/schema.ts";

export interface ResolvedCanonicalOffer {
  readonly provider: string;
  readonly offer: DiscoveredOffer;
}

export interface ActiveCanonicalModel {
  readonly model: CanonicalModel;
  readonly offers: readonly ResolvedCanonicalOffer[];
}

export type CanonicalMetadata = Readonly<Record<string, JsonValue>>;

/** Supplies one batch of source-owned fields keyed by reviewed canonical model ID. */
export interface CanonicalMetadataProvider {
  enrich(models: readonly ActiveCanonicalModel[]): Promise<ReadonlyMap<string, CanonicalMetadata>>;
}
