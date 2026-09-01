import {
  type DiscoveredOffer,
  type JsonValue,
  jsonObjectSchema,
  type OfferLimits,
} from "../catalogue/schema.ts";
import { formatLimitTerm, parseCompactInteger, termsLimits } from "./limits.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson, fetchText } from "./source.ts";

export const NVIDIA_API_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const NVIDIA_MODELS_URL = "https://api.ngc.nvidia.com/v2/search/catalog/resources/ENDPOINT";
export const NVIDIA_LIMITS_URL = "https://build.nvidia.com/";

const PAGE_SIZE = 100;

export interface NvidiaProviderOptions {
  readonly fetch?: FetchSource;
}

interface NvidiaPage {
  readonly pageCount: number;
  readonly total: number;
  readonly models: NvidiaModel[];
}

interface NvidiaModel {
  readonly modelId: string;
  readonly title: string;
  readonly publisher: string;
  readonly description: string;
}

export class NvidiaProvider implements ModelProvider {
  readonly id = "nvidia";

  readonly #fetch: FetchSource;

  constructor(options: NvidiaProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(): Promise<readonly DiscoveredOffer[]> {
    const [firstPage, limitsHtml] = await Promise.all([
      this.#loadPage(0),
      fetchText(this.#fetch, NVIDIA_LIMITS_URL, "NVIDIA Build limits", {
        headers: { Accept: "text/html,application/xhtml+xml" },
      }),
    ]);
    const limits = parseNvidiaLimits(limitsHtml);
    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.pageCount - 1 }, (_, index) => this.#loadPage(index + 1)),
    );
    const pages = [firstPage, ...remainingPages];
    if (pages.some((page) => page.total !== firstPage.total)) {
      throw new Error("NVIDIA Build catalogue changed while pages were being read");
    }

    const models = pages.flatMap((page) => page.models);
    if (models.length === 0) {
      throw new Error("NVIDIA Build catalogue contains no models labeled Free Endpoint");
    }
    const seen = new Set<string>();
    return models.map((model) => {
      if (seen.has(model.modelId)) {
        throw new Error(`NVIDIA Build catalogue contains duplicate model ID: ${model.modelId}`);
      }
      seen.add(model.modelId);
      return {
        model_id: model.modelId,
        connection: { base_url: NVIDIA_API_BASE_URL },
        limits,
      };
    });
  }

  async #loadPage(page: number): Promise<NvidiaPage> {
    const payload = await fetchJson(this.#fetch, nvidiaModelsUrl(page), "NVIDIA Build catalogue", {
      headers: { Accept: "application/json" },
    });
    return parseNvidiaModelsPage(payload);
  }
}

export function parseNvidiaLimits(html: string): OfferLimits {
  const match =
    /requestsPerMinute\\?":\\?"Up to ([\d,]+) rpm\\?",\\?"requestsPerDay\\?":\\?"([\d,]+) requests per day/.exec(
      html,
    );
  if (!match?.[1] || !match[2]) {
    throw new Error("NVIDIA Build limits page has no recognized request limits");
  }
  return termsLimits(
    formatLimitTerm(parseCompactInteger(match[1], "NVIDIA requests per minute"), "req", "min"),
    formatLimitTerm(parseCompactInteger(match[2], "NVIDIA requests per day"), "req", "day"),
  );
}

export function nvidiaModelsUrl(page: number): string {
  const search = {
    query: 'orgName:"qc69jvmznzxy"',
    page,
    pageSize: PAGE_SIZE,
    scoredSize: PAGE_SIZE,
    groupBy: "resourceType",
    filters: [],
    orderBy: [{ field: "score", value: "DESC" }],
  };
  const url = new URL(NVIDIA_MODELS_URL);
  url.searchParams.set("q", JSON.stringify(search));
  url.searchParams.set("group-labels-by-labelset", "true");
  return url.href;
}

export function parseNvidiaModelsPage(payload: unknown): NvidiaPage {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success) {
    throw new Error("NVIDIA Build catalogue response is malformed: expected a JSON-safe object");
  }
  const pageCount = envelope.data.resultPageTotal;
  const total = envelope.data.resultTotal;
  const groups = envelope.data.results;
  if (
    typeof pageCount !== "number" ||
    !Number.isInteger(pageCount) ||
    pageCount < 1 ||
    typeof total !== "number" ||
    !Number.isInteger(total) ||
    total < 1 ||
    !Array.isArray(groups)
  ) {
    throw new Error("NVIDIA Build catalogue response is malformed: invalid result totals");
  }

  const endpointGroups: Record<string, JsonValue>[] = [];
  for (const candidate of groups) {
    const parsed = jsonObjectSchema.safeParse(candidate);
    if (parsed.success && parsed.data.groupValue === "ENDPOINT") {
      endpointGroups.push(parsed.data);
    }
  }
  const endpointGroup = endpointGroups[0];
  if (endpointGroups.length !== 1 || !endpointGroup || !Array.isArray(endpointGroup.resources)) {
    throw new Error(
      "NVIDIA Build catalogue response is malformed: no unique ENDPOINT result group",
    );
  }

  const candidates: Record<string, JsonValue>[] = [];
  for (const [resourceIndex, resource] of endpointGroup.resources.entries()) {
    const parsed = jsonObjectSchema.safeParse(resource);
    if (!parsed.success) {
      throw new Error(
        `NVIDIA Build catalogue response is malformed: resource ${resourceIndex} is invalid`,
      );
    }
    candidates.push(parsed.data);
  }

  const models: NvidiaModel[] = [];
  for (const candidate of candidates) {
    if (!hasLabel(candidate.labels, "nimType", "Free Endpoint")) {
      continue;
    }
    const publisher = labelValue(candidate.labels, "publisher");
    const name = candidate.name;
    if (!publisher || typeof name !== "string" || name.trim().length === 0) {
      throw new Error("NVIDIA Build Free Endpoint resource has no publisher or model name");
    }
    models.push({
      modelId: `${publisher}/${name}`,
      title:
        typeof candidate.displayName === "string" && candidate.displayName.trim().length > 0
          ? candidate.displayName
          : name,
      publisher,
      description: typeof candidate.description === "string" ? candidate.description : "",
    });
  }
  return { pageCount, total, models };
}

function hasLabel(labels: JsonValue | undefined, key: string, value: string): boolean {
  if (!Array.isArray(labels)) {
    return false;
  }
  return labels.some((candidate) => {
    const label = jsonObjectSchema.safeParse(candidate);
    return (
      label.success &&
      label.data.key === key &&
      Array.isArray(label.data.values) &&
      label.data.values.includes(value)
    );
  });
}

function labelValue(labels: JsonValue | undefined, key: string): string | undefined {
  if (!Array.isArray(labels)) {
    return undefined;
  }
  for (const candidate of labels) {
    const label = jsonObjectSchema.safeParse(candidate);
    const value =
      label.success && Array.isArray(label.data.values) ? label.data.values[0] : undefined;
    if (label.success && label.data.key === key && typeof value === "string") {
      return value;
    }
  }
  return undefined;
}
