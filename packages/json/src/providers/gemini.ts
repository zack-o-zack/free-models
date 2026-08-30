import type { DiscoveredOffer, JsonValue } from "../catalogue/schema.ts";
import type { ModelProvider } from "./provider.ts";
import { createHtmlRewriter, type FetchSource, fetchText, normalizeText } from "./source.ts";

export const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
export const GEMINI_PRICING_URL = "https://ai.google.dev/gemini-api/docs/pricing?hl=en";

export interface GeminiProviderOptions {
  readonly fetch?: FetchSource;
}

interface ParsedGeminiSection {
  name: string;
  modelIds: string[];
  standardTable?: string[][];
}

interface FreeGeminiModel {
  readonly modelId: string;
  readonly name: string;
  readonly freeTier: Record<string, JsonValue>;
}

export class GeminiProvider implements ModelProvider {
  readonly id = "gemini";

  readonly #fetch: FetchSource;

  constructor(options: GeminiProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(): Promise<readonly DiscoveredOffer[]> {
    const html = await fetchText(this.#fetch, GEMINI_PRICING_URL, "Gemini API pricing", {
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    return (await parseGeminiPricing(html)).map(({ modelId, name, freeTier }) => ({
      model_id: modelId,
      connection: { base_url: GEMINI_API_BASE_URL },
      metadata: { name, free_tier: freeTier },
    }));
  }
}

export async function parseGeminiPricing(html: string): Promise<FreeGeminiModel[]> {
  const sections: ParsedGeminiSection[] = [];
  let currentSection: ParsedGeminiSection | undefined;
  let currentName = "";
  let currentModelId = "";
  let currentTable: string[][] | undefined;
  let currentRow: string[] | undefined;
  let currentCell = "";

  try {
    const transformed = createHtmlRewriter()
      .on(".models-section", {
        element(element) {
          currentSection = { name: "", modelIds: [] };
          sections.push(currentSection);
          element.onEndTag(() => {
            currentName = "";
            currentModelId = "";
          });
        },
      })
      .on(".models-section h2", {
        element(element) {
          currentName = "";
          element.onEndTag(() => {
            if (currentSection) {
              currentSection.name = normalizeText(currentName);
            }
          });
        },
        text(chunk) {
          currentName += chunk.text;
        },
      })
      .on(".models-section code", {
        element(element) {
          currentModelId = "";
          element.onEndTag(() => {
            const modelId = normalizeText(currentModelId);
            if (currentSection && modelId) {
              currentSection.modelIds.push(modelId);
            }
          });
        },
        text(chunk) {
          currentModelId += chunk.text;
        },
      })
      .on("table.pricing-table", {
        element(element) {
          if (!currentSection || currentSection.standardTable) {
            currentTable = undefined;
            return;
          }
          currentTable = [];
          currentSection.standardTable = currentTable;
          element.onEndTag(() => {
            currentTable = undefined;
          });
        },
      })
      .on("table.pricing-table tr", {
        element(element) {
          if (!currentTable) {
            return;
          }
          currentRow = [];
          currentTable.push(currentRow);
          element.onEndTag(() => {
            currentRow = undefined;
          });
        },
      })
      .on("table.pricing-table th, table.pricing-table td", {
        element(element) {
          if (!currentRow) {
            return;
          }
          currentCell = "";
          element.onEndTag(() => {
            currentRow?.push(normalizeText(currentCell));
          });
        },
        text(chunk) {
          if (currentRow) {
            currentCell += chunk.text;
          }
        },
      })
      .transform(new Response(html));
    await transformed.text();
  } catch (error) {
    throw new Error("Gemini API pricing HTML is malformed", { cause: error });
  }

  const offers: FreeGeminiModel[] = [];
  const seen = new Set<string>();
  for (const section of sections) {
    if (section.modelIds.length === 0) {
      continue;
    }
    if (!section.name || !section.standardTable) {
      throw new Error("Gemini API pricing contains an incomplete model section");
    }
    const freeTier = readFreeTier(section.standardTable);
    if (!isFreeStandardTier(freeTier)) {
      continue;
    }
    for (const modelId of section.modelIds) {
      if (seen.has(modelId)) {
        throw new Error(`Gemini API pricing contains duplicate model ID: ${modelId}`);
      }
      seen.add(modelId);
      offers.push({ modelId, name: section.name, freeTier });
    }
  }
  if (offers.length === 0) {
    throw new Error("Gemini API pricing contains no models with free standard-tier inference");
  }
  return offers;
}

function readFreeTier(table: string[][]): Record<string, JsonValue> {
  const header = table[0];
  const freeColumn = header?.indexOf("Free Tier") ?? -1;
  if (freeColumn < 1) {
    throw new Error("Gemini API standard pricing table has no Free Tier column");
  }
  const freeTier: Record<string, JsonValue> = {};
  for (const row of table.slice(1)) {
    const label = row[0];
    const value = row[freeColumn];
    if (label && value) {
      freeTier[toMetadataKey(label)] = value;
    }
  }
  return freeTier;
}

function isFreeStandardTier(freeTier: Readonly<Record<string, JsonValue>>): boolean {
  const input = freeTier.input_price;
  const outputEntry = Object.entries(freeTier).find(([key]) => key.startsWith("output_price"));
  return input === "Free of charge" && (!outputEntry || outputEntry[1] === "Free of charge");
}

function toMetadataKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
