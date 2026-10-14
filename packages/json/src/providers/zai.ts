import type { DiscoveredOffer, ProviderDoc } from "../catalogue/schema.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchText } from "./source.ts";

export const ZAI_PRICING_URL = "https://docs.z.ai/guides/overview/pricing";
export const ZAI_API_BASE_URL = "https://api.z.ai/api/paas/v4";
const PRICING_HEADERS = ["Model", "Input", "Cached Input", "Cached Input Storage", "Output"];

export class ZaiProvider implements ModelProvider {
  readonly id = "z-ai";
  readonly name = "Z.ai";
  readonly doc: ProviderDoc = {
    overview: "https://docs.z.ai/guides/overview/quick-start",
    pricing: ZAI_PRICING_URL,
  };
  readonly #fetch: FetchSource;

  constructor(options: { readonly fetch?: FetchSource } = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(_modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const markdown = await fetchText(this.#fetch, `${ZAI_PRICING_URL}.md`, "Z.ai pricing");
    return parseZaiPricing(markdown).map((name) => ({
      model_id: name.toLowerCase(),
      name,
      connection: {
        base_url: ZAI_API_BASE_URL,
        protocol: "openai",
        auth: { env: ["ZAI_API_KEY"] },
      },
      limits: { terms: ["Rate limits vary by account; check the Z.ai console"] },
    }));
  }
}

export function parseZaiPricing(markdown: string): string[] {
  let inPricingTable = false;
  let tables = 0;
  const seen = new Set<string>();
  const freeModels: string[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      inPricingTable = false;
      continue;
    }
    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    if (cells[0] === "Model") {
      inPricingTable =
        PRICING_HEADERS.every((header, index) => cells[index] === header) &&
        cells.length === PRICING_HEADERS.length;
      if (inPricingTable) tables++;
      continue;
    }
    if (!inPricingTable || cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    const name = cells[0];
    if (cells.length !== PRICING_HEADERS.length || !name || cells.some((cell) => !cell)) {
      throw new Error("Z.ai pricing contains a malformed model row");
    }
    const id = name.toLowerCase();
    if (seen.has(id)) throw new Error(`Z.ai pricing contains duplicate model ID: ${id}`);
    seen.add(id);
    // Free cache storage alone does not make inference free.
    if (cells.slice(1).every((cell) => cell === "Free")) {
      if (!/^GLM-[a-z0-9.-]+$/i.test(name)) {
        throw new Error(`Z.ai pricing contains an unrecognized free model ID: ${name}`);
      }
      freeModels.push(name);
    }
  }
  if (tables === 0) throw new Error("Z.ai pricing contains no recognized token pricing tables");
  return freeModels.sort();
}
