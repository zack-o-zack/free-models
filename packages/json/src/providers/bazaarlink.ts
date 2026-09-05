import { desluggifyModelId } from "../catalogue/canonical.ts";
import {
  type DiscoveredOffer,
  type JsonValue,
  jsonObjectSchema,
  type OfferLimits,
  type ProviderDoc,
} from "../catalogue/schema.ts";
import { formatLimitTerm, parseCompactInteger, termsLimits } from "./limits.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import {
  createHtmlRewriter,
  type FetchSource,
  fetchJson,
  fetchText,
  normalizeText,
} from "./source.ts";

export const BAZAARLINK_API_BASE_URL = "https://api.bazaarlink.ai/v1";
export const BAZAARLINK_MODELS_URL = `${BAZAARLINK_API_BASE_URL}/models`;
export const BAZAARLINK_FREE_URL = "https://bazaarlink.ai/free";

// The :free suffix is an optional alias; adding it to a paid model does not
// make it free, so a free offer needs both the suffix and zero pricing.
const BAZAARLINK_FREE_SUFFIX = ":free";
// The auto/auto:free IDs are routing endpoints that select a free model on the
// caller's behalf, not concrete free models of their own.
const BAZAARLINK_ROUTER_IDS = new Set(["auto", "auto:free"]);

const FREE_TIER_HEADING = "Free Tier Limits";
const RPM_LABEL = "Requests per minute";
const RPD_LABEL = "Requests per day";
const NO_CREDIT_LABEL = "Accounts without credit";
const WITH_CREDIT_LABEL = "Accounts with credit";

export interface BazaarLinkProviderOptions {
  readonly fetch?: FetchSource;
}

export class BazaarLinkProvider implements ModelProvider {
  readonly id = "bazaarlink";
  readonly name = "BazaarLink";
  readonly doc: ProviderDoc = {
    models: "https://bazaarlink.ai/en/models",
    overview: "https://bazaarlink.ai/en/docs/api",
    pricing: BAZAARLINK_FREE_URL,
    rate_limit: BAZAARLINK_FREE_URL,
  };

  readonly #fetch: FetchSource;

  constructor(options: BazaarLinkProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const [payload, limitsHtml] = await Promise.all([
      fetchJson(this.#fetch, BAZAARLINK_MODELS_URL, "BazaarLink models", {
        headers: { Accept: "application/json" },
      }),
      fetchText(this.#fetch, BAZAARLINK_FREE_URL, "BazaarLink free tier", {
        headers: { Accept: "text/html,application/xhtml+xml" },
      }),
    ]);
    const limits = await parseBazaarLinkLimits(limitsHtml);

    const bazaarLinkMeta = modelsDev.get(this.id);
    const env =
      bazaarLinkMeta?.env && bazaarLinkMeta.env.length > 0
        ? [...bazaarLinkMeta.env]
        : ["BAZAARLINK_API_KEY"];

    const connection = {
      base_url: BAZAARLINK_API_BASE_URL,
      protocol: "openai",
      auth: { env },
    };

    return parseBazaarLinkModels(payload).map((model) => {
      const modelId = model.id as string;
      const modelName =
        typeof model.name === "string" && model.name.trim().length > 0
          ? model.name.trim()
          : desluggifyModelId(modelId);

      return {
        model_id: modelId,
        name: modelName,
        connection,
        limits,
      };
    });
  }
}

export function parseBazaarLinkModels(payload: unknown): Record<string, JsonValue>[] {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success || envelope.data.object !== "list" || !Array.isArray(envelope.data.data)) {
    throw new Error(
      'BazaarLink models response is malformed: expected object "list" with a data array',
    );
  }

  const seen = new Set<string>();
  const models: Record<string, JsonValue>[] = [];
  for (const [index, candidate] of envelope.data.data.entries()) {
    const parsed = jsonObjectSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        `BazaarLink models response is malformed: model at data.${index} is not a JSON-safe object`,
      );
    }
    const model = parsed.data;
    const modelId = model.id;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      throw new Error(
        `BazaarLink models response is malformed: model at data.${index} has no valid id`,
      );
    }
    if (seen.has(modelId)) {
      throw new Error(`BazaarLink models response contains duplicate model ID: ${modelId}`);
    }
    seen.add(modelId);

    if (BAZAARLINK_ROUTER_IDS.has(modelId)) {
      continue;
    }
    if (isFreeBazaarLinkModel(model)) {
      models.push(model);
    }
  }

  if (models.length === 0) {
    throw new Error("BazaarLink models response contains no free models");
  }
  return models;
}

export function isFreeBazaarLinkModel(model: Record<string, JsonValue>): boolean {
  const modelId = model.id;
  if (typeof modelId !== "string" || !modelId.endsWith(BAZAARLINK_FREE_SUFFIX)) {
    return false;
  }
  const pricing = model.pricing;
  const parsed = jsonObjectSchema.safeParse(pricing);
  if (!parsed.success) {
    return false;
  }
  return isZeroPrice(parsed.data.prompt) && isZeroPrice(parsed.data.completion);
}

function isZeroPrice(value: JsonValue | undefined): boolean {
  if (typeof value === "number") {
    return value === 0;
  }
  if (typeof value === "string") {
    const amount = Number(value.trim());
    return value.trim().length > 0 && Number.isFinite(amount) && amount === 0;
  }
  return false;
}

