import type { ModelProvider } from "../providers/provider.ts";
import type { CataloguePaths } from "./files.ts";
import { compareStrings, readValidatedJson } from "./files.ts";
import {
  type CanonicalModels,
  canonicalModelsSchema,
  type ProviderMappings,
  type ProviderSnapshot,
  providerMappingsSchema,
  providerSnapshotSchema,
  type Unresolved,
} from "./schema.ts";

export interface CatalogueState {
  readonly canonicalModels: CanonicalModels;
  readonly mappings: ReadonlyMap<string, ProviderMappings>;
  readonly snapshots: ReadonlyMap<string, ProviderSnapshot>;
}

export async function loadCatalogueState(
  paths: CataloguePaths,
  providers: readonly ModelProvider[],
  snapshotOverrides: ReadonlyMap<string, ProviderSnapshot> = new Map(),
): Promise<CatalogueState> {
  validateProviderRegistry(providers);

  const canonicalModels = await readValidatedJson(
    paths.canonicalModels,
    canonicalModelsSchema,
    "Canonical model registry",
  );
  validateUniqueCanonicalModels(canonicalModels);

  const mappings = new Map<string, ProviderMappings>();
  const snapshots = new Map<string, ProviderSnapshot>();

  for (const provider of [...providers].sort((left, right) => compareStrings(left.id, right.id))) {
    const snapshot =
      snapshotOverrides.get(provider.id) ??
      (await readValidatedJson(
        paths.snapshot(provider.id),
        providerSnapshotSchema,
        `Snapshot for provider ${provider.id}`,
      ));
    validateSnapshot(provider.id, snapshot);
    snapshots.set(provider.id, snapshot);

    const mappingPath = paths.mapping(provider.id);
    const mappingFile = Bun.file(mappingPath);
    const mapping = (await mappingFile.exists())
      ? await readValidatedJson(
          mappingPath,
          providerMappingsSchema,
          `Mappings for provider ${provider.id}`,
        )
      : { provider: provider.id, mappings: {} };
    validateMappings(provider.id, mapping, canonicalModels);
    mappings.set(provider.id, mapping);
  }

  return { canonicalModels, mappings, snapshots };
}

export function computeUnresolved(state: CatalogueState): Unresolved {
  const providers: Record<string, string[]> = {};

  for (const [providerId, snapshot] of [...state.snapshots].sort(([left], [right]) =>
    compareStrings(left, right),
  )) {
    const mappings = state.mappings.get(providerId)?.mappings ?? {};
    const unresolvedModelIds = snapshot.offers
      .map((offer) => offer.model_id)
      .filter((modelId) => mappings[modelId] === undefined)
      .sort(compareStrings);

    if (unresolvedModelIds.length > 0) {
      providers[providerId] = unresolvedModelIds;
    }
  }

  return { providers };
}

export function countUnresolved(unresolved: Unresolved): number {
  return Object.values(unresolved.providers).reduce(
    (total, modelIds) => total + modelIds.length,
    0,
  );
}

function validateProviderRegistry(providers: readonly ModelProvider[]): void {
  const ids = new Set<string>();
  for (const provider of providers) {
    if (ids.has(provider.id)) {
      throw new Error(`Duplicate provider ID in registry: ${provider.id}`);
    }
    ids.add(provider.id);
  }
}

function validateUniqueCanonicalModels(canonicalModels: CanonicalModels): void {
  const ids = new Set<string>();
  for (const model of canonicalModels.models) {
    if (ids.has(model.id)) {
      throw new Error(`Duplicate canonical model ID: ${model.id}`);
    }
    ids.add(model.id);
  }
}

function validateSnapshot(providerId: string, snapshot: ProviderSnapshot): void {
  if (snapshot.provider !== providerId) {
    throw new Error(
      `Snapshot provider mismatch: expected ${providerId}, received ${snapshot.provider}`,
    );
  }

  const modelIds = new Set<string>();
  for (const offer of snapshot.offers) {
    if (modelIds.has(offer.model_id)) {
      throw new Error(`Duplicate provider model ID for ${providerId}: ${offer.model_id}`);
    }
    modelIds.add(offer.model_id);
  }
}

function validateMappings(
  providerId: string,
  mappings: ProviderMappings,
  canonicalModels: CanonicalModels,
): void {
  if (mappings.provider !== providerId) {
    throw new Error(
      `Mapping provider mismatch: expected ${providerId}, received ${mappings.provider}`,
    );
  }

  const canonicalIds = new Set(canonicalModels.models.map((model) => model.id));
  for (const [providerModelId, canonicalModelId] of Object.entries(mappings.mappings)) {
    if (!canonicalIds.has(canonicalModelId)) {
      throw new Error(
        `Mapping ${providerId}/${providerModelId} targets unknown canonical model ${canonicalModelId}`,
      );
    }
  }
}
