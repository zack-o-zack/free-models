import type { MetadataEntry } from "../metadata-sources/metadata-source.ts";
import { compareStrings, sortJsonObject } from "./files.ts";
import type { MetadataSnapshot, ModelMetadata } from "./schema.ts";

export function resolveMetadataEntry(
  canonicalId: string,
  entries: readonly MetadataEntry[],
): MetadataEntry | null {
  const exactId = entries.filter((entry) => entry.id === canonicalId);
  if (exactId.length > 0) {
    return lexicalFirst(exactId);
  }

  const exactSlug = entries.filter((entry) => entry.canonicalSlug === canonicalId);
  if (exactSlug.length > 0) {
    return lexicalFirst(exactSlug);
  }

  const base = baseModelId(canonicalId);
  const byBase = entries.filter(
    (entry) =>
      baseModelId(entry.id) === base ||
      (entry.canonicalSlug !== null && baseModelId(entry.canonicalSlug) === base),
  );
  return byBase.length > 0 ? lexicalFirst(byBase) : null;
}

export function buildMetadataSnapshot(
  sourceId: string,
  canonicalIds: readonly string[],
  entries: readonly MetadataEntry[],
): MetadataSnapshot {
  const models: Record<string, ModelMetadata> = {};

  for (const canonicalId of canonicalIds) {
    const entry = resolveMetadataEntry(canonicalId, entries);
    if (entry) {
      models[canonicalId] = sortJsonObject(entry.metadata);
    }
  }

  return { source: sourceId, models };
}

export function baseModelId(id: string): string {
  return id.replace(/:[^:]*$/, "").replace(/-\d{8}$/, "");
}

function lexicalFirst(entries: readonly MetadataEntry[]): MetadataEntry {
  const first = [...entries].sort((left, right) => compareStrings(left.id, right.id))[0];
  if (!first) {
    throw new Error("Cannot resolve metadata from an empty candidate set");
  }
  return first;
}
