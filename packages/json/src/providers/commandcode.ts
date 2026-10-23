import { desluggifyModelId } from "../catalogue/canonical.ts";
import { compareStrings } from "../catalogue/files.ts";
import {
  type DiscoveredOffer,
  type JsonValue,
  jsonObjectSchema,
  type OfferLimits,
  type ProviderDoc,
} from "../catalogue/schema.ts";
import { formatLimitTerm, termsLimits } from "./limits.ts";
import type { ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";
import { type FetchSource, fetchJson, fetchText } from "./source.ts";

export const COMMANDCODE_API_BASE_URL = "https://api.commandcode.ai/provider/v1";
export const COMMANDCODE_MODELS_URL = `${COMMANDCODE_API_BASE_URL}/models`;
export const COMMANDCODE_MODELS_CATALOG_URL = "https://commandcode.ai/models";
export const COMMANDCODE_OVERVIEW_URL = "https://commandcode.ai/docs/provider";
export const COMMANDCODE_PRICING_URL = "https://commandcode.ai/docs/resources/pricing-limits";
export const COMMANDCODE_RATE_LIMIT_URL = "https://commandcode.ai/docs/resources/usage-limits";

const COMMANDCODE_FREE_SUFFIXES = [":free", "-free"] as const;

export interface CommandCodeProviderOptions {
  readonly fetch?: FetchSource;
}

export class CommandCodeProvider implements ModelProvider {
  readonly id = "commandcode";
  readonly name = "CommandCode";
  readonly doc: ProviderDoc = {
    overview: COMMANDCODE_OVERVIEW_URL,
    models: COMMANDCODE_MODELS_CATALOG_URL,
    pricing: COMMANDCODE_PRICING_URL,
    rate_limit: COMMANDCODE_RATE_LIMIT_URL,
  };

  readonly #fetch: FetchSource;

  constructor(options: CommandCodeProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
  }

  async discover(modelsDev: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const [payload, pricingHtml] = await Promise.all([
      fetchJson(this.#fetch, COMMANDCODE_MODELS_URL, "CommandCode models", {
        headers: { Accept: "application/json" },
      }),
      fetchText(this.#fetch, COMMANDCODE_PRICING_URL, "CommandCode pricing", {
        headers: { Accept: "text/html,application/xhtml+xml" },
      }),
    ]);

    const deals = parseCommandCodeDeals(pricingHtml);

    const commandCodeMeta = modelsDev.get(this.id);
    const env =
      commandCodeMeta?.env && commandCodeMeta.env.length > 0
        ? [...commandCodeMeta.env]
        : ["CMD_API_KEY"];

    const connection = {
      base_url: COMMANDCODE_API_BASE_URL,
      protocol: "openai",
      auth: { env },
    };

    return parseCommandCodeModels(payload)
      .map((model) => {
        const modelId = model.id as string;
        const modelName =
          typeof model.name === "string" && model.name.trim().length > 0
            ? model.name.trim()
            : desluggifyModelId(modelId);

        return {
          model_id: modelId,
          name: modelName,
          connection,
          limits: matchCommandCodeLimits(modelId, deals),
        };
      })
      .sort((left, right) => compareStrings(left.model_id, right.model_id));
  }
}

export function parseCommandCodeModels(payload: unknown): Record<string, JsonValue>[] {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success || envelope.data.object !== "list" || !Array.isArray(envelope.data.data)) {
    throw new Error(
      'CommandCode models response is malformed: expected object "list" with a data array',
    );
  }

  const seen = new Set<string>();
  const models: Record<string, JsonValue>[] = [];
  for (const [index, candidate] of envelope.data.data.entries()) {
    const parsed = jsonObjectSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        `CommandCode models response is malformed: model at data.${index} is not a JSON-safe object`,
      );
    }
    const model = parsed.data;
    const modelId = model.id;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      throw new Error(
        `CommandCode models response is malformed: model at data.${index} has no valid id`,
      );
    }
    if (seen.has(modelId)) {
      throw new Error(`CommandCode models response contains duplicate model ID: ${modelId}`);
    }
    seen.add(modelId);

    if (isFreeCommandCodeModel(modelId)) {
      models.push(model);
    }
  }

  if (models.length === 0) {
    throw new Error("CommandCode models response contains no free models");
  }
  return models;
}

export function isFreeCommandCodeModel(modelId: string): boolean {
  if (typeof modelId !== "string") {
    return false;
  }
  const trimmed = modelId.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return COMMANDCODE_FREE_SUFFIXES.some((suffix) => trimmed.endsWith(suffix));
}

export function parseCommandCodeDeals(html: string): Map<string, OfferLimits> {
  const deals = new Map<string, OfferLimits>();
  const articles = html.match(/<article id="[^"]*"[^>]*>[\s\S]*?<\/article>/g) ?? [];
  for (const article of articles) {
    const is100Percent = /100%|100<!-- -->%/i.test(article);
    if (!is100Percent) continue;

    const modelMatch = article.match(/<code[^>]*>([^<]+)<\/code>/i);
    const rawPicked = modelMatch?.[1];
    if (!rawPicked) continue;
    const pickedModel = rawPicked.trim();

    const termMatch = article.match(/<dt[^>]*>[\s\S]*?Term<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/i);
    const term = termMatch?.[1]?.trim() || "while capacity lasts";

    const dailyReqMatch = article.match(/(\d+)\s+requests\s+a\s+day/i);
    const dailyCount = dailyReqMatch?.[1];
    if (dailyCount) {
      deals.set(pickedModel, termsLimits(formatLimitTerm(Number(dailyCount), "req", "day")));
    } else {
      deals.set(pickedModel, termsLimits(`No daily request limit (${term})`));
    }
  }
  return deals;
}

export function matchCommandCodeLimits(
  modelId: string,
  deals: ReadonlyMap<string, OfferLimits>,
): OfferLimits {
  const directMatch = deals.get(modelId);
  if (directMatch) {
    return directMatch;
  }
  const suffix = modelId.includes("/") ? modelId.split("/")[1] : modelId;
  if (suffix) {
    const suffixMatch = deals.get(suffix);
    if (suffixMatch) {
      return suffixMatch;
    }
  }
  for (const [key, limits] of deals) {
    if (modelId.endsWith(key) || key.endsWith(modelId)) {
      return limits;
    }
  }
  return termsLimits("No daily request limit (while capacity lasts)");
}
