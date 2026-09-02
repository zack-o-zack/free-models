import { desluggifyModelId } from "../catalogue/canonical.ts";
import {
  type DiscoveredOffer,
  type JsonValue,
  jsonObjectSchema,
  type ProviderDoc,
} from "../catalogue/schema.ts";
import { mistralUnconfirmedLimits } from "./limits.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson } from "./source.ts";

export const MISTRAL_API_BASE_URL = "https://api.mistral.ai/v1";
export const MISTRAL_MODELS_URL = `${MISTRAL_API_BASE_URL}/models`;
export const MISTRAL_RATE_LIMITS_URL = "https://docs.mistral.ai/admin/billing-usage/usage-limits";

export interface MistralProviderOptions {
  readonly fetch?: FetchSource;
  readonly apiKey?: string;
}

export class MistralProvider implements ModelProvider {
  readonly id = "mistral";
  readonly name = "Mistral";
  readonly doc: ProviderDoc = {
    models: "https://docs.mistral.ai/getting-started/models/",
    overview: "https://docs.mistral.ai/",
    pricing: "https://mistral.ai/pricing",
    rate_limit: MISTRAL_RATE_LIMITS_URL,
  };

  readonly #fetch: FetchSource;
  readonly #apiKey: string | undefined;

  constructor(options: MistralProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
    this.#apiKey = options.apiKey ?? process.env.MISTRAL_FREE_API_KEY;
  }

  async discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    if (!this.#apiKey) {
      throw new Error(
        "Mistral discovery requires MISTRAL_FREE_API_KEY from an organization in Free mode",
      );
    }
    const payload = await fetchJson(this.#fetch, MISTRAL_MODELS_URL, "Mistral models", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.#apiKey}`,
      },
    });

    const mistralMeta = modelsDev.get(this.id);
    const env =
      mistralMeta?.env && mistralMeta.env.length > 0 ? [...mistralMeta.env] : ["MISTRAL_API_KEY"];

    const connection = {
      base_url: MISTRAL_API_BASE_URL,
      protocol: "openai",
      auth: { env },
    };

    return parseMistralModels(payload).map((model) => {
      const modelId = model.id as string;
      const modelName =
        typeof model.name === "string" && model.name.trim().length > 0
          ? model.name.trim()
          : desluggifyModelId(modelId);

      return {
        model_id: modelId,
        name: modelName,
        connection,
        limits: mistralUnconfirmedLimits(),
      };
    });
  }
}

export function parseMistralModels(payload: unknown): Record<string, JsonValue>[] {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success || !Array.isArray(envelope.data.data)) {
    throw new Error("Mistral models response is malformed: expected a JSON-safe data array");
  }

  const seen = new Set<string>();
  const models: Record<string, JsonValue>[] = [];
  for (const [index, candidate] of envelope.data.data.entries()) {
    const parsed = jsonObjectSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        `Mistral models response is malformed: model at data.${index} is not a JSON-safe object`,
      );
    }
    const model = parsed.data;
    const modelId = model.id;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      throw new Error(
        `Mistral models response is malformed: model at data.${index} has no valid id`,
      );
    }
    if (seen.has(modelId)) {
      throw new Error(`Mistral models response contains duplicate model ID: ${modelId}`);
    }
    seen.add(modelId);

    const type = typeof model.type === "string" ? model.type.toLowerCase() : "";
    if (model.archived !== true && type !== "fine-tuned" && !modelId.startsWith("ft:")) {
      models.push(model);
    }
  }
  if (models.length === 0) {
    throw new Error("Mistral models response contains no active base models");
  }
  return models;
}
