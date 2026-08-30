import { sortJsonObject } from "./files.ts";
import type { CanonicalModel, JsonValue } from "./schema.ts";

const RESERVED_CANONICAL_FIELDS = new Set(["id", "name", "providers"]);
const NON_IDENTITY_NAME_SUFFIX = /(?:\s*\(\s*free\s*\)|\s+free|[-:]\s*free)$/i;

export function normalizeCanonicalModelName(name: string): string {
  let normalized = name.trim();

  while (NON_IDENTITY_NAME_SUFFIX.test(normalized)) {
    normalized = normalized.replace(NON_IDENTITY_NAME_SUFFIX, "").trim();
  }

  return normalized || name.trim();
}

export function canonicalModelWithGeneratedFields(
  identity: Pick<CanonicalModel, "id" | "name">,
  generatedFields: Readonly<Record<string, JsonValue>>,
): CanonicalModel {
  const generated = Object.fromEntries(
    Object.entries(generatedFields).filter(([key]) => !RESERVED_CANONICAL_FIELDS.has(key)),
  );

  return {
    id: identity.id,
    name: normalizeCanonicalModelName(identity.name),
    ...sortJsonObject(generated),
  };
}
