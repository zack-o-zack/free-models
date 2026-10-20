import { compareStrings } from "../catalogue/files.ts";
import type { CanonicalModel, JsonValue } from "../catalogue/schema.ts";
import { type CatalogueState, metadataById } from "../catalogue/state.ts";
import { identityId } from "./policy.ts";

export const DESCRIPTION_LIMIT = 400;

// identityId strips one suffix, so a `-free:free` alias needs a second pass to reach its base identity.
export function normalizeIdentity(id: string): string {
  return identityId(identityId(id));
}

export interface UniverseModel {
  readonly id: string;
  readonly name?: string;
  readonly canonical_slug?: string;
  readonly hugging_face_id?: string;
  readonly context_length?: number;
}

export interface Candidate {
  readonly id: string;
  readonly name: string;
  readonly inCanonical: boolean;
  readonly metadata: Readonly<Record<string, JsonValue>> | null;
  readonly criteria: string;
}

export interface CommittedAlias {
  readonly provider: string;
  readonly alias: string;
  readonly canonicalId: string;
}

export function prefilter(
  identity: string,
  universe: readonly UniverseModel[],
): Map<string, UniverseModel> {
  const bare = bareName(identity);
  const index = new Map<string, UniverseModel>();
  for (const model of universe) {
    const normalized = normalizeIdentity(model.id);
    const candidateBare = bareName(normalized);
    const related =
      normalized === identity || candidateBare === bare || candidateBare.startsWith(`${bare}-`);
    if (related && !index.has(normalized)) index.set(normalized, model);
  }
  return index;
}

export function committedConsensus(
  state: CatalogueState,
  identity: string,
  canonicalIds: ReadonlyMap<string, CanonicalModel>,
): string | undefined {
  const targets = new Set<string>();
  for (const mapping of state.mappings.values()) {
    for (const [alias, target] of Object.entries(mapping.mappings)) {
      if (normalizeIdentity(alias) === identity) targets.add(target);
    }
  }
  const [only] = [...targets];
  return targets.size === 1 && only && canonicalIds.has(only) ? only : undefined;
}

export function committedAliases(
  state: CatalogueState,
  identity: string,
  candidateIds: ReadonlySet<string>,
): CommittedAlias[] {
  const namespace = namespaceOf(identity);
  const rows: CommittedAlias[] = [];
  for (const [provider, mapping] of state.mappings) {
    for (const [alias, target] of Object.entries(mapping.mappings)) {
      const sameNamespace =
        namespace !== undefined && namespaceOf(normalizeIdentity(alias)) === namespace;
      if (sameNamespace || candidateIds.has(target)) {
        rows.push({ provider, alias, canonicalId: target });
      }
    }
  }
  return rows.sort(
    (left, right) =>
      compareStrings(left.provider, right.provider) || compareStrings(left.alias, right.alias),
  );
}

export function buildCandidate(
  id: string,
  state: CatalogueState,
  universe: ReadonlyMap<string, UniverseModel>,
): Candidate {
  const canonical = state.canonicalModels.models.find((model) => model.id === id);
  const upstream = universe.get(id);
  const metadata = metadataById(state.metadata).get(id) ?? null;
  const name = canonical?.name ?? upstream?.name ?? id;
  const description = metadata?.description;
  const parts = [name];
  if (typeof description === "string") parts.push(description);
  return {
    id,
    name,
    inCanonical: canonical !== undefined,
    metadata,
    criteria: parts.join(": ").slice(0, DESCRIPTION_LIMIT),
  };
}

export function universeCriteria(id: string, model: UniverseModel | undefined): string {
  const parts = [model?.name ?? id];
  if (model?.canonical_slug) parts.push(`slug ${model.canonical_slug}`);
  if (model?.hugging_face_id) parts.push(`hugging face ${model.hugging_face_id}`);
  if (model?.context_length !== undefined) parts.push(`context ${model.context_length}`);
  return parts.join("; ").slice(0, DESCRIPTION_LIMIT);
}

export function compactUniverse(
  id: string,
  model: UniverseModel | undefined,
): Record<string, string | number> {
  const compact: Record<string, string | number> = { id };
  if (model?.name) compact.name = model.name;
  if (model?.canonical_slug) compact.canonical_slug = model.canonical_slug;
  if (model?.hugging_face_id) compact.hugging_face_id = model.hugging_face_id;
  if (model?.context_length !== undefined) compact.context_length = model.context_length;
  return compact;
}

export function bareName(id: string): string {
  return id.split("/").at(-1) ?? id;
}

export function namespaceOf(id: string): string | undefined {
  const separator = id.indexOf("/");
  return separator < 0 ? undefined : id.slice(0, separator);
}
