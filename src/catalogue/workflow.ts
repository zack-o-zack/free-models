import { z } from "zod";
import type { ModelProvider } from "../providers/provider.ts";
import type { CataloguePaths } from "./files.ts";
import {
  compareStrings,
  readValidatedJson,
  serializeJson,
  sortJsonObject,
  writeTextAtomically,
  writeTextFilesAtomically,
} from "./files.ts";
import type { CatalogueRenderer } from "./render.ts";
import {
  catalogueSchema,
  type DiscoveredOffer,
  offerSchema,
  type ProviderSnapshot,
  providerIdSchema,
  unresolvedSchema,
} from "./schema.ts";
import { computeUnresolved, countUnresolved, loadCatalogueState } from "./state.ts";

export async function discover(
  paths: CataloguePaths,
  providers: readonly ModelProvider[],
): Promise<number> {
  const snapshots = await discoverSnapshots(providers);
  const state = await loadCatalogueState(paths, providers, snapshots);
  const unresolved = computeUnresolved(state);

  await writeTextFilesAtomically([
    ...[...snapshots].map(([providerId, snapshot]) => ({
      path: paths.snapshot(providerId),
      contents: serializeJson(snapshot),
    })),
    { path: paths.unresolved, contents: serializeJson(unresolved) },
  ]);

  return countUnresolved(unresolved);
}

export async function reconcile(
  paths: CataloguePaths,
  providers: readonly ModelProvider[],
): Promise<number> {
  const state = await loadCatalogueState(paths, providers);
  const unresolved = computeUnresolved(state);
  await writeTextAtomically(paths.unresolved, serializeJson(unresolved));
  return countUnresolved(unresolved);
}

export async function render(
  paths: CataloguePaths,
  providers: readonly ModelProvider[],
  renderer: CatalogueRenderer,
  outputPath: string = paths.publicCatalogue,
): Promise<void> {
  const state = await loadCatalogueState(paths, providers);
  assertNoUnresolved(computeUnresolved(state));
  await writeTextAtomically(outputPath, renderer.render(state));
}

export async function check(
  paths: CataloguePaths,
  providers: readonly ModelProvider[],
  renderer: CatalogueRenderer,
  inputPath: string = paths.publicCatalogue,
): Promise<void> {
  const state = await loadCatalogueState(paths, providers);
  const expectedUnresolved = computeUnresolved(state);
  const actualUnresolved = await readValidatedJson(
    paths.unresolved,
    unresolvedSchema,
    "Unresolved report",
  );

  if (serializeJson(actualUnresolved) !== serializeJson(expectedUnresolved)) {
    throw new Error("Unresolved report is stale; run the reconcile command");
  }
  assertNoUnresolved(expectedUnresolved);

  const publicFile = Bun.file(inputPath);
  if (!(await publicFile.exists())) {
    throw new Error(`Public catalogue does not exist: ${inputPath}`);
  }
  const actualPublicText = await publicFile.text();
  let actualPublic: unknown;
  try {
    actualPublic = JSON.parse(actualPublicText);
  } catch (error) {
    throw new Error(`Public catalogue is not valid JSON: ${inputPath}`, { cause: error });
  }

  const result = catalogueSchema.safeParse(actualPublic);
  if (!result.success) {
    throw new Error(`Public catalogue does not match schema version 1: ${inputPath}`);
  }

  if (actualPublicText !== renderer.render(state)) {
    throw new Error("Public catalogue is stale; run the render command");
  }
}

async function discoverSnapshots(
  providers: readonly ModelProvider[],
): Promise<ReadonlyMap<string, ProviderSnapshot>> {
  const providerIds = new Set<string>();
  for (const provider of providers) {
    const parsedId = providerIdSchema.safeParse(provider.id);
    if (!parsedId.success) {
      throw new Error(`Invalid provider ID in registry: ${provider.id}`);
    }
    if (providerIds.has(provider.id)) {
      throw new Error(`Duplicate provider ID in registry: ${provider.id}`);
    }
    providerIds.add(provider.id);
  }

  const discovered = await Promise.all(
    providers.map(async (provider) => {
      let discoveredOffers: readonly DiscoveredOffer[];
      try {
        discoveredOffers = await provider.discover();
      } catch (error) {
        throw providerStageError(provider.id, "discovery", error);
      }

      const result = z.array(offerSchema).safeParse(discoveredOffers);
      if (!result.success) {
        throw new Error(`Provider ${provider.id} validation failed: returned invalid offers`);
      }

      let offers: DiscoveredOffer[];
      try {
        offers = normalizeOffers(provider.id, result.data);
      } catch (error) {
        throw providerStageError(provider.id, "validation", error);
      }
      return [provider.id, { provider: provider.id, offers }] as const;
    }),
  );

  return new Map(discovered.sort(([left], [right]) => compareStrings(left, right)));
}

function providerStageError(providerId: string, stage: string, error: unknown): Error {
  const detail = error instanceof Error ? error.message : "unknown failure";
  return new Error(`Provider ${providerId} ${stage} failed: ${detail}`, { cause: error });
}

function normalizeOffers(providerId: string, offers: DiscoveredOffer[]): DiscoveredOffer[] {
  const modelIds = new Set<string>();
  return offers
    .map((offer) => {
      if (modelIds.has(offer.model_id)) {
        throw new Error(`Duplicate provider model ID for ${providerId}: ${offer.model_id}`);
      }
      modelIds.add(offer.model_id);
      return {
        model_id: offer.model_id,
        connection: sortJsonObject(offer.connection),
        metadata: sortJsonObject(offer.metadata),
      };
    })
    .sort((left, right) => compareStrings(left.model_id, right.model_id));
}

function assertNoUnresolved(unresolved: { providers: Record<string, string[]> }): void {
  const unresolvedCount = countUnresolved(unresolved);
  if (unresolvedCount > 0) {
    throw new Error(`Cannot continue while ${unresolvedCount} provider model(s) are unresolved`);
  }
}
