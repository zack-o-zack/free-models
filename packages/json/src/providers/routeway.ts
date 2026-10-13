import { desluggifyModelId } from "../catalogue/canonical.ts";
import {
  type DiscoveredOffer,
  type JsonValue,
  jsonObjectSchema,
  type ProviderDoc,
} from "../catalogue/schema.ts";
import { routewayPublishedLimits } from "./limits.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson } from "./source.ts";

export const ROUTEWAY_API_BASE_URL = "https://api.routeway.ai/v1";
export const ROUTEWAY_MODELS_URL = `${ROUTEWAY_API_BASE_URL}/models`;
export const ROUTEWAY_MODELS_CATALOG_URL = "https://routeway.ai/models";
export const ROUTEWAY_RATE_LIMITS_URL = "https://docs.routeway.ai/getting-started/rate-limits";

// The :free suffix marks the free tier of a model, but the suffix alone is
// not proof of a free offer: a free offer also needs zero input and output
// pricing.
const ROUTEWAY_FREE_SUFFIX = ":free";

export interface RoutewayProviderOptions {
  readonly fetch?: FetchSource;
}

export class RoutewayProvider implements ModelProvider {
  readonly id = "routeway";
  readonly name = "Routeway";
  readonly doc: ProviderDoc = {
    models: ROUTEWAY_MODELS_CATALOG_URL,
    overview: "https://docs.routeway.ai/getting-started/introduction",
    pricing: ROUTEWAY_MODELS_CATALOG_URL,
    rate_limit: ROUTEWAY_RATE_LIMITS_URL,
  };

  readonly #fetch: FetchSource;

  constructor(options: RoutewayProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const payload = await fetchJson(this.#fetch, ROUTEWAY_MODELS_URL, "Routeway models", {
      headers: { Accept: "application/json" },
    });

    const routewayMeta = modelsDev.get(this.id);
    const env =
      routewayMeta?.env && routewayMeta.env.length > 0
        ? [...routewayMeta.env]
        : ["ROUTEWAY_API_KEY"];

    const connection = {
      base_url: ROUTEWAY_API_BASE_URL,
      protocol: "openai",
      auth: { env },
    };

    return parseRoutewayModels(payload).map((model) => {
      const modelId = model.id as string;
      const modelName =
        typeof model.name === "string" && model.name.trim().length > 0
          ? model.name.trim()
          : typeof model.short_name === "string" && model.short_name.trim().length > 0
            ? model.short_name.trim()
            : desluggifyModelId(modelId);

      return {
        model_id: modelId,
        name: modelName,
        connection,
        limits: routewayPublishedLimits(),
      };
    });
  }
}

export function parseRoutewayModels(payload: unknown): Record<string, JsonValue>[] {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success || envelope.data.object !== "list" || !Array.isArray(envelope.data.data)) {
    throw new Error(
      'Routeway models response is malformed: expected object "list" with a data array',
    );
  }

  const seen = new Set<string>();
  const models: Record<string, JsonValue>[] = [];
  for (const [index, candidate] of envelope.data.data.entries()) {
    const parsed = jsonObjectSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        `Routeway models response is malformed: model at data.${index} is not a JSON-safe object`,
      );
    }
    const model = parsed.data;
    const modelId = model.id;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      throw new Error(
        `Routeway models response is malformed: model at data.${index} has no valid id`,
      );
    }
    if (seen.has(modelId)) {
      throw new Error(`Routeway models response contains duplicate model ID: ${modelId}`);
    }
    seen.add(modelId);

    if (isFreeRoutewayModel(model)) {
      models.push(model);
    }
  }

  if (models.length === 0) {
    throw new Error("Routeway models response contains no free models");
  }
  return models;
}

export function isFreeRoutewayModel(model: Record<string, JsonValue>): boolean {
  const modelId = model.id;
  if (typeof modelId !== "string" || !modelId.endsWith(ROUTEWAY_FREE_SUFFIX)) {
    return false;
  }
  const pricing = jsonObjectSchema.safeParse(model.pricing);
  if (!pricing.success) {
    return false;
  }
  return isZeroPrice(pricing.data.input) && isZeroPrice(pricing.data.output);
}

function isZeroPrice(value: JsonValue | undefined): boolean {
  const parsed = jsonObjectSchema.safeParse(value);
  if (!parsed.success) {
    return false;
  }
  return parsed.data.price_per_million_t === 0;
}
