import { type DiscoveredOffer, type JsonValue, jsonObjectSchema } from "../catalogue/schema.ts";
import { unavailableLimits } from "./limits.ts";
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

  readonly #fetch: FetchSource;
  readonly #apiKey: string | undefined;

  constructor(options: MistralProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
    this.#apiKey = options.apiKey ?? process.env.MISTRAL_FREE_API_KEY;
  }

  async discover(): Promise<readonly DiscoveredOffer[]> {
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
    return parseMistralModels(payload).map((model) => ({
      model_id: model.id as string,
      connection: { base_url: MISTRAL_API_BASE_URL },
      limits: unavailableLimits("account_specific", "organization", MISTRAL_RATE_LIMITS_URL),
    }));
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
