import type { DiscoveredOffer, JsonValue } from "../catalogue/schema.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchText, normalizeText } from "./source.ts";

export const CLOUDFLARE_WORKERS_AI_BASE_URL =
  "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run";
export const CLOUDFLARE_WORKERS_AI_PRICING_URL =
  "https://developers.cloudflare.com/workers-ai/platform/pricing/index.md";

export interface CloudflareProviderOptions {
  readonly fetch?: FetchSource;
}

interface CloudflareModel {
  readonly modelId: string;
  readonly category: string;
  readonly pricing: Record<string, JsonValue>;
}

interface CloudflarePricing {
  readonly freeAllocation: string;
  readonly models: CloudflareModel[];
}

export class CloudflareProvider implements ModelProvider {
  readonly id = "cloudflare";

  readonly #fetch: FetchSource;

  constructor(options: CloudflareProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(): Promise<readonly DiscoveredOffer[]> {
    const markdown = await fetchText(
      this.#fetch,
      CLOUDFLARE_WORKERS_AI_PRICING_URL,
      "Cloudflare Workers AI pricing",
      { headers: { Accept: "text/markdown,text/plain" } },
    );
    const { models } = parseCloudflarePricing(markdown);
    return models.map(({ modelId }) => ({
      model_id: modelId,
      connection: { base_url: CLOUDFLARE_WORKERS_AI_BASE_URL },
    }));
  }
}

export function parseCloudflarePricing(markdown: string): CloudflarePricing {
  const freeAllocation = parseFreeAllocation(markdown);

  const paidParagraph = markdown
    .split(/\r?\n/)
    .find((line) => line.startsWith("Some models require a paid billing method."));
  if (!paidParagraph) {
    throw new Error("Cloudflare Workers AI pricing has no paid-only model declaration");
  }
  const paidOnly = new Set(
    [...paidParagraph.matchAll(/`(@cf\/[^`]+)`/g)].map((match) => match[1] as string),
  );
  if (paidOnly.size === 0) {
    throw new Error("Cloudflare Workers AI paid-only model declaration contains no model IDs");
  }

  let category = "";
  let headers: string[] = [];
  const models: CloudflareModel[] = [];
  const seen = new Set<string>();
  const lines = markdown.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const heading = /^## (.+ model pricing)$/.exec(line.trim());
    if (heading) {
      category = heading[1] as string;
      headers = [];
      continue;
    }
    if (!category) {
      continue;
    }

    const cells = parseMarkdownRow(line);
    if (cells.length === 0) {
      continue;
    }
    if (cells[0] === "Model") {
      headers = cells;
      continue;
    }
    if (isSeparatorRow(cells)) {
      continue;
    }
    const modelId = cells[0];
    if (!modelId?.startsWith("@cf/")) {
      continue;
    }
    if (headers.length === 0 || cells.length !== headers.length) {
      throw new Error(`Cloudflare Workers AI pricing row ${index + 1} is malformed`);
    }
    if (seen.has(modelId)) {
      throw new Error(`Cloudflare Workers AI pricing contains duplicate model ID: ${modelId}`);
    }
    seen.add(modelId);
    if (paidOnly.has(modelId)) {
      continue;
    }

    const pricing: Record<string, JsonValue> = {};
    for (let column = 1; column < headers.length; column += 1) {
      const key = toMetadataKey(headers[column] as string);
      pricing[key] = cells[column] as string;
    }
    models.push({ modelId, category, pricing });
  }

  if (models.length === 0) {
    throw new Error("Cloudflare Workers AI pricing contains no free-allocation models");
  }
  return { freeAllocation, models };
}

function parseFreeAllocation(markdown: string): string {
  const matches = [...markdown.matchAll(/\*\*((([1-9][\d,]*) Neurons per day) at no charge)\*\*/g)];
  if (matches.length !== 1) {
    throw new Error("Cloudflare Workers AI pricing has no unique recognized free daily allocation");
  }
  const allocation = matches[0]?.[2];
  const amount = matches[0]?.[3];
  if (
    !allocation ||
    !amount ||
    !/^(?:[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)$/.test(amount) ||
    Number(amount.replaceAll(",", "")) <= 0
  ) {
    throw new Error("Cloudflare Workers AI pricing has an invalid free daily allocation");
  }
  return allocation;
}

function parseMarkdownRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return [];
  }
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => normalizeText(cell.replace(/`/g, "")));
}

function isSeparatorRow(cells: readonly string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function toMetadataKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
