import { z } from "zod";

export const CATALOGUE_SCHEMA_VERSION = 4 as const;

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

export const limitsSchema = z
  .object({
    terms: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export const connectionAuthSchema = z
  .object({
    env: z.array(z.string().min(1)).optional(),
  })
  .catchall(jsonValueSchema);

export const connectionProtocolSchema = z.string().min(1);

export const connectionSchema = z
  .object({
    base_url: z.string().min(1),
    protocol: connectionProtocolSchema,
    auth: connectionAuthSchema.optional(),
    endpoint: z.string().min(1).optional(),
    headers: z.record(z.string(), z.string()).optional(),
  })
  .catchall(jsonValueSchema);

export const offerSchema = z
  .object({
    model_id: z.string().min(1),
    name: z.string().min(1),
    connection: connectionSchema,
    limits: limitsSchema,
  })
  .strict();

export const providerDocSchema = z
  .object({
    models: z.string().url().optional(),
    overview: z.string().url().optional(),
    pricing: z.string().url().optional(),
    rate_limit: z.string().url().optional(),
  })
  .catchall(z.string().url());

export const providerSnapshotSchema = z
  .object({
    provider: providerIdSchema,
    name: z.string().min(1),
    doc: providerDocSchema,
    offers: z.array(offerSchema),
  })
  .strict();

export const canonicalModelSchema = z
  .object({
    id: canonicalModelIdSchema,
    name: z.string().trim().min(1),
  })
  .strict();

export const canonicalModelsSchema = z
  .object({
    models: z.array(canonicalModelSchema),
  })
  .strict();

export const canonicalMetadataEntrySchema = z
  .object({
    id: canonicalModelIdSchema,
    metadata: jsonObjectSchema,
  })
  .strict();

export const canonicalMetadataSchema = z
  .object({
    metadata: z.array(canonicalMetadataEntrySchema),
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
                name: z.string().min(1),
                doc: providerDocSchema,
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
export type CanonicalMetadataEntry = z.infer<typeof canonicalMetadataEntrySchema>;
export type CanonicalMetadataFile = z.infer<typeof canonicalMetadataSchema>;
export type Connection = z.infer<typeof connectionSchema>;
export type ConnectionAuth = z.infer<typeof connectionAuthSchema>;
export type ConnectionProtocol = z.infer<typeof connectionProtocolSchema>;
export type DiscoveredOffer = z.infer<typeof offerSchema>;
export type OfferLimits = z.infer<typeof limitsSchema>;
export type ProviderDoc = z.infer<typeof providerDocSchema>;
export type ProviderMappings = z.infer<typeof providerMappingsSchema>;
export type ProviderSnapshot = z.infer<typeof providerSnapshotSchema>;
export type Unresolved = z.infer<typeof unresolvedSchema>;
