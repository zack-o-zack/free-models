import { desluggifyModelId } from "../catalogue/canonical.ts";
import {
  type DiscoveredOffer,
  type JsonValue,
  jsonObjectSchema,
  type ProviderDoc,
} from "../catalogue/schema.ts";
import { requestyPublishedLimits } from "./limits.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson } from "./source.ts";

export const REQUESTY_API_BASE_URL = "https://router.requesty.ai/v1";
export const REQUESTY_MODELS_URL = `${REQUESTY_API_BASE_URL}/models`;
export const REQUESTY_FREE_MODELS_URL = "https://docs.requesty.ai/features/free-models";

// The policy/ namespace holds user-defined routing policies (fallbacks, load
// balancing, ...) that stand in front of other providers' models, not concrete
// free models of their own.
const REQUESTY_ROUTER_PREFIX = "policy/";

export interface RequestyProviderOptions {
  readonly fetch?: FetchSource;
}

export class RequestyProvider implements ModelProvider {
  readonly id = "requesty";
  readonly name = "Requesty";
  readonly doc: ProviderDoc = {
    models: "https://app.requesty.ai/model-library",
    overview: "https://docs.requesty.ai/quickstart",
    pricing: REQUESTY_FREE_MODELS_URL,
    rate_limit: REQUESTY_FREE_MODELS_URL,
  };

  readonly #fetch: FetchSource;

  constructor(options: RequestyProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const payload = await fetchJson(this.#fetch, REQUESTY_MODELS_URL, "Requesty models", {
      headers: { Accept: "application/json" },
    });

    const requestyMeta = modelsDev.get(this.id);
    const env =
      requestyMeta?.env && requestyMeta.env.length > 0
        ? [...requestyMeta.env]
        : ["REQUESTY_API_KEY"];

    const connection = {
      base_url: REQUESTY_API_BASE_URL,
      protocol: "openai",
      auth: { env },
    };

    return parseRequestyModels(payload).map((model) => {
      const modelId = model.id as string;
      const modelName =
        typeof model.name === "string" && model.name.trim().length > 0
          ? model.name.trim()
          : desluggifyModelId(modelId);

      return {
        model_id: modelId,
        name: modelName,
        connection,
        limits: requestyPublishedLimits(),
      };
    });
  }
}

export function parseRequestyModels(payload: unknown): Record<string, JsonValue>[] {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success || envelope.data.object !== "list" || !Array.isArray(envelope.data.data)) {
    throw new Error(
      'Requesty models response is malformed: expected object "list" with a data array',
    );
  }

  const seen = new Set<string>();
  const models: Record<string, JsonValue>[] = [];
  for (const [index, candidate] of envelope.data.data.entries()) {
    const parsed = jsonObjectSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        `Requesty models response is malformed: model at data.${index} is not a JSON-safe object`,
      );
    }
    const model = parsed.data;
    const modelId = model.id;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      throw new Error(
        `Requesty models response is malformed: model at data.${index} has no valid id`,
      );
    }
    if (seen.has(modelId)) {
      throw new Error(`Requesty models response contains duplicate model ID: ${modelId}`);
    }
    seen.add(modelId);

    if (modelId.startsWith(REQUESTY_ROUTER_PREFIX)) {
      continue;
    }
    if (isFreeRequestyModel(model)) {
      models.push(model);
    }
  }

  if (models.length === 0) {
    throw new Error("Requesty models response contains no free models");
  }
  return models;
}

export function isFreeRequestyModel(model: Record<string, JsonValue>): boolean {
  const pricing = model.pricing;
  if (Array.isArray(pricing) && pricing.length > 0) {
    return pricing.every((tier) => {
      const parsed = jsonObjectSchema.safeParse(tier);
      if (!parsed.success) {
        return false;
      }
      return isZeroPrice(parsed.data.input_price) && isZeroPrice(parsed.data.output_price);
    });
  }
  return isZeroPrice(model.input_price) && isZeroPrice(model.output_price);
}

function isZeroPrice(value: JsonValue | undefined): boolean {
  return typeof value === "number" && value === 0;
}
