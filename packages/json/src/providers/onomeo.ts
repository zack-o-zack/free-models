import { z } from "zod";
import { desluggifyModelId } from "../catalogue/canonical.ts";
import { compareStrings } from "../catalogue/files.ts";
import type { DiscoveredOffer, ProviderDoc } from "../catalogue/schema.ts";
import { onomeoPublishedLimits } from "./limits.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import { resolveOnomeoCompliance } from "./onomeo-policies.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson } from "./source.ts";

export const ONOMEO_API_BASE_URL = "https://onomeo.com/v1";
export const ONOMEO_MODELS_URL = "https://onomeo.com/models";
export const ONOMEO_INFO_URL = "https://onomeo.com/api/info";
export const ONOMEO_PRICING_URL = "https://onomeo.com/models#pricing";
export const ONOMEO_RATE_LIMIT_URL = "https://onomeo.com/integrations#billing";
export const ONOMEO_OVERVIEW_URL = "https://onomeo.com";

// "auto" is an alias endpoint routing to a selected free model, not a concrete model.
export const ONOMEO_ROUTER_IDS = new Set(["auto"]);

const onomeoInfoSchema = z.object({
  freeModels: z.array(z.string().trim().min(1)),
});

export interface OnomeoProviderOptions {
  readonly fetch?: FetchSource;
}

export class OnomeoProvider implements ModelProvider {
  readonly id = "onomeo";
  readonly name = "Onomeo";
  readonly doc: ProviderDoc = {
    overview: ONOMEO_OVERVIEW_URL,
    models: ONOMEO_MODELS_URL,
    pricing: ONOMEO_PRICING_URL,
    rate_limit: ONOMEO_RATE_LIMIT_URL,
  };

  readonly #fetch: FetchSource;

  constructor(options: OnomeoProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const payload = await fetchJson(this.#fetch, ONOMEO_INFO_URL, "Onomeo info", {
      headers: { Accept: "application/json" },
    });
    const parsed = onomeoInfoSchema.parse(payload);

    const onomeoMeta = modelsDev.get(this.id);
    const env =
      onomeoMeta?.env && onomeoMeta.env.length > 0 ? [...onomeoMeta.env] : ["ONOMEO_API_KEY"];

    const connection = {
      base_url: ONOMEO_API_BASE_URL,
      protocol: "openai" as const,
      auth: { env },
    };

    const seen = new Set<string>();
    const offers: DiscoveredOffer[] = [];

    for (const modelId of parsed.freeModels) {
      if (seen.has(modelId)) {
        throw new Error(`Onomeo info response contains duplicate model ID: ${modelId}`);
      }
      seen.add(modelId);

      if (isFreeOnomeoModel(modelId)) {
        offers.push({
          model_id: modelId,
          name: desluggifyModelId(modelId),
          connection,
          limits: onomeoPublishedLimits(),
          compliance: resolveOnomeoCompliance(modelId),
        });
      }
    }

    if (offers.length === 0) {
      throw new Error("Onomeo info response contains no free models");
    }

    return offers.sort((left, right) => compareStrings(left.model_id, right.model_id));
  }
}

export function isFreeOnomeoModel(id: string): boolean {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  if (trimmed.length === 0) return false;
  return !ONOMEO_ROUTER_IDS.has(trimmed);
}
