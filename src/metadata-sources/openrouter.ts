import { type JsonValue, jsonObjectSchema, type ModelMetadata } from "../catalogue/schema.ts";
import type { MetadataEntry, ModelMetadataSource } from "./metadata-source.ts";

export const OPENROUTER_METADATA_MODELS_URL = "https://openrouter.ai/api/v1/models";

interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

type FetchModels = (url: string, init?: RequestInit) => Promise<HttpResponse>;

export interface OpenRouterMetadataSourceOptions {
  readonly fetch?: FetchModels;
}

export class OpenRouterMetadataSource implements ModelMetadataSource {
  readonly id = "openrouter";

  readonly #fetch: FetchModels;

  constructor(options: OpenRouterMetadataSourceOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async fetchEntries(): Promise<readonly MetadataEntry[]> {
    const response = await this.#requestModels();
    const payload = await this.#readPayload(response);
    const envelope = jsonObjectSchema.safeParse(payload);
    if (!envelope.success) {
      throw new Error("OpenRouter metadata response is malformed: expected a JSON-safe object");
    }
    const models = envelope.data.data;
    if (!Array.isArray(models)) {
      throw new Error("OpenRouter metadata response is malformed: expected a data array");
    }

    const seenModelIds = new Set<string>();
    const entries: MetadataEntry[] = [];

    for (const [index, candidate] of models.entries()) {
      const modelResult = jsonObjectSchema.safeParse(candidate);
      if (!modelResult.success) {
        throw new Error(
          `OpenRouter metadata response is malformed: model at data.${index} is not a JSON-safe object`,
        );
      }

      const model = modelResult.data;
      const modelId = model.id;
      if (typeof modelId !== "string" || modelId.trim().length === 0) {
        throw new Error(
          `OpenRouter metadata response is malformed: model at data.${index} has no valid id`,
        );
      }
      if (seenModelIds.has(modelId)) {
        throw new Error(`OpenRouter metadata response contains duplicate model ID: ${modelId}`);
      }
      seenModelIds.add(modelId);

      const canonicalSlug = model.canonical_slug;
      if (
        canonicalSlug !== undefined &&
        canonicalSlug !== null &&
        typeof canonicalSlug !== "string"
      ) {
        throw new Error(
          `OpenRouter metadata response is malformed: model at data.${index} has an invalid canonical_slug`,
        );
      }

      entries.push({
        id: modelId,
        canonicalSlug: typeof canonicalSlug === "string" ? canonicalSlug : null,
        metadata: extractMetadata(model),
      });
    }

    return entries;
  }

  async #requestModels(): Promise<HttpResponse> {
    let response: HttpResponse;
    try {
      response = await this.#fetch(OPENROUTER_METADATA_MODELS_URL, {
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      throw new Error("OpenRouter metadata request failed", { cause: error });
    }

    if (!response.ok) {
      throw new Error(`OpenRouter metadata request failed with HTTP status ${response.status}`);
    }
    return response;
  }

  async #readPayload(response: HttpResponse): Promise<unknown> {
    try {
      return await response.json();
    } catch (error) {
      throw new Error("OpenRouter metadata response is not valid JSON", { cause: error });
    }
  }
}

function extractMetadata(model: Record<string, JsonValue>): ModelMetadata {
  return {
    architecture: model.architecture ?? null,
    benchmarks: model.benchmarks ?? null,
    context_length: model.context_length ?? null,
    created: model.created ?? null,
    description: model.description ?? null,
    hugging_face_id: model.hugging_face_id ?? null,
    knowledge_cutoff: model.knowledge_cutoff ?? null,
    reasoning: model.reasoning ?? null,
    supported_parameters: model.supported_parameters ?? null,
  };
}
