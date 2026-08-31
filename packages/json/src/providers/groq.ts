import type { DiscoveredOffer, JsonValue } from "../catalogue/schema.ts";
import type { ModelProvider } from "./provider.ts";
import { createHtmlRewriter, type FetchSource, fetchText, normalizeText } from "./source.ts";

export const GROQ_API_BASE_URL = "https://api.groq.com/openai/v1";
export const GROQ_RATE_LIMITS_URL = "https://console.groq.com/docs/rate-limits";

const RATE_LIMIT_COLUMNS = ["MODEL ID", "RPM", "RPD", "TPM", "TPD", "ASH", "ASD"] as const;
// The groq/ namespace holds routing endpoints (compound, ...) that stand in
// front of other providers' models, not concrete free models of their own.
const GROQ_ROUTER_PREFIX = "groq/";

export interface GroqProviderOptions {
  readonly fetch?: FetchSource;
}

interface ParsedButton {
  readonly className: string;
  text: string;
}

interface ParsedTable {
  readonly buttons: ParsedButton[];
  readonly rows: string[][];
}

export class GroqProvider implements ModelProvider {
  readonly id = "groq";

  readonly #fetch: FetchSource;

  constructor(options: GroqProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(): Promise<readonly DiscoveredOffer[]> {
    const html = await fetchText(this.#fetch, GROQ_RATE_LIMITS_URL, "Groq rate limits", {
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    const offers = await parseGroqFreePlan(html);
    return offers
      .filter(({ modelId }) => !modelId.startsWith(GROQ_ROUTER_PREFIX))
      .map(({ modelId }) => ({
        model_id: modelId,
        connection: { base_url: GROQ_API_BASE_URL },
      }));
  }
}

export async function parseGroqFreePlan(
  html: string,
): Promise<{ modelId: string; rateLimits: Record<string, JsonValue> }[]> {
  const tables = await extractTables(html);
  const headerTables = tables
    .map((table, index) => ({
      index,
      table,
      header: table.rows.find((row) => equalStrings(row, RATE_LIMIT_COLUMNS)),
    }))
    .filter(({ header }) => header !== undefined);
  const headerTable = headerTables[0];
  if (headerTables.length !== 1 || !headerTable) {
    throw new Error("Groq rate limits documentation has no unique plan limits table");
  }

  const activePlans = headerTable.table.buttons.filter(({ className }) =>
    className.split(/\s+/).includes("happy"),
  );
  const activePlan = activePlans[0];
  if (activePlans.length !== 1 || !activePlan) {
    throw new Error("Groq rate limits documentation has no unique active plan");
  }
  if (activePlan.text !== "Free Plan Limits") {
    return [];
  }

  const bodyTable = tables[headerTable.index + 1];
  if (!bodyTable) {
    throw new Error("Groq Free Plan Limits table has no body");
  }

  const offers: { modelId: string; rateLimits: Record<string, JsonValue> }[] = [];
  const seen = new Set<string>();
  for (const cells of bodyTable.rows) {
    if (cells.length !== RATE_LIMIT_COLUMNS.length) {
      throw new Error("Groq Free Plan Limits table contains a malformed row");
    }

    const [modelId, ...limits] = cells;
    if (!modelId) {
      throw new Error("Groq Free Plan Limits table contains an empty model ID");
    }
    if (seen.has(modelId)) {
      throw new Error(`Groq Free Plan Limits table contains duplicate model ID: ${modelId}`);
    }
    seen.add(modelId);

    const rateLimits: Record<string, JsonValue> = {};
    for (const [index, value] of limits.entries()) {
      if (value !== "-") {
        rateLimits[RATE_LIMIT_COLUMNS[index + 1]?.toLowerCase() ?? String(index)] = value;
      }
    }
    offers.push({ modelId, rateLimits });
  }

  if (offers.length === 0) {
    throw new Error("Groq Free Plan Limits table contains no models");
  }
  return offers;
}

async function extractTables(html: string): Promise<ParsedTable[]> {
  const tables: ParsedTable[] = [];
  let currentTable: ParsedTable | undefined;
  let currentRow: string[] | undefined;
  let currentCell: { text: string } | undefined;
  let currentButton: ParsedButton | undefined;

  try {
    const transformed = createHtmlRewriter()
      .on("table", {
        element(element) {
          currentTable = { buttons: [], rows: [] };
          tables.push(currentTable);
          element.onEndTag(() => {
            currentTable = undefined;
          });
        },
      })
      .on("tr", {
        element(element) {
          if (!currentTable) {
            return;
          }
          currentRow = [];
          currentTable.rows.push(currentRow);
          element.onEndTag(() => {
            currentRow = undefined;
          });
        },
      })
      .on("th, td", {
        element(element) {
          if (!currentRow) {
            return;
          }
          currentCell = { text: "" };
          element.onEndTag(() => {
            if (currentRow && currentCell) {
              currentRow.push(normalizeText(currentCell.text));
            }
            currentCell = undefined;
          });
        },
        text(chunk) {
          if (currentCell) {
            currentCell.text += chunk.text;
          }
        },
      })
      .on("button", {
        element(element) {
          if (!currentTable) {
            return;
          }
          currentButton = { className: element.getAttribute("class") ?? "", text: "" };
          currentTable.buttons.push(currentButton);
          element.onEndTag(() => {
            if (currentButton) {
              currentButton.text = normalizeText(currentButton.text);
            }
            currentButton = undefined;
          });
        },
        text(chunk) {
          if (currentButton) {
            currentButton.text += chunk.text;
          }
        },
      })
      .transform(new Response(html));
    await transformed.text();
  } catch (error) {
    throw new Error("Groq rate limits HTML is malformed", { cause: error });
  }

  return tables;
}

function equalStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
