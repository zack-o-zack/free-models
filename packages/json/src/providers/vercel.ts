import { z } from "zod";
import type { DiscoveredOffer, ProviderDoc } from "../catalogue/schema.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson } from "./source.ts";

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
    const payload = await fetchJson(this.#fetch, VERCEL_MODELS_URL, "Vercel AI Gateway models");
    const models = modelsSchema.parse(payload);
    const seen = new Set<string>();
    return models.data
      .filter((model) => {
        if (seen.has(model.id)) throw new Error(`Vercel models contains duplicate ID: ${model.id}`);
        seen.add(model.id);
        // Evaluation, image, and embedding endpoints are not OpenAI chat completions.
        if (model.type !== "language" || !model.pricing) return false;
        const { input, output, ...extra } = model.pricing;
        return (
          isZeroPrice(input) &&
          isZeroPrice(output) &&
          Object.entries(extra).every(([key, value]) =>
            key === "varies_by_provider" ? value === false : isZeroPrice(value),
          )
        );
      })
      .map((model) => ({
        model_id: model.id,
        name: model.name,
        connection: {
          base_url: VERCEL_API_BASE_URL,
          protocol: "openai",
          auth: { env: ["AI_GATEWAY_API_KEY"] },
        },
        limits: {
          terms: ["Rate limits vary by model and account; check the Vercel AI Gateway dashboard"],
        },
      }));
  }
}

function isZeroPrice(value: unknown): boolean {
  const parsed = priceSchema.safeParse(value);
  return (
    parsed.success &&
    (typeof parsed.data === "number" ? parsed.data === 0 : /^0(?:\.0+)?$/.test(parsed.data))
  );
}
