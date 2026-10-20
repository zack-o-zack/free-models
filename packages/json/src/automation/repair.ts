import {
  type CataloguePaths,
  compareStrings,
  type TextFileUpdate,
  writeTextFilesAtomically,
  serializeJson,
  sortJsonObject,
} from "../catalogue/files.ts";
import {
  canonicalMetadataSchema,
  canonicalModelsSchema,
  type DiscoveredOffer,
  providerMappingsSchema,
  type ProviderMappings,
} from "../catalogue/schema.ts";
import { type CatalogueState, computeUnresolved } from "../catalogue/state.ts";
import type { Escalate } from "./escalation.ts";
import type { JevClient } from "./jev.ts";
import { assertSafeDelta } from "./policy.ts";
import {
  createMintLedger,
  type Resolution,
  resolveOffer,
  type ResolveDeps,
  type UniverseModel,
} from "./resolve.ts";

export const MAX_UNRESOLVED = 40;

export type Outcome = Resolution["outcome"];

export interface RepairReportRow {
  readonly provider: string;
  readonly id: string;
  readonly outcome: Outcome;
  readonly canonicalId: string | null;
  readonly confidence: number | null;
  readonly probabilities: Readonly<Record<string, number>> | null;
  readonly source: string;
  readonly reason: string;
  readonly code?: "mint_cap";
}

export interface RepairReport {
  readonly phase: "repair";
  unresolvedCount: number;
  pending: { provider: string; id: string; name: string }[];
  resolutions: RepairReportRow[];
  escalationModels: string[];
  error?: string;
}

export interface RepairOptions {
  readonly before: CatalogueState;
  readonly current: CatalogueState;
  readonly paths: CataloguePaths;
  readonly jev: JevClient;
  readonly escalate: Escalate;
  readonly escalationModels: () => readonly string[];
  readonly universe: readonly UniverseModel[] | null;
  readonly report: RepairReport;
  readonly persistReport: (report: RepairReport) => Promise<void>;
  readonly reconcile: () => Promise<unknown>;
}

export interface RepairSummary {
  readonly counts: Readonly<Record<Outcome, number>>;
  readonly exitCode: 0 | 1;
}

export async function repairCatalogue(options: RepairOptions): Promise<RepairSummary> {
  const { before, current, paths, report } = options;
  assertSafeDelta(before, current);

  const pending = pendingOffers(current);
  report.unresolvedCount = pending.length;
  report.pending = pending.map(({ provider, offer }) => ({
    provider,
    id: offer.model_id,
    name: offer.name,
  }));
  if (pending.length > MAX_UNRESOLVED) {
    throw new Error(
      `${pending.length} unresolved identities exceed the ${MAX_UNRESOLVED} anomaly limit; this suggests mass discovery breakage. Per-offer evidence is in .scratch/catalogue-agent-report.json`,
    );
  }

  const deps: ResolveDeps = {
    jev: options.jev,
    escalate: options.escalate,
    universe: options.universe,
    mints: createMintLedger(),
  };
  let working = current;
  const resolutions: Resolution[] = [];
  for (const target of pending) {
    const resolution = await resolveOffer(working, target, deps);
    resolutions.push(resolution);
    working = foldResolution(working, resolution);
  }

  assertSafeDelta(before, working);
  report.resolutions = resolutions.map(reportRow);
  report.escalationModels = [...options.escalationModels()];
  await options.persistReport(report);

  await writeCatalogue(paths, current, working, resolutions);
  await options.reconcile();

  return { counts: countOutcomes(resolutions), exitCode: exitCodeFor(resolutions) };
}

function pendingOffers(state: CatalogueState): { provider: string; offer: DiscoveredOffer }[] {
  const pending: { provider: string; offer: DiscoveredOffer }[] = [];
  for (const [provider, ids] of Object.entries(computeUnresolved(state).providers)) {
    for (const id of ids) {
      const offer = state.snapshots
        .get(provider)
        ?.offers.find((candidate) => candidate.model_id === id);
      if (!offer) throw new Error(`Missing discovered offer: ${provider}/${id}`);
      pending.push({ provider, offer });
    }
  }
  return pending;
}

