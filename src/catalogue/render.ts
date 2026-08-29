import type { Catalogue } from "./schema.ts";
import { catalogueSchema } from "./schema.ts";

export const emptyCatalogue = {
  schema_version: 1,
  models: [],
} satisfies Catalogue;

export function renderCatalogue(catalogue: Catalogue): string {
  const validatedCatalogue = catalogueSchema.parse(catalogue);
  return `${JSON.stringify(validatedCatalogue, null, 2)}\n`;
}
