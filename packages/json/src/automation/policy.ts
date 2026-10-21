import {
  type CanonicalModel,
  canonicalModelIdSchema,
  type DiscoveredOffer,
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
  return /^packages\/json\/catalogue\/(canonical-models\.json|canonical-metadata\.json|unresolved\.json|changelog\.json|(mappings|snapshots)\/[a-z0-9-]+\.json)$/.test(
    path,
  );
}

export function assertSafeDelta(before: CatalogueState, after: CatalogueState): void {
  for (const model of before.canonicalModels.models) {
    if (
      !after.canonicalModels.models.some(
        (candidate) => candidate.id === model.id && candidate.name === model.name,
      )
    ) {
      throw new Error(`Existing identity changed: ${model.id}`);
    }
  }
  for (const [provider, mapping] of before.mappings) {
    for (const [id, target] of Object.entries(mapping.mappings)) {
      if (after.mappings.get(provider)?.mappings[id] !== target)
        throw new Error(`Existing mapping changed: ${provider}/${id}`);
    }
  }
  for (const [provider, snapshot] of before.snapshots) {
    const next = after.snapshots.get(provider);
    if (!next || (snapshot.offers.length > 0 && next.offers.length === 0))
      throw new Error(`Provider disappeared or emptied: ${provider}`);
    const ids = new Set(next.offers.map((offer) => offer.model_id));
    const removed = snapshot.offers.filter((offer) => !ids.has(offer.model_id));
    if (removed.length > 0 && removed.length / snapshot.offers.length > 0.2)
      throw new Error(`More than 20% of ${provider} offers removed`);
    for (const offer of snapshot.offers) {
      const replacement = next.offers.find((candidate) => candidate.model_id === offer.model_id);
      if (
        replacement &&
        JSON.stringify(replacement.connection) !== JSON.stringify(offer.connection)
      ) {
        throw new Error(`Connection changed: ${provider}/${offer.model_id}`);
      }
    }
  }
}
