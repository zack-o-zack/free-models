import { type DiscoveredOffer, type JsonValue, jsonObjectSchema } from "../catalogue/schema.ts";
import type {
  ActiveCanonicalModel,
  CanonicalMetadata,
  CanonicalMetadataProvider,
} from "../metadata/provider.ts";
import type { ModelProvider } from "./provider.ts";

export const OPENROUTER_API_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_MODELS_URL = `${OPENROUTER_API_BASE_URL}/models?output_modalities=all`;

const OPENROUTER_FREE_SUFFIX = ":free";
const OPENROUTER_NON_MODEL_IDS = new Set(["openrouter/free"]);

interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

type FetchModels = (url: string, init?: RequestInit) => Promise<HttpResponse>;

export interface OpenRouterProviderOptions {
  readonly fetch?: FetchModels;
}

export class OpenRouterProvider implements ModelProvider, CanonicalMetadataProvider {
  readonly id = "openrouter";

  readonly #fetch: FetchModels;

  constructor(options: OpenRouterProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(): Promise<readonly DiscoveredOffer[]> {
    const models = await this.#loadModels();
    const offers: DiscoveredOffer[] = [];

    for (const model of models) {
      const modelId = model.id as string;
      if (OPENROUTER_NON_MODEL_IDS.has(modelId) || !modelId.endsWith(OPENROUTER_FREE_SUFFIX)) {
        continue;
      }

      offers.push({
        model_id: modelId,
        connection: { base_url: OPENROUTER_API_BASE_URL },
        metadata: withoutId(model),
      });
    }

    return offers;
  }

  async enrich(
    models: readonly ActiveCanonicalModel[],
  ): Promise<ReadonlyMap<string, CanonicalMetadata>> {
    const metadataByCanonicalId = new Map<string, CanonicalMetadata>();
    const modelsWithoutOpenRouterOffer: ActiveCanonicalModel[] = [];

    for (const activeModel of models) {
      const openRouterOffer = activeModel.offers.find(({ provider }) => provider === this.id);
      if (openRouterOffer) {
        metadataByCanonicalId.set(activeModel.model.id, openRouterOffer.offer.metadata);
      } else {
        modelsWithoutOpenRouterOffer.push(activeModel);
      }
    }

    if (modelsWithoutOpenRouterOffer.length === 0) {
      return metadataByCanonicalId;
    }

    const sourceModels = await this.#loadModels();
    const sourceById = new Map(sourceModels.map((model) => [model.id as string, model]));
    for (const { model } of modelsWithoutOpenRouterOffer) {
      const sourceModel = sourceById.get(model.id);
      if (sourceModel) {
        metadataByCanonicalId.set(model.id, withoutId(sourceModel));
      }
    }

    return metadataByCanonicalId;
  }

  async #loadModels(): Promise<readonly Record<string, JsonValue>[]> {
    const response = await this.#requestModels();
    const payload = await this.#readPayload(response);
    const envelope = jsonObjectSchema.safeParse(payload);
    if (!envelope.success) {
      throw new Error("OpenRouter models response is malformed: expected a JSON-safe object");
    }
    const models = envelope.data.data;
    if (!Array.isArray(models)) {
      throw new Error("OpenRouter models response is malformed: expected a data array");
    }

    const seenModelIds = new Set<string>();
    const parsedModels: Record<string, JsonValue>[] = [];

    for (const [index, candidate] of models.entries()) {
      const modelResult = jsonObjectSchema.safeParse(candidate);
      if (!modelResult.success) {
        throw new Error(
          `OpenRouter models response is malformed: model at data.${index} is not a JSON-safe object`,
        );
      }

      const model = modelResult.data;
      const modelId = model.id;
      if (typeof modelId !== "string" || modelId.trim().length === 0) {
        throw new Error(
          `OpenRouter models response is malformed: model at data.${index} has no valid id`,
        );
      }
      if (seenModelIds.has(modelId)) {
        throw new Error(`OpenRouter models response contains duplicate model ID: ${modelId}`);
      }
      seenModelIds.add(modelId);

      parsedModels.push(model);
    }

    return parsedModels;
  }

  async #requestModels(): Promise<HttpResponse> {
    let response: HttpResponse;
    try {
      response = await this.#fetch(OPENROUTER_MODELS_URL, {
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      throw new Error("OpenRouter models request failed", { cause: error });
    }

    if (!response.ok) {
      throw new Error(`OpenRouter models request failed with HTTP status ${response.status}`);
    }
    return response;
  }

  async #readPayload(response: HttpResponse): Promise<unknown> {
    try {
      return await response.json();
    } catch (error) {
      throw new Error("OpenRouter models response is not valid JSON", { cause: error });
    }
  }
}

function withoutId(model: Record<string, JsonValue>): Record<string, JsonValue> {
  return Object.fromEntries(Object.entries(model).filter(([key]) => key !== "id"));
}
