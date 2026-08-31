import { desluggifyModelId } from "../catalogue/canonical.ts";
import { type DiscoveredOffer, type JsonValue, jsonObjectSchema } from "../catalogue/schema.ts";
import type {
  ActiveCanonicalModel,
  CanonicalMetadata,
  CanonicalMetadataProvider,
} from "../metadata/provider.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";

export const OPENROUTER_API_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_MODELS_URL = `${OPENROUTER_API_BASE_URL}/models?output_modalities=all`;

const OPENROUTER_FREE_SUFFIX = ":free";
// The openrouter/ namespace holds routing endpoints (auto, fusion, free, ...) that stand in
// front of other providers' models, not concrete free models of their own.
const OPENROUTER_ROUTER_PREFIX = "openrouter/";

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
  readonly name = "OpenRouter";

  readonly #fetch: FetchModels;

  constructor(options: OpenRouterProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const models = await this.#loadModels();
    const openRouterMeta = modelsDev.get(this.id);
    const env =
      openRouterMeta?.env && openRouterMeta.env.length > 0 ? [...openRouterMeta.env] : undefined;

    const connection = {
      base_url: OPENROUTER_API_BASE_URL,
      protocol: "openai",
      ...(env ? { auth: { env } } : {}),
    };

    const offers: DiscoveredOffer[] = [];

    for (const model of models) {
      const modelId = model.id as string;
      if (
        modelId.startsWith(OPENROUTER_ROUTER_PREFIX) ||
        !modelId.endsWith(OPENROUTER_FREE_SUFFIX)
      ) {
        continue;
      }

      const modelName =
        typeof model.name === "string" && model.name.trim().length > 0
          ? model.name.trim()
          : desluggifyModelId(modelId);

      offers.push({
        model_id: modelId,
        name: modelName,
        connection,
      });
    }

    return offers;
  }

  async enrich(
    models: readonly ActiveCanonicalModel[],
  ): Promise<ReadonlyMap<string, CanonicalMetadata>> {
    const metadataByCanonicalId = new Map<string, CanonicalMetadata>();
    const sourceModels = await this.#loadModels();
    const sourceById = new Map(sourceModels.map((model) => [model.id as string, model]));
    for (const { model, offers } of models) {
      const openRouterOffer = offers.find(({ provider }) => provider === this.id);
      const sourceModel = sourceById.get(openRouterOffer?.offer.model_id ?? model.id);
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
