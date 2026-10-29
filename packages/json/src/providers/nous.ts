import { z } from "zod";
import { desluggifyModelId } from "../catalogue/canonical.ts";
import { compareStrings } from "../catalogue/files.ts";
import type { DiscoveredOffer, ProviderDoc } from "../catalogue/schema.ts";
import { nousPublishedLimits } from "./limits.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import { resolveNousCompliance } from "./nous-policies.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson } from "./source.ts";

export const NOUS_API_BASE_URL = "https://inference-api.nousresearch.com/v1";
export const NOUS_MODELS_URL = `${NOUS_API_BASE_URL}/models`;
export const NOUS_OVERVIEW_URL = "https://portal.nousresearch.com/";
export const NOUS_MODELS_PAGE_URL = "https://portal.nousresearch.com/models";
export const NOUS_PLANS_URL = "https://portal.nousresearch.com/manage-subscription";
export const NOUS_DOCS_URL = "https://portal.nousresearch.com/api-docs";

const modelsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().trim().min(1),
      name: z.string().trim().optional(),
      pricing: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
});

export interface NousProviderOptions {
  readonly fetch?: FetchSource;
}

export class NousProvider implements ModelProvider {
  readonly id = "nous";
  readonly name = "Nous Portal";
  readonly doc: ProviderDoc = {
    overview: NOUS_OVERVIEW_URL,
    models: NOUS_MODELS_PAGE_URL,
    pricing: NOUS_PLANS_URL,
    rate_limit: NOUS_DOCS_URL,
  };

  readonly #fetch: FetchSource;

  constructor(options: NousProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const payload = await fetchJson(this.#fetch, NOUS_MODELS_URL, "Nous models", {
      headers: { Accept: "application/json" },
    });
    const parsed = modelsSchema.parse(payload);

    const nousMeta = modelsDev.get(this.id);
    const env = nousMeta?.env && nousMeta.env.length > 0 ? [...nousMeta.env] : ["NOUS_API_KEY"];

    const connection = {
      base_url: NOUS_API_BASE_URL,
      protocol: "openai" as const,
      auth: { env },
    };

    const seen = new Set<string>();
    const offers: DiscoveredOffer[] = [];

    for (const model of parsed.data) {
      if (seen.has(model.id)) {
        throw new Error(`Nous models contains duplicate ID: ${model.id}`);
      }
      seen.add(model.id);

      if (!isFreeNousModel(model.pricing)) {
        continue;
      }

      const modelName =
        typeof model.name === "string" && model.name.trim().length > 0
          ? model.name.trim()
          : desluggifyModelId(model.id);

      offers.push({
        model_id: model.id,
        name: modelName,
        connection,
        limits: nousPublishedLimits(),
        compliance: resolveNousCompliance(model.id),
      });
    }

    return offers.sort((left, right) => compareStrings(left.model_id, right.model_id));
  }
}

export function isFreeNousModel(pricing: Record<string, unknown> | undefined): boolean {
  if (!pricing) return false;
  if (!isFreePrice(pricing.prompt) || !isFreePrice(pricing.completion)) {
    return false;
  }
  for (const [key, value] of Object.entries(pricing)) {
    if (key === "original" || key === "overrides") {
      continue;
    }
    if (!isFreePrice(value)) {
      return false;
    }
  }
  return true;
}

function isFreePrice(value: unknown): boolean {
  if (value === 0) return true;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return false;
    const num = Number(trimmed);
    return !Number.isNaN(num) && num === 0;
  }
  return false;
}
