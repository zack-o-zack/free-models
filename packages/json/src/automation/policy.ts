import {
  type CanonicalModel,
  canonicalModelIdSchema,
  type DiscoveredOffer,
  type ProviderMappings,
} from "../catalogue/schema.ts";
import type { CatalogueState } from "../catalogue/state.ts";

export function identityId(id: string): string {
  return id
    .replace(/^@cf\//, "")
    .replace(/(?::free|-free)$/, "")
    .toLowerCase();
}

export function identityCandidates(
  state: CatalogueState,
  offer: DiscoveredOffer,
): CanonicalModel[] {
  const id = identityId(offer.model_id);
  const existing = state.canonicalModels.models.filter((model) => model.id === id);
  if (existing.length) return existing;
  // Reuse what other providers already map the same normalized ID to, when they all agree.
  const mapped = new Set<string>();
  for (const mapping of state.mappings.values()) {
    for (const [modelId, target] of Object.entries(mapping.mappings)) {
      if (identityId(modelId) === id) mapped.add(target);
    }
  }
  const [consensus] = mapped;
  const agreed = state.canonicalModels.models.find((model) => model.id === consensus);
  if (mapped.size === 1 && agreed) return [agreed];
  const candidates = new Map<string, CanonicalModel>();
  for (const model of state.canonicalModels.models) {
    if (model.id.split("/").at(-1) === id) candidates.set(model.id, model);
  }
  // Only namespaced upstream IDs can establish a new identity. Short aliases need corroboration.
  for (const snapshot of state.snapshots.values()) {
    for (const evidence of snapshot.offers) {
      const evidenceId = identityId(evidence.model_id);
      if (!canonicalModelIdSchema.safeParse(evidenceId).success || !evidenceId.includes("/"))
        continue;
      if (evidenceId !== id && evidenceId.split("/").at(-1) !== id) continue;
      candidates.set(
        evidenceId,
        state.canonicalModels.models.find((model) => model.id === evidenceId) ?? {
          id: evidenceId,
          name: evidence.name.replace(/\s*\(free\)|\s+free$/gi, "").trim(),
        },
      );
    }
  }
  return [...candidates.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function allowedCataloguePath(path: string): boolean {
  return /^packages\/json\/catalogue\/(canonical-models\.json|canonical-metadata\.json|unresolved\.json|changelog\.json|held-providers\.json|(mappings|snapshots)\/[a-z0-9-]+\.json)$/.test(
    path,
  );
}

export interface RestoredIdentities {
  readonly models: CanonicalModel[];
  readonly mappings: Map<string, ProviderMappings>;
  readonly restored: string[];
}

// Committed identities and mappings only change through reviewed code. Automation may add
// entries, but any edit or removal of a committed one is put back instead of failing the run.
export function restoreCommittedIdentities(
  before: CatalogueState,
  after: Pick<CatalogueState, "canonicalModels" | "mappings">,
): RestoredIdentities {
  const restored: string[] = [];
  const models = new Map(after.canonicalModels.models.map((model) => [model.id, model]));
  for (const model of before.canonicalModels.models) {
    if (models.get(model.id)?.name === model.name) continue;
    models.set(model.id, model);
    restored.push(`identity ${model.id}`);
  }
  const mappings = new Map(
    [...after.mappings].map(([provider, mapping]) => [
      provider,
      { ...mapping, mappings: { ...mapping.mappings } },
    ]),
  );
  for (const [provider, mapping] of before.mappings) {
    const next = mappings.get(provider);
    if (!next) continue;
    for (const [id, target] of Object.entries(mapping.mappings)) {
      if (next.mappings[id] === target) continue;
      next.mappings[id] = target;
      restored.push(`mapping ${provider}/${id}`);
    }
  }
  return {
    models: [...models.values()].sort((a, b) => a.id.localeCompare(b.id)),
    mappings,
    restored,
  };
}

// Provider-level changes that look like a broken scraper rather than a real catalogue change.
export function providerAnomalies(
  before: CatalogueState,
  after: CatalogueState,
): Map<string, string> {
  const anomalies = new Map<string, string>();
  for (const [provider, snapshot] of before.snapshots) {
    const next = after.snapshots.get(provider);
    if (!next || (snapshot.offers.length > 0 && next.offers.length === 0)) {
      anomalies.set(provider, "provider disappeared or emptied");
      continue;
    }
    const ids = new Set(next.offers.map((offer) => offer.model_id));
    const removed = snapshot.offers.filter((offer) => !ids.has(offer.model_id));
    if (removed.length > 0 && removed.length / snapshot.offers.length > 0.2) {
      anomalies.set(provider, `${removed.length} of ${snapshot.offers.length} offers removed`);
      continue;
    }
    const changed = snapshot.offers.find((offer) => {
      const replacement = next.offers.find((candidate) => candidate.model_id === offer.model_id);
      return (
        replacement && JSON.stringify(replacement.connection) !== JSON.stringify(offer.connection)
      );
    });
    if (changed) anomalies.set(provider, `connection changed for ${changed.model_id}`);
  }
  return anomalies;
}

export const HOLD_DAYS = 3;

export interface ProviderHold {
  readonly since: string;
  readonly reason: string;
}

export interface HoldDecision {
  // Providers whose committed snapshot is kept for this run.
  readonly held: Map<string, ProviderHold>;
  // Providers whose anomaly persisted for HOLD_DAYS and is now accepted as real.
  readonly accepted: Map<string, ProviderHold>;
}

// An anomaly is held back until it has been observed for HOLD_DAYS, so a transient outage
// or scraper break never publishes, and a lasting change never needs a human to unblock it.
export function decideHolds(
  anomalies: ReadonlyMap<string, string>,
  previous: Readonly<Record<string, ProviderHold>>,
  today: string,
): HoldDecision {
  const held = new Map<string, ProviderHold>();
  const accepted = new Map<string, ProviderHold>();
  for (const [provider, reason] of anomalies) {
    const since = previous[provider]?.since ?? today;
    const age = (Date.parse(today) - Date.parse(since)) / 86_400_000;
    (age >= HOLD_DAYS ? accepted : held).set(provider, { since, reason });
  }
  return { held, accepted };
}
