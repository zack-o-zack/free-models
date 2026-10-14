import { desluggifyModelId } from "../catalogue/canonical.ts";
import type { DiscoveredOffer, ProviderDoc } from "../catalogue/schema.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { createHtmlRewriter, type FetchSource, fetchText, normalizeText } from "./source.ts";

export const ANYAPI_MODELS_URL = "https://anyapi.ai/ai-models";
export const ANYAPI_BASE_URL = "https://api.anyapi.ai/v1";

interface ModelCard {
  name: string;
  tier: string;
  href: string;
}

export class AnyApiProvider implements ModelProvider {
  readonly id = "anyapi";
  readonly name = "AnyAPI";
  readonly doc: ProviderDoc = {
    overview: "https://docs.anyapi.ai",
    models: ANYAPI_MODELS_URL,
    pricing: "https://anyapi.ai/pricing",
    rate_limit: "https://docs.anyapi.ai/get-started/faq",
  };
  readonly #fetch: FetchSource;

  constructor(options: { readonly fetch?: FetchSource } = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(_modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const cards: ModelCard[] = [];
    const visited = new Set<string>();
    let url: string | undefined = ANYAPI_MODELS_URL;
    while (url) {
      if (visited.has(url) || visited.size >= 50) {
        throw new Error("AnyAPI catalogue pagination repeats or exceeds 50 pages");
      }
      visited.add(url);
      const page = await parseAnyApiCatalogue(await fetchText(this.#fetch, url, "AnyAPI models"));
      cards.push(...page.models);
      url = page.next ? catalogueUrl(page.next, url, true) : undefined;
    }

    const offers: DiscoveredOffer[] = [];
    const seen = new Set<string>();
    for (const card of cards) {
      const detailUrl = catalogueUrl(card.href, ANYAPI_MODELS_URL, false);
      const html = await fetchText(this.#fetch, detailUrl, "AnyAPI model details");
      const modelId = await parseAnyApiModelId(html);
      if (seen.has(modelId)) throw new Error(`AnyAPI contains duplicate model ID: ${modelId}`);
      seen.add(modelId);
      offers.push({
        model_id: modelId,
        // Catalogue labels can be stale; use the published API identity for the name too.
        name: desluggifyModelId(modelId),
        connection: {
          base_url: ANYAPI_BASE_URL,
          protocol: "openai",
          auth: { env: ["ANYAPI_KEY"] },
        },
        // ANY Tokens are provider credits, not a model-token quota.
        limits: { terms: ["100k ANY Tokens / day", "Limited API calls (Free plan)"] },
      });
    }
    return offers.sort((left, right) => left.model_id.localeCompare(right.model_id));
  }
}

export async function parseAnyApiCatalogue(html: string): Promise<{
  models: ModelCard[];
  next: string | undefined;
}> {
  const cards: ModelCard[] = [];
  let card: ModelCard | undefined;
  let next: string | undefined;
  await createHtmlRewriter()
    .on(".ailist_card", {
      element(element) {
        card = { name: "", tier: "", href: "" };
        cards.push(card);
        element.onEndTag(() => {
          card = undefined;
        });
      },
    })
    .on('.ailist_card [fs-list-field="tier"]', {
      text(chunk) {
        if (card) card.tier += chunk.text;
      },
    })
    .on('.ailist_card a[fs-list-field="name"]', {
      element(element) {
        if (card) card.href = element.getAttribute("href") ?? "";
      },
      text(chunk) {
        if (card) card.name += chunk.text;
      },
    })
    .on("a.w-pagination-next", {
      element(element) {
        if (next) throw new Error("AnyAPI catalogue has multiple next-page links");
        next = element.getAttribute("href") ?? undefined;
      },
    })
    .transform(new Response(html))
    .text();
  if (cards.length === 0) throw new Error("AnyAPI catalogue contains no model cards");
  for (const item of cards) {
    item.name = normalizeText(item.name);
    item.tier = normalizeText(item.tier);
    if (!item.name || !item.href) throw new Error("AnyAPI catalogue contains an incomplete card");
  }
  return { models: cards.filter((item) => item.tier === "Free"), next };
}

export async function parseAnyApiModelId(html: string): Promise<string> {
  const ids: string[] = [];
  let text = "";
  await createHtmlRewriter()
    .on(".model_ctas-id", {
      element(element) {
        text = "";
        element.onEndTag(() => {
          ids.push(normalizeText(text));
        });
      },
      text(chunk) {
        text += chunk.text;
      },
    })
    .transform(new Response(html))
    .text();
  if (ids.length !== 1 || !/^[a-z0-9._-]+\/[a-z0-9._:-]+$/i.test(ids[0] ?? "")) {
    throw new Error("AnyAPI model details contain no unique valid model ID");
  }
  return ids[0] as string;
}

function catalogueUrl(href: string, base: string, pagination: boolean): string {
  const url = new URL(href, base);
  if (
    url.origin !== "https://anyapi.ai" ||
    (pagination ? url.pathname !== "/ai-models" : !url.pathname.startsWith("/ai-models/"))
  ) {
    throw new Error("AnyAPI catalogue contains an unexpected URL");
  }
  return url.href;
}
