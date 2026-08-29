import { sortJsonObject } from "./files.ts";
import type { CanonicalModel, JsonValue } from "./schema.ts";

const RESERVED_CANONICAL_FIELDS = new Set(["id", "name", "providers"]);

export function canonicalModelWithGeneratedFields(
  identity: Pick<CanonicalModel, "id" | "name">,
  generatedFields: Readonly<Record<string, JsonValue>>,
): CanonicalModel {
  const generated = Object.fromEntries(
    Object.entries(generatedFields).filter(([key]) => !RESERVED_CANONICAL_FIELDS.has(key)),
  );

  return {
    id: identity.id,
    name: identity.name,
    ...sortJsonObject(generated),
  };
}
