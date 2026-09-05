import { desluggifyModelId } from "../catalogue/canonical.ts";
import {
  type DiscoveredOffer,
  type JsonValue,
  jsonObjectSchema,
  type ProviderDoc,
} from "../catalogue/schema.ts";
import { cohereOfferLimits } from "./limits.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson } from "./source.ts";

export const COHERE_API_BASE_URL = "https://api.cohere.ai/compatibility/v1";
export const COHERE_NATIVE_V1_BASE_URL = "https://api.cohere.com/v1";
export const COHERE_NATIVE_V2_BASE_URL = "https://api.cohere.com/v2";
export const COHERE_MODELS_URL = "https://api.cohere.com/v1/models";
export const COHERE_MODELS_PAGE_SIZE = 1000;
export const COHERE_RATE_LIMITS_URL = "https://docs.cohere.com/docs/rate-limits";

export interface CohereProviderOptions {
  readonly fetch?: FetchSource;
  readonly apiKey?: string;
}

export interface CohereModel {
  readonly modelId: string;
  readonly endpoints: string[];
}

interface CohereModelsPage {
  readonly models: CohereModel[];
  readonly nextPageToken: string | undefined;
}

export class CohereProvider implements ModelProvider {
  readonly id = "cohere";
  readonly name = "Cohere";
  readonly doc: ProviderDoc = {
    models: "https://cohere.com/models-overview",
    overview: "https://docs.cohere.com/docs/models",
    pricing: "https://cohere.com/pricing",
    rate_limit: COHERE_RATE_LIMITS_URL,
  };

  readonly #fetch: FetchSource;
  readonly #apiKey: string | undefined;

  constructor(options: CohereProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
    this.#apiKey = options.apiKey ?? process.env.COHERE_API_KEY;
  }

  async discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    if (!this.#apiKey) {
      throw new Error("Cohere discovery requires COHERE_API_KEY (a trial key is sufficient)");
    }

    const models: CohereModel[] = [];
    let pageToken: string | undefined;
    do {
      const page = await this.#loadPage(pageToken);
      models.push(...page.models);
      pageToken = page.nextPageToken;
    } while (pageToken);

    if (models.length === 0) {
      throw new Error("Cohere models response contains no active base models");
    }

    const cohereMeta = modelsDev.get(this.id);
    const env =
      cohereMeta?.env && cohereMeta.env.length > 0 ? [...cohereMeta.env] : ["COHERE_API_KEY"];

    const seen = new Set<string>();
    return models.map((model) => {
      if (seen.has(model.modelId)) {
        throw new Error(`Cohere models response contains duplicate model ID: ${model.modelId}`);
      }
      seen.add(model.modelId);
      return {
        model_id: model.modelId,
        name: desluggifyModelId(model.modelId),
        connection: cohereConnection(model.endpoints, env),
        limits: cohereOfferLimits(model.endpoints),
      };
    });
  }

  async #loadPage(pageToken?: string): Promise<CohereModelsPage> {
    const payload = await fetchJson(this.#fetch, cohereModelsUrl(pageToken), "Cohere models", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.#apiKey}`,
      },
    });
    return parseCohereModelsPage(payload);
  }
}

export function cohereConnection(
  endpoints: readonly string[],
  env: readonly string[],
): { base_url: string; protocol: string; auth: { env: string[] } } {
  const normalized = new Set(endpoints.map((endpoint) => endpoint.trim().toLowerCase()));
  // Chat, text embed, and transcription models are served through the
  // OpenAI-compatible API; rerank, image embed, parse, and any other native
  // endpoints use the Cohere API directly (parse lives on v2, the rest on v1).
  if (normalized.has("chat") || normalized.has("embed") || normalized.has("transcriptions")) {
    return { base_url: COHERE_API_BASE_URL, protocol: "openai", auth: { env: [...env] } };
  }
  if (normalized.has("parse")) {
    return { base_url: COHERE_NATIVE_V2_BASE_URL, protocol: "cohere", auth: { env: [...env] } };
  }
  return { base_url: COHERE_NATIVE_V1_BASE_URL, protocol: "cohere", auth: { env: [...env] } };
}

export function cohereModelsUrl(pageToken?: string): string {
  const url = new URL(COHERE_MODELS_URL);
  url.searchParams.set("page_size", String(COHERE_MODELS_PAGE_SIZE));
  if (pageToken) {
    url.searchParams.set("page_token", pageToken);
  }
  return url.href;
}

export function parseCohereModelsPage(payload: unknown): CohereModelsPage {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success || !Array.isArray(envelope.data.models)) {
    throw new Error("Cohere models response is malformed: expected a JSON-safe models array");
  }

  const nextPageToken =
    envelope.data.next_page_token === undefined
      ? undefined
      : typeof envelope.data.next_page_token === "string" &&
          envelope.data.next_page_token.length > 0
        ? envelope.data.next_page_token
        : (() => {
            throw new Error("Cohere models response has an invalid next_page_token");
          })();

  const seen = new Set<string>();
  const models: CohereModel[] = [];
  for (const [index, candidate] of envelope.data.models.entries()) {
    const parsed = jsonObjectSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        `Cohere models response is malformed: model at models.${index} is not a JSON-safe object`,
      );
    }
    const model = parsed.data;
    const modelId = model.name;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      throw new Error(
        `Cohere models response is malformed: model at models.${index} has no valid name`,
      );
    }
    if (seen.has(modelId)) {
      throw new Error(`Cohere models response contains duplicate model ID: ${modelId}`);
    }
    seen.add(modelId);

    if (model.is_deprecated === true || model.finetuned === true) {
      continue;
    }

    models.push({ modelId, endpoints: stringArray(model.endpoints, modelId) });
  }

  return { models, nextPageToken };
}

function stringArray(value: JsonValue | undefined, modelId: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`Cohere models response has invalid endpoints for ${modelId}`);
  }
  const endpoints: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new Error(`Cohere models response has invalid endpoints for ${modelId}`);
    }
    endpoints.push(entry);
  }
  return endpoints;
}
