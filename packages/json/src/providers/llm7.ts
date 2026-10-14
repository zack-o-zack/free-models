import { desluggifyModelId } from "../catalogue/canonical.ts";
import {
  type DiscoveredOffer,
  type JsonValue,
  jsonObjectSchema,
  type ProviderDoc,
} from "../catalogue/schema.ts";
import { llm7PublishedLimits } from "./limits.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson } from "./source.ts";

export const LLM7_API_BASE_URL = "https://api.llm7.io/v1";
export const LLM7_MODELS_URL = `${LLM7_API_BASE_URL}/models`;

// Only chat models on the "turbo" tier are available with free tokens.
// Other tiers (pro) and model types (video, audio_to_text, image) require
// a paid subscription or topped-up balance.
const LLM7_FREE_TIER = "turbo";
const LLM7_CHAT_TYPE = "chat";

export interface LLM7ProviderOptions {
  readonly fetch?: FetchSource;
}

export class LLM7Provider implements ModelProvider {
  readonly id = "llm7";
  readonly name = "LLM7";
  readonly doc: ProviderDoc = {
    models: "https://docs.llm7.io/guides/models",
    overview: "https://docs.llm7.io",
    pricing: "https://docs.llm7.io/limits",
    rate_limit: "https://docs.llm7.io/limits",
  };

  readonly #fetch: FetchSource;

  constructor(options: LLM7ProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const payload = await fetchJson(this.#fetch, LLM7_MODELS_URL, "LLM7 models", {
      headers: { Accept: "application/json" },
    });

    const llm7Meta = modelsDev.get(this.id);
    const env = llm7Meta?.env && llm7Meta.env.length > 0 ? [...llm7Meta.env] : ["LLM7_API_KEY"];

    const connection = {
      base_url: LLM7_API_BASE_URL,
      protocol: "openai",
      auth: { env },
    };

    return parseLLM7Models(payload).map((model) => {
      const modelId = model.id as string;
      const modelName =
        typeof model.name === "string" && model.name.trim().length > 0
          ? model.name.trim()
          : desluggifyModelId(modelId);

      return {
        model_id: modelId,
        name: modelName,
        connection,
        limits: llm7PublishedLimits(),
      };
    });
  }
}

export function parseLLM7Models(payload: unknown): Record<string, JsonValue>[] {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success || envelope.data.object !== "list" || !Array.isArray(envelope.data.data)) {
    throw new Error('LLM7 models response is malformed: expected object "list" with a data array');
  }

  const seen = new Set<string>();
  const models: Record<string, JsonValue>[] = [];
  for (const [index, candidate] of envelope.data.data.entries()) {
    const parsed = jsonObjectSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        `LLM7 models response is malformed: model at data.${index} is not a JSON-safe object`,
      );
    }
    const model = parsed.data;
    const modelId = model.id;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      throw new Error(`LLM7 models response is malformed: model at data.${index} has no valid id`);
    }
    if (seen.has(modelId)) {
      throw new Error(`LLM7 models response contains duplicate model ID: ${modelId}`);
    }
    seen.add(modelId);

    if (isFreeLLM7Model(model)) {
      models.push(model);
    }
  }

  if (models.length === 0) {
    throw new Error("LLM7 models response contains no free models");
  }
  return models;
}

export function isFreeLLM7Model(model: Record<string, JsonValue>): boolean {
  return model.tier === LLM7_FREE_TIER && model.model_type === LLM7_CHAT_TYPE;
}
