import { desluggifyModelId } from "../catalogue/canonical.ts";
import {
  type DiscoveredOffer,
  type JsonValue,
  jsonObjectSchema,
  type ProviderDoc,
} from "../catalogue/schema.ts";
import { kiloPublishedLimits } from "./limits.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson } from "./source.ts";

export const KILO_API_BASE_URL = "https://api.kilo.ai/api/gateway";
export const KILO_MODELS_URL = `${KILO_API_BASE_URL}/models`;

// The kilo-auto/ namespace holds virtual routing tiers (frontier, balanced,
// efficient, free, ...) that resolve server-side to other models, not concrete
// free models of their own. The openrouter/ namespace is the same kind of
// router hosted behind the Kilo gateway.
const KILO_ROUTER_PREFIXES = ["kilo-auto/", "openrouter/"] as const;

export interface KiloProviderOptions {
  readonly fetch?: FetchSource;
}

export class KiloProvider implements ModelProvider {
  readonly id = "kilo";
  readonly name = "Kilo";
  readonly doc: ProviderDoc = {
    models: "https://kilo.ai/docs/gateway/models-and-providers",
    overview: "https://kilo.ai/docs/gateway",
    pricing: "https://kilo.ai/docs/gateway/usage-and-billing",
    rate_limit: "https://kilo.ai/docs/gateway/usage-and-billing",
  };

  readonly #fetch: FetchSource;

  constructor(options: KiloProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const payload = await fetchJson(this.#fetch, KILO_MODELS_URL, "Kilo models", {
      headers: { Accept: "application/json" },
    });

    const kiloMeta = modelsDev.get(this.id);
    const env = kiloMeta?.env && kiloMeta.env.length > 0 ? [...kiloMeta.env] : undefined;

    const connection = {
      base_url: KILO_API_BASE_URL,
      protocol: "openai",
      ...(env ? { auth: { env } } : {}),
    };

    return parseKiloModels(payload).map((model) => {
      const modelId = model.id as string;
      const modelName =
        typeof model.name === "string" && model.name.trim().length > 0
          ? model.name.trim()
          : desluggifyModelId(modelId);

      return {
        model_id: modelId,
        name: modelName,
        connection,
        limits: kiloPublishedLimits(),
      };
    });
  }
}

export function parseKiloModels(payload: unknown): Record<string, JsonValue>[] {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success || !Array.isArray(envelope.data.data)) {
    throw new Error("Kilo models response is malformed: expected a JSON-safe data array");
  }

  const seen = new Set<string>();
  const models: Record<string, JsonValue>[] = [];
  for (const [index, candidate] of envelope.data.data.entries()) {
    const parsed = jsonObjectSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        `Kilo models response is malformed: model at data.${index} is not a JSON-safe object`,
      );
    }
    const model = parsed.data;
    const modelId = model.id;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      throw new Error(`Kilo models response is malformed: model at data.${index} has no valid id`);
    }
    if (seen.has(modelId)) {
      throw new Error(`Kilo models response contains duplicate model ID: ${modelId}`);
    }
    seen.add(modelId);

    if (KILO_ROUTER_PREFIXES.some((prefix) => modelId.startsWith(prefix))) {
      continue;
    }
    if (isFreeKiloModel(model)) {
      models.push(model);
    }
  }

  if (models.length === 0) {
    throw new Error("Kilo models response contains no free models");
  }
  return models;
}

export function isFreeKiloModel(model: Record<string, JsonValue>): boolean {
  if (model.isFree !== true) {
    return false;
  }
  const pricing = model.pricing;
  if (pricing === undefined) {
    return true;
  }
  const parsed = jsonObjectSchema.safeParse(pricing);
  if (!parsed.success) {
    return false;
  }
  const promptFree = parsed.data.prompt === undefined || isZeroPrice(parsed.data.prompt);
  const completionFree =
    parsed.data.completion === undefined || isZeroPrice(parsed.data.completion);
  return promptFree && completionFree;
}

function isZeroPrice(value: JsonValue | undefined): boolean {
  if (typeof value === "number") {
    return value === 0;
  }
  if (typeof value === "string") {
    const amount = Number(value.trim());
    return value.trim().length > 0 && Number.isFinite(amount) && amount === 0;
  }
  return false;
}
