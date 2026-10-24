import { z } from "zod";
import { OPENROUTER_MODELS_URL } from "../providers/openrouter.ts";
import type { UniverseModel } from "./identity-index.ts";

const OPENROUTER_ROUTER_PREFIX = "openrouter/";

const modelEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  canonical_slug: z.string().min(1).optional(),
  hugging_face_id: z.string().min(1).nullable().optional(),
  context_length: z.number().int().positive().nullable().optional(),
});

const modelsResponseSchema = z.object({ data: z.array(z.unknown()) });

/**
 * Loads the OpenRouter model list used as the recall universe. Entries that fail validation are
 * skipped individually; the call throws only when the list cannot be fetched or is empty.
 */
export async function loadOpenRouterUniverse(
  request: (url: string, init: RequestInit) => Promise<Response> = (url, init) => fetch(url, init),
): Promise<UniverseModel[]> {
  const response = await request(OPENROUTER_MODELS_URL, {
    headers: { Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok)
    throw new Error(`OpenRouter models request failed with HTTP ${response.status}`);
  const envelope = modelsResponseSchema.parse(await response.json());

  const models: UniverseModel[] = [];
  for (const entry of envelope.data) {
    const parsed = modelEntrySchema.safeParse(entry);
    if (!parsed.success || parsed.data.id.startsWith(OPENROUTER_ROUTER_PREFIX)) continue;
    const { id, name, canonical_slug, hugging_face_id, context_length } = parsed.data;
    models.push({
      id,
      ...(name ? { name } : {}),
      ...(canonical_slug ? { canonical_slug } : {}),
      ...(hugging_face_id ? { hugging_face_id } : {}),
      ...(context_length ? { context_length } : {}),
    });
  }
  if (models.length === 0) throw new Error("OpenRouter models request returned no usable models");
  return models;
}
