import { z } from "zod";

export type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.boolean(),
    z.null(),
    z.number(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const jsonObjectSchema = z.record(z.string(), jsonValueSchema);

export const catalogueSchema = z
  .object({
    schema_version: z.literal(1),
    models: z.array(
      z
        .object({
          id: z.string().min(1),
          name: z.string().min(1),
          providers: z.record(
            z.string().min(1),
            z
              .object({
                offers: z.array(
                  z
                    .object({
                      model_id: z.string().min(1),
                      connection: jsonObjectSchema,
                      metadata: jsonObjectSchema,
                    })
                    .strict(),
                ),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();

export type Catalogue = z.infer<typeof catalogueSchema>;
