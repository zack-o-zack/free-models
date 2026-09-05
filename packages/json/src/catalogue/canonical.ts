import { sortJsonObject } from "./files.ts";
import type { CanonicalModel, JsonValue } from "./schema.ts";

export const RESERVED_CANONICAL_FIELDS = new Set(["id", "name", "providers"]);
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
): CanonicalModel & Record<string, JsonValue> {
  const generated = Object.fromEntries(
    Object.entries(generatedFields).filter(([key]) => !RESERVED_CANONICAL_FIELDS.has(key)),
  );

  return {
    id: identity.id,
    name: normalizeCanonicalModelName(identity.name),
    ...sortJsonObject(generated),
  };
}

export function desluggifyModelId(slug: string): string {
  const cleaned = slug
    .replace(/^@cf\//, "")
    .replace(/(?::free|-free|\(free\))$/i, "")
    .trim();

  return cleaned
    .split("/")
    .map((part) => {
      const text = part.replace(/[-_]+/g, " ").trim().toLowerCase();
      return text.charAt(0).toUpperCase() + text.slice(1);
    })
    .join(": ");
}
