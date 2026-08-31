import { z } from "zod";

export const CATALOGUE_SCHEMA_VERSION = 2 as const;

export type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.boolean(),
    z.null(),
    z.number().finite(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const jsonObjectSchema = z.record(z.string(), jsonValueSchema);
export const providerIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const canonicalModelIdSchema = z
  .string()
  .regex(
    /^(?:[a-z0-9]+(?:[._-][a-z0-9]+)*\/[a-z0-9]+(?:[._-][a-z0-9]+)*|stealth:[a-z0-9]+(?:[._-][a-z0-9]+)*)$/,
  );

export const offerSchema = z
  .object({
    model_id: z.string().min(1),
    connection: jsonObjectSchema,
  })
  .strict();

export const providerSnapshotSchema = z
  .object({
    provider: providerIdSchema,
    offers: z.array(offerSchema),
  })
  .strict();

export const canonicalModelSchema = z
  .object({
    id: canonicalModelIdSchema,
    name: z.string().trim().min(1),
  })
  .catchall(jsonValueSchema);

export const canonicalModelsSchema = z
  .object({
    models: z.array(canonicalModelSchema),
  })
  .strict();

export const providerMappingsSchema = z
  .object({
    provider: providerIdSchema,
    mappings: z.record(z.string().min(1), canonicalModelIdSchema),
  })
  .strict();

export const unresolvedSchema = z
  .object({
    providers: z.record(providerIdSchema, z.array(z.string().min(1))),
  })
  .strict();

export const catalogueSchema = z
  .object({
    schema_version: z.literal(CATALOGUE_SCHEMA_VERSION),
    models: z.array(
      z
        .object({
          id: canonicalModelIdSchema,
          name: z.string().min(1),
          providers: z.record(
            providerIdSchema,
            z
              .object({
                offers: z.array(offerSchema),
              })
              .strict(),
          ),
        })
        .catchall(jsonValueSchema),
    ),
  })
  .strict();

export type Catalogue = z.infer<typeof catalogueSchema>;
export type CanonicalModel = z.infer<typeof canonicalModelSchema>;
export type CanonicalModels = z.infer<typeof canonicalModelsSchema>;
export type DiscoveredOffer = z.infer<typeof offerSchema>;
export type ProviderMappings = z.infer<typeof providerMappingsSchema>;
export type ProviderSnapshot = z.infer<typeof providerSnapshotSchema>;
export type Unresolved = z.infer<typeof unresolvedSchema>;
