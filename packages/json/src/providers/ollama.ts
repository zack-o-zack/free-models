import { desluggifyModelId } from "../catalogue/canonical.ts";
import {
  type DiscoveredOffer,
  type JsonValue,
  jsonObjectSchema,
  type ProviderDoc,
} from "../catalogue/schema.ts";
import { ollamaPublishedLimits } from "./limits.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson } from "./source.ts";

export const OLLAMA_API_BASE_URL = "https://ollama.com/v1";
export const OLLAMA_MODELS_URL = `${OLLAMA_API_BASE_URL}/models`;
export const OLLAMA_CLOUD_CATALOG_URL = "https://ollama.com/search?c=cloud";
export const OLLAMA_CLOUD_DOCS_URL = "https://docs.ollama.com/cloud";
export const OLLAMA_PRICING_URL = "https://ollama.com/pricing";

export interface OllamaProviderOptions {
  readonly fetch?: FetchSource;
}

export class OllamaProvider implements ModelProvider {
  readonly id = "ollama";
  readonly name = "Ollama";
  readonly doc: ProviderDoc = {
    models: OLLAMA_CLOUD_CATALOG_URL,
    overview: OLLAMA_CLOUD_DOCS_URL,
    pricing: OLLAMA_PRICING_URL,
    rate_limit: OLLAMA_PRICING_URL,
  };

  readonly #fetch: FetchSource;

  constructor(options: OllamaProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const payload = await fetchJson(this.#fetch, OLLAMA_MODELS_URL, "Ollama models", {
      headers: { Accept: "application/json" },
    });

    // models.dev tracks this provider as "ollama-cloud"; fall back to the
    // registry ID when that entry is absent.
    const ollamaMeta = modelsDev.get("ollama-cloud") ?? modelsDev.get(this.id);
    const env =
      ollamaMeta?.env && ollamaMeta.env.length > 0 ? [...ollamaMeta.env] : ["OLLAMA_API_KEY"];

    const connection = {
      base_url: OLLAMA_API_BASE_URL,
      protocol: "openai",
      auth: { env },
    };

    return parseOllamaModels(payload).map((model) => {
      const modelId = model.id as string;
      return {
        model_id: modelId,
        name: desluggifyModelId(modelId),
        connection,
        limits: ollamaPublishedLimits(),
      };
    });
  }
}

export function parseOllamaModels(payload: unknown): Record<string, JsonValue>[] {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success || envelope.data.object !== "list" || !Array.isArray(envelope.data.data)) {
    throw new Error(
      'Ollama models response is malformed: expected object "list" with a data array',
    );
  }

  const seen = new Set<string>();
  const models: Record<string, JsonValue>[] = [];
  for (const [index, candidate] of envelope.data.data.entries()) {
    const parsed = jsonObjectSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        `Ollama models response is malformed: model at data.${index} is not a JSON-safe object`,
      );
    }
    const model = parsed.data;
    const modelId = model.id;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      throw new Error(
        `Ollama models response is malformed: model at data.${index} has no valid id`,
      );
    }
    if (seen.has(modelId)) {
      throw new Error(`Ollama models response contains duplicate model ID: ${modelId}`);
    }
    seen.add(modelId);
    models.push(model);
  }

  if (models.length === 0) {
    throw new Error("Ollama models response contains no cloud models");
  }
  return models;
}