export async function parseBazaarLinkLimits(html: string): Promise<OfferLimits> {
  const { headingCount, pairs } = await extractLabelValuePairs(html);
  if (headingCount !== 1) {
    throw new Error("BazaarLink free tier page has no unique free tier limits section");
  }

  const valuesByLabel = new Map<string, string>();
  for (const [label, value] of pairs) {
    if (
      label === RPM_LABEL ||
      label === RPD_LABEL ||
      label === NO_CREDIT_LABEL ||
      label === WITH_CREDIT_LABEL
    ) {
      if (valuesByLabel.has(label)) {
        throw new Error(`BazaarLink free tier limits contain a duplicate entry: ${label}`);
      }
      valuesByLabel.set(label, value);
    }
  }

  const missing = [RPM_LABEL, RPD_LABEL, NO_CREDIT_LABEL, WITH_CREDIT_LABEL].filter(
    (label) => !valuesByLabel.has(label),
  );
  if (missing.length > 0) {
    throw new Error(`BazaarLink free tier limits have no ${missing.join(", ")} entry`);
  }

  const rpm = parseRate(valuesByLabel.get(RPM_LABEL) as string, RPM_LABEL, "min");
  const rpd = parseRate(valuesByLabel.get(RPD_LABEL) as string, RPD_LABEL, "day");
  const noCreditMultiplier = parseMultiplier(
    valuesByLabel.get(NO_CREDIT_LABEL) as string,
    NO_CREDIT_LABEL,
  );
  const withCreditMultiplier = parseMultiplier(
    valuesByLabel.get(WITH_CREDIT_LABEL) as string,
    WITH_CREDIT_LABEL,
  );

  return termsLimits(
    formatLimitTerm(rpm, "req", "min"),
    `${formatLimitTerm(multiplyUnits(rpd, noCreditMultiplier, RPD_LABEL), "req", "day")} (no credit)`,
    `${formatLimitTerm(multiplyUnits(rpd, withCreditMultiplier, RPD_LABEL), "req", "day")} (with credit)`,
  );
}

function parseRate(value: string, label: string, expectedPeriod: string): number {
  const match = /^(.+?)\s*\/\s*([A-Za-z]+)$/.exec(value.trim());
  const amount = match?.[1];
  const period = match?.[2];
  if (amount === undefined || period === undefined) {
    throw new Error(`BazaarLink ${label} has an invalid rate: ${value}`);
  }
  if (period.toLowerCase() !== expectedPeriod) {
    throw new Error(`BazaarLink ${label} has an unexpected period: ${value}`);
  }
  return parseCompactInteger(amount, `BazaarLink ${label}`);
}

function parseMultiplier(value: string, label: string): number {
  const match = /^×\s*(.+)$/.exec(value.trim());
  const amount = match?.[1];
  if (amount === undefined) {
    throw new Error(`BazaarLink ${label} has an invalid multiplier: ${value}`);
  }
  return parseCompactInteger(amount, `BazaarLink ${label}`);
}

function multiplyUnits(budget: number, multiplier: number, label: string): number {
  const total = budget * multiplier;
  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new Error(`BazaarLink ${label} has an invalid scaled budget: ${budget} × ${multiplier}`);
  }
  return total;
}

async function extractLabelValuePairs(
  html: string,
): Promise<{ headingCount: number; pairs: [string, string][] }> {
  const pairs: [string, string][] = [];
  let headingCount = 0;
  let pendingLabel: string | undefined;
  let currentText: { text: string; heading: boolean; label: boolean; value: boolean } | undefined;

  try {
    const transformed = createHtmlRewriter()
      .on("h1, h2, h3", {
        element(element) {
          currentText = { text: "", heading: true, label: false, value: false };
          element.onEndTag(() => {
            if (currentText && normalizeText(currentText.text) === FREE_TIER_HEADING) {
              headingCount += 1;
            }
            currentText = undefined;
          });
        },
        text(chunk) {
          if (currentText) {
            currentText.text += chunk.text;
          }
        },
      })
      .on("span", {
        element(element) {
          // Labels render as plain spans while values render as code elements,
          // so any span text is a candidate label for the next code value.
          const outer = currentText;
          currentText = { text: "", heading: false, label: true, value: false };
          element.onEndTag(() => {
            if (currentText) {
              pendingLabel = normalizeText(currentText.text);
            }
            currentText = outer;
          });
        },
        text(chunk) {
          if (currentText) {
            currentText.text += chunk.text;
          }
        },
      })
      .on("code", {
        element(element) {
          const outer = currentText;
          currentText = { text: "", heading: false, label: false, value: true };
          element.onEndTag(() => {
            if (currentText && pendingLabel !== undefined && pendingLabel.length > 0) {
              pairs.push([pendingLabel, normalizeText(currentText.text)]);
            }
            pendingLabel = undefined;
            currentText = outer;
          });
        },
        text(chunk) {
          if (currentText) {
            currentText.text += chunk.text;
          }
        },
      })
      .transform(new Response(html));
    await transformed.text();
  } catch (error) {
    throw new Error("BazaarLink free tier HTML is malformed", { cause: error });
  }

  return { headingCount, pairs };
}
