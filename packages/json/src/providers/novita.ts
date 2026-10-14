import { z } from "zod";
import type { DiscoveredOffer, ProviderDoc } from "../catalogue/schema.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { createHtmlRewriter, type FetchSource, fetchJson, fetchText } from "./source.ts";

export const NOVITA_API_BASE_URL = "https://api.novita.ai/openai";
export const NOVITA_MODELS_URL = `${NOVITA_API_BASE_URL}/v1/models`;
export const NOVITA_PRICING_URL = "https://novita.ai/pricing";

const modelsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().trim().min(1),
      display_name: z.string().trim().min(1),
      status: z.number(),
      model_type: z.string(),
      input_token_price_per_m: z.number().nonnegative().optional(),
      output_token_price_per_m: z.number().nonnegative().optional(),
      is_tiered_billing: z.boolean().optional(),
    }),
  ),
});

export class NovitaProvider implements ModelProvider {
  readonly id = "novita";
  readonly name = "Novita AI";
  readonly doc: ProviderDoc = {
    overview: "https://novita.ai/",
    models: NOVITA_MODELS_URL,
    pricing: NOVITA_PRICING_URL,
  };
  readonly #fetch: FetchSource;

  constructor(options: { readonly fetch?: FetchSource } = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(_modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const [payload, html] = await Promise.all([
      fetchJson(this.#fetch, NOVITA_MODELS_URL, "Novita models"),
      fetchText(this.#fetch, NOVITA_PRICING_URL, "Novita pricing"),
    ]);
    const models = modelsSchema.parse(payload);
    const listed = new Set<string>();
    await createHtmlRewriter()
      .on('a[href^="/models/model-detail/"]', {
        element(element) {
          const href = element.getAttribute("href");
          if (href) listed.add(new URL(href, NOVITA_PRICING_URL).pathname.split("/").pop() ?? "");
        },
      })
      .transform(new Response(html))
      .text();
    if (!listed.size) throw new Error("Novita pricing contains no model links");
    const seen = new Set<string>();
    return models.data
      .filter((model) => {
        if (seen.has(model.id)) throw new Error(`Novita models contains duplicate ID: ${model.id}`);
        seen.add(model.id);
        // Public listings exclude internal API entries with placeholder zero prices.
        return (
          listed.has(model.id.replaceAll("/", "-")) &&
          model.status === 1 &&
          model.model_type === "chat" &&
          model.is_tiered_billing === false &&
          model.input_token_price_per_m === 0 &&
          model.output_token_price_per_m === 0
        );
      })
      .map((model) => ({
        model_id: model.id,
        name: model.display_name,
        connection: {
          base_url: NOVITA_API_BASE_URL,
          protocol: "openai",
          auth: { env: ["NOVITA_API_KEY"] },
        },
        limits: { terms: ["Rate limits vary by model and account; check the Novita console"] },
      }));
  }
}
