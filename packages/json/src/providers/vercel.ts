import { z } from "zod";
import type { DiscoveredOffer, ProviderDoc } from "../catalogue/schema.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson, fetchText } from "./source.ts";

import { parseVercelCatalogue } from "./vercel-catalogue.ts";
import { resolveVercelCompliance } from "./vercel-policies.ts";

export const VERCEL_CATALOGUE_URL = "https://vercel.com/ai-gateway/models?freeTier=true";
export const VERCEL_API_BASE_URL = "https://ai-gateway.vercel.sh/v1";
export const VERCEL_MODELS_URL = `${VERCEL_API_BASE_URL}/models`;
export const VERCEL_PRICING_URL = "https://vercel.com/docs/ai-gateway/pricing";
const priceSchema = z.union([z.string(), z.number()]);
const modelsSchema = z.object({
  object: z.literal("list"),
  data: z.array(
    z.object({
      id: z.string().trim().min(1),
      name: z.string().trim().min(1),
      type: z.string(),
      pricing: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
});

export class VercelProvider implements ModelProvider {
  readonly id = "vercel";
  readonly name = "Vercel AI Gateway";
  readonly doc: ProviderDoc = {
    overview: "https://vercel.com/docs/ai-gateway",
    models: "https://vercel.com/ai-gateway/models",
    pricing: VERCEL_PRICING_URL,
    rate_limit: "https://vercel.com/docs/ai-gateway/limits",
  };
  readonly #fetch: FetchSource;

  constructor(options: { readonly fetch?: FetchSource } = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(_modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const [payload, html] = await Promise.all([
      fetchJson(this.#fetch, VERCEL_MODELS_URL, "Vercel AI Gateway models"),
      fetchText(this.#fetch, VERCEL_CATALOGUE_URL, "Vercel model eligibility"),
    ]);
    const models = modelsSchema.parse(payload);
    const seen = new Set<string>();
    const zeroPriceIds = new Set<string>();
    for (const model of models.data) {
      if (seen.has(model.id)) throw new Error(`Vercel models contains duplicate ID: ${model.id}`);
      seen.add(model.id);
      if (!model.pricing) continue;
      const { input, output, ...extra } = model.pricing;
      if (
        isZeroPrice(input) &&
        isZeroPrice(output) &&
        Object.entries(extra).every(([key, value]) =>
          key === "varies_by_provider" ? value === false : isZeroPrice(value),
        )
      )
        zeroPriceIds.add(model.id);
    }
    const catalogue = await parseVercelCatalogue(html);
    return catalogue
      .filter((model) => model.availableToFreeTier || zeroPriceIds.has(model.copyString))
      .map((model) => {
        const noCredits = zeroPriceIds.has(model.copyString);
        const funding = noCredits ? ("no_credits" as const) : ("monthly_credits" as const);
        const compliance = resolveVercelCompliance({
          modelId: model.copyString,
          funding,
        });
        return {
          model_id: model.copyString,
          name: model.displayName,
          connection: {
            base_url: model.type === "chat" ? VERCEL_API_BASE_URL : "https://ai-gateway.vercel.sh",
            protocol: model.type === "chat" ? "openai" : "vercel-ai-gateway",
            auth: { env: ["AI_GATEWAY_API_KEY"] },
            ...(model.type === "chat" ? {} : { model_type: model.type }),
          },
          limits: {
            funding: noCredits ? ("no_credits" as const) : ("monthly_credits" as const),
            terms: noCredits ? ["Free — no credits used"] : ["Free with $5 monthly credits"],
          },
          ...(compliance ? { compliance } : {}),
        };
      });
  }
}

function isZeroPrice(value: unknown): boolean {
  const parsed = priceSchema.safeParse(value);
  return (
    parsed.success &&
    (typeof parsed.data === "number" ? parsed.data === 0 : /^0(?:\.0+)?$/.test(parsed.data))
  );
}
