import { z } from "zod";
import { type JsonValue, jsonValueSchema } from "../catalogue/schema.ts";
import { type FetchSource, fetchJson, fetchText } from "../providers/source.ts";
import { VERCEL_CATALOGUE_URL, VERCEL_MODELS_URL } from "../providers/vercel.ts";
import { parseVercelCatalogue } from "../providers/vercel-catalogue.ts";
import type {
  ActiveCanonicalModel,
  CanonicalMetadata,
  CanonicalMetadataProvider,
} from "./provider.ts";

const modelsSchema = z.object({
  data: z.array(z.object({ id: z.string().trim().min(1) }).catchall(jsonValueSchema)),
});

/** Uses reviewed Vercel offers to fill gaps in the primary metadata registry. */
export class VercelMetadataProvider implements CanonicalMetadataProvider {
  readonly #fetch: FetchSource;

  constructor(options: { readonly fetch?: FetchSource } = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async enrich(
    models: readonly ActiveCanonicalModel[],
  ): Promise<ReadonlyMap<string, CanonicalMetadata>> {
    const eligible = models.filter(({ offers }) =>
      offers.some(({ provider }) => provider === "vercel"),
    );
    if (!eligible.length) return new Map();
    const [payload, html] = await Promise.all([
      fetchJson(this.#fetch, VERCEL_MODELS_URL, "Vercel metadata"),
      fetchText(this.#fetch, VERCEL_CATALOGUE_URL, "Vercel metadata eligibility"),
    ]);
    const source = new Map<string, Record<string, JsonValue>>();
    for (const model of modelsSchema.parse(payload).data) {
      if (source.has(model.id))
        throw new Error(`Vercel metadata contains duplicate ID: ${model.id}`);
      source.set(model.id, model);
    }
    const catalogue = new Map(
      (await parseVercelCatalogue(html)).map((model) => [model.copyString, model]),
    );
    const results = new Map<string, CanonicalMetadata>();
    for (const { model, offers } of eligible) {
      const offer = offers.find(
        ({ provider, offer }) => provider === "vercel" && catalogue.has(offer.model_id),
      );
      if (!offer) continue;
      const id = offer.offer.model_id;
      const entry = catalogue.get(id);
      if (!entry) continue;
      const upstream = source.get(id);
      const modalities = upstream?.modalities;
      const architecture =
        modalities &&
        typeof modalities === "object" &&
        !Array.isArray(modalities) &&
        nonEmptyStrings(modalities.input) &&
        nonEmptyStrings(modalities.output)
          ? { input_modalities: modalities.input, output_modalities: modalities.output }
          : undefined;
      // An incomplete source must not replace stale metadata with a partial modality contract.
      if (!architecture && entry.type !== "tool") continue;
      const metadata: Record<string, JsonValue> = {
        model_type: entry.type,
        metadata_source: { url: upstream ? VERCEL_MODELS_URL : VERCEL_CATALOGUE_URL, model_id: id },
        ...(architecture ? { architecture } : {}),
      };
      if (typeof upstream?.description === "string" && upstream.description.trim())
        metadata.description = upstream.description;
      if (typeof upstream?.context_window === "number" && upstream.context_window > 0)
        metadata.context_length = upstream.context_window;
      if (typeof upstream?.max_tokens === "number" && upstream.max_tokens > 0)
        metadata.top_provider = { max_completion_tokens: upstream.max_tokens };
      if (nonEmptyStrings(upstream?.supported_parameters))
        metadata.supported_parameters = upstream.supported_parameters;
      results.set(model.id, metadata);
    }
    return results;
  }
}

function nonEmptyStrings(value: JsonValue | undefined): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === "string" && entry.trim().length > 0)
  );
}
