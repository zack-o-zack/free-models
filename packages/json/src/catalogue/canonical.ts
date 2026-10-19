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

export function normalizeCanonicalMetadata(
  metadata: Readonly<Record<string, JsonValue>>,
): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = { ...metadata };
  if (
    result.architecture &&
    typeof result.architecture === "object" &&
    !Array.isArray(result.architecture)
  ) {
    const arch = { ...(result.architecture as Record<string, JsonValue>) };
    if (Array.isArray(arch.output_modalities)) {
      arch.output_modalities = arch.output_modalities.map((modality) =>
        modality === "embedding" ? "embeddings" : modality,
      );
    }
    result.architecture = arch;
  }
  return result;
}

export function canonicalModelWithGeneratedFields(
  identity: Pick<CanonicalModel, "id" | "name">,
  generatedFields: Readonly<Record<string, JsonValue>>,
): CanonicalModel & Record<string, JsonValue> {
  const normalized = normalizeCanonicalMetadata(generatedFields);
  const generated = Object.fromEntries(
    Object.entries(normalized).filter(([key]) => !RESERVED_CANONICAL_FIELDS.has(key)),
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