function foldResolution(state: CatalogueState, resolution: Resolution): CatalogueState {
  if (resolution.outcome === "deferred") return state;
  const mappings = new Map<string, ProviderMappings>(state.mappings);
  const existing = state.mappings.get(resolution.provider);
  mappings.set(resolution.provider, {
    provider: resolution.provider,
    mappings: { ...existing?.mappings, [resolution.id]: resolution.canonicalId },
  });
  if (resolution.outcome !== "minted") return { ...state, mappings };
  return {
    ...state,
    mappings,
    canonicalModels: { models: [...state.canonicalModels.models, resolution.canonical] },
    metadata: { metadata: [...state.metadata.metadata, resolution.metadata] },
  };
}

async function writeCatalogue(
  paths: CataloguePaths,
  before: CatalogueState,
  after: CatalogueState,
  resolutions: readonly Resolution[],
): Promise<void> {
  const updates: TextFileUpdate[] = [];
  if (after.canonicalModels.models.length !== before.canonicalModels.models.length) {
    updates.push({
      path: paths.canonicalModels,
      contents: serializeJson(
        canonicalModelsSchema.parse({
          models: [...after.canonicalModels.models].sort((a, b) => a.id.localeCompare(b.id)),
        }),
      ),
    });
  }
  if (after.metadata.metadata.length !== before.metadata.metadata.length) {
    updates.push({
      path: paths.canonicalMetadata,
      contents: serializeJson(
        canonicalMetadataSchema.parse({
          metadata: [...after.metadata.metadata]
            .sort((a, b) => compareStrings(a.id, b.id))
            .map((entry) => ({ id: entry.id, metadata: sortJsonObject(entry.metadata) })),
        }),
      ),
    });
  }
  const changedProviders = new Set(
    resolutions.flatMap((resolution) =>
      resolution.outcome === "deferred" ? [] : [resolution.provider],
    ),
  );
  for (const provider of [...changedProviders].sort(compareStrings)) {
    const mapping = after.mappings.get(provider);
    if (!mapping) continue;
    updates.push({
      path: paths.mapping(provider),
      contents: serializeJson(
        providerMappingsSchema.parse({
          ...mapping,
          mappings: Object.fromEntries(
            Object.entries(mapping.mappings).sort(([a], [b]) => a.localeCompare(b)),
          ),
        }),
      ),
    });
  }
  if (updates.length > 0) await writeTextFilesAtomically(updates);
}

function countOutcomes(resolutions: readonly Resolution[]): Record<Outcome, number> {
  const counts: Record<Outcome, number> = { verified: 0, escalated: 0, minted: 0, deferred: 0 };
  for (const resolution of resolutions) counts[resolution.outcome] += 1;
  return counts;
}

function exitCodeFor(resolutions: readonly Resolution[]): 0 | 1 {
  const counts = countOutcomes(resolutions);
  const capRefused = resolutions.some(
    (resolution) => resolution.outcome === "deferred" && resolution.code === "mint_cap",
  );
  const progressed = counts.verified + counts.escalated + counts.minted > 0;
  return capRefused || (!progressed && counts.deferred > 0) ? 1 : 0;
}

function reportRow(resolution: Resolution): RepairReportRow {
  return {
    provider: resolution.provider,
    id: resolution.id,
    outcome: resolution.outcome,
    canonicalId: "canonicalId" in resolution ? resolution.canonicalId : null,
    confidence: "confidence" in resolution ? resolution.confidence : null,
    probabilities:
      "probabilities" in resolution && resolution.probabilities ? resolution.probabilities : null,
    source: resolution.source,
    reason: resolution.reason,
    ...(resolution.outcome === "deferred" && resolution.code ? { code: resolution.code } : {}),
  };
}
