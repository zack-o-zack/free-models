import type { DiscoveredOffer, JsonValue } from "../catalogue/schema.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchText } from "./source.ts";

export const GROQ_API_BASE_URL = "https://api.groq.com/openai/v1";
export const GROQ_RATE_LIMITS_URL = "https://console.groq.com/docs/rate-limits.md";

const RATE_LIMIT_COLUMNS = ["MODEL ID", "RPM", "RPD", "TPM", "TPD", "ASH", "ASD"] as const;

export interface GroqProviderOptions {
  readonly fetch?: FetchSource;
}

export class GroqProvider implements ModelProvider {
  readonly id = "groq";

  readonly #fetch: FetchSource;

  constructor(options: GroqProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(): Promise<readonly DiscoveredOffer[]> {
    const markdown = await fetchText(this.#fetch, GROQ_RATE_LIMITS_URL, "Groq rate limits", {
      headers: { Accept: "text/markdown,text/plain" },
    });
    return parseGroqFreePlan(markdown).map(({ modelId, rateLimits }) => ({
      model_id: modelId,
      connection: { base_url: GROQ_API_BASE_URL },
      metadata: { rate_limits: rateLimits },
    }));
  }
}

export function parseGroqFreePlan(
  markdown: string,
): { modelId: string; rateLimits: Record<string, JsonValue> }[] {
  const lines = markdown.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) =>
    /^#{1,6}\s+(?:Free Plan Limits|\[Free Plan Limits\]\([^)]*\))\s*$/i.test(line.trim()),
  );
  if (sectionIndex < 0) {
    throw new Error("Groq rate limits documentation has no Free Plan Limits section");
  }

  const remainingLines = lines.slice(sectionIndex + 1);
  const nextSectionIndex = remainingLines.findIndex((line) => /^#{1,6}\s+/.test(line.trim()));
  const sectionLines =
    nextSectionIndex < 0 ? remainingLines : remainingLines.slice(0, nextSectionIndex);
  const headerIndex = sectionLines.findIndex((line) =>
    equalStrings(parseMarkdownRow(line), RATE_LIMIT_COLUMNS),
  );
  if (headerIndex < 0) {
    throw new Error("Groq rate limits documentation has no Free Plan Limits table");
  }

  const offers: { modelId: string; rateLimits: Record<string, JsonValue> }[] = [];
  const seen = new Set<string>();
  for (const line of sectionLines.slice(headerIndex + 1)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ") || (offers.length > 0 && trimmed.length === 0)) {
      break;
    }
    const cells = parseMarkdownRow(line);
    if (cells.length === 0 || isSeparatorRow(cells)) {
      continue;
    }
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

function parseMarkdownRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return [];
  }
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.replace(/\\-/g, "-").replace(/`/g, "").trim());
}

function isSeparatorRow(cells: readonly string[]): boolean {
  return cells.every((cell) => /^:?-+:?$/.test(cell));
}

function equalStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
