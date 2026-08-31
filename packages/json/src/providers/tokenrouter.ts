import { type DiscoveredOffer, type JsonValue, jsonObjectSchema } from "../catalogue/schema.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson } from "./source.ts";

export const TOKENROUTER_API_BASE_URL = "https://api.tokenrouter.com/v1";
export const TOKENROUTER_MODELS_URL = `${TOKENROUTER_API_BASE_URL}/models`;
export const TOKENROUTER_PRICING_URL = "https://api.tokenrouter.com/api/pricing";

const DEFAULT_GROUP = "default";
const NATIVE_FREE_MODEL_SUFFIX = "-free";

export interface TokenRouterFreeModel {
  readonly modelId: string;
  readonly supportedEndpointTypes: string[];
}

export interface TokenRouterProviderOptions {
  readonly fetch?: FetchSource;
  readonly apiKey?: string;
}

export class TokenRouterProvider implements ModelProvider {
  readonly id = "tokenrouter";

  readonly #fetch: FetchSource;
  readonly #apiKey: string | undefined;

  constructor(options: TokenRouterProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
    this.#apiKey = options.apiKey ?? process.env.TOKENROUTER_API_KEY;
  }

  async discover(): Promise<readonly DiscoveredOffer[]> {
    if (!this.#apiKey) {
      throw new Error("TokenRouter discovery requires TOKENROUTER_API_KEY");
    }

    const [modelsPayload, pricingPayload] = await Promise.all([
      fetchJson(this.#fetch, TOKENROUTER_MODELS_URL, "TokenRouter active models", {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.#apiKey}`,
        },
      }),
      fetchJson(this.#fetch, TOKENROUTER_PRICING_URL, "TokenRouter pricing", {
        headers: { Accept: "application/json" },
      }),
    ]);

    const activeModelIds = parseTokenRouterModels(modelsPayload);
    const freeModels = parseTokenRouterPricing(pricingPayload);
    const activeFreeModels = freeModels.filter(({ modelId }) => activeModelIds.has(modelId));
    if (activeFreeModels.length === 0) {
      throw new Error("TokenRouter catalogue contains no active native free models");
    }

    return activeFreeModels.map(({ modelId, supportedEndpointTypes }) => ({
      model_id: modelId,
      connection: {
        base_url: TOKENROUTER_API_BASE_URL,
        supported_endpoint_types: supportedEndpointTypes,
      },
    }));
  }
}

export function parseTokenRouterModels(payload: unknown): ReadonlySet<string> {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success || envelope.data.object !== "list" || !Array.isArray(envelope.data.data)) {
    throw new Error(
      'TokenRouter active models response is malformed: expected object "list" with a data array',
    );
  }

  const modelIds = new Set<string>();
  for (const [index, candidate] of envelope.data.data.entries()) {
    const model = jsonObjectSchema.safeParse(candidate);
    if (!model.success) {
      throw new Error(
        "TokenRouter active models response is malformed: model at data." +
          index +
          " is not a JSON-safe object",
      );
    }
    const modelId = model.data.id;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      throw new Error(
        "TokenRouter active models response is malformed: model at data." +
          index +
          " has no valid id",
      );
    }
    if (modelIds.has(modelId)) {
      throw new Error(`TokenRouter active models response contains duplicate model ID: ${modelId}`);
    }
    modelIds.add(modelId);
  }
  return modelIds;
}

export function parseTokenRouterPricing(payload: unknown): TokenRouterFreeModel[] {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success || envelope.data.success !== true || !Array.isArray(envelope.data.data)) {
    throw new Error(
      "TokenRouter pricing response is malformed: expected a successful JSON-safe data array",
    );
  }

  const seenModelIds = new Set<string>();
  const freeModels: TokenRouterFreeModel[] = [];
  for (const [index, candidate] of envelope.data.data.entries()) {
    const parsed = jsonObjectSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        "TokenRouter pricing response is malformed: model at data." +
          index +
          " is not a JSON-safe object",
      );
    }
    const model = parsed.data;
    const modelId = model.model_name;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      throw new Error(`TokenRouter pricing response has no valid model_name at data.${index}`);
    }
    if (seenModelIds.has(modelId)) {
      throw new Error(`TokenRouter pricing response contains duplicate model ID: ${modelId}`);
    }
    seenModelIds.add(modelId);

    const groups = stringArray(model.enable_groups, modelId, "enable_groups");
    const endpoints = stringArray(
      model.supported_endpoint_types,
      modelId,
      "supported_endpoint_types",
    );
    const zeroPrice = hasZeroPrice(model, modelId);
    if (
      modelId.endsWith(NATIVE_FREE_MODEL_SUFFIX) &&
      groups.includes(DEFAULT_GROUP) &&
      endpoints.length > 0 &&
      zeroPrice
    ) {
      freeModels.push({ modelId, supportedEndpointTypes: endpoints.sort() });
    }
  }

  if (freeModels.length === 0) {
    throw new Error("TokenRouter pricing response contains no native free models with endpoints");
  }
  return freeModels;
}

function stringArray(value: JsonValue | undefined, modelId: string, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`TokenRouter pricing response has invalid ${field} for ${modelId}`);
  }
  const strings: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new Error(`TokenRouter pricing response has invalid ${field} for ${modelId}`);
    }
    strings.push(entry);
  }
  return strings;
}

function hasZeroPrice(model: Record<string, JsonValue>, modelId: string): boolean {
  if (model.quota_type === 0) {
    const inputRatio = nonnegativeNumber(model.model_ratio, modelId, "model_ratio");
    nonnegativeNumber(model.completion_ratio, modelId, "completion_ratio");
    return inputRatio === 0;
  }
  if (model.quota_type === 1) {
    return nonnegativeNumber(model.model_price, modelId, "model_price") === 0;
  }
  throw new Error(`TokenRouter pricing response has invalid quota_type for ${modelId}`);
}

function nonnegativeNumber(value: JsonValue | undefined, modelId: string, field: string): number {
  if (typeof value !== "number" || value < 0) {
    throw new Error(`TokenRouter pricing response has invalid ${field} for ${modelId}`);
  }
  return value;
}
