import type { Compliance } from "../catalogue/schema.ts";

export interface AuditedCreatorInfo {
  readonly countries: readonly string[];
  readonly subprocessors?: readonly string[] | undefined;
}

/**
 * Audited creator residency and subprocessor mapping for Vercel AI Gateway upstream providers.
 * Vercel AI Gateway routes requests to upstream inference providers (e.g. OpenAI, Anthropic, Google, DeepSeek, etc.).
 * Even on Vercel's US/EU edge, upstream inference executes in the upstream provider's datacenters.
 */
export const VERCEL_UPSTREAM_PROVIDER_COUNTRIES: Readonly<Record<string, AuditedCreatorInfo>> = {
  openai: { countries: ["US"], subprocessors: ["openai"] },
  anthropic: { countries: ["US"], subprocessors: ["anthropic"] },
  google: { countries: ["US"], subprocessors: ["google"] },
  deepseek: { countries: ["US", "CN"], subprocessors: ["deepseek"] },
  meta: { countries: ["US"], subprocessors: ["meta"] },
  mistral: { countries: ["EU", "FR"], subprocessors: ["mistral"] },
  cohere: { countries: ["US", "CA"], subprocessors: ["cohere"] },
  groq: { countries: ["US"], subprocessors: ["groq"] },
  together: { countries: ["US"], subprocessors: ["together"] },
  fireworks: { countries: ["US"], subprocessors: ["fireworks"] },
  replicate: { countries: ["US"], subprocessors: ["replicate"] },
  perplexity: { countries: ["US"], subprocessors: ["perplexity"] },
  xai: { countries: ["US"], subprocessors: ["xai"] },
  alibaba: { countries: ["US", "CN"], subprocessors: ["alibaba"] },
  qwen: { countries: ["US", "CN"], subprocessors: ["qwen"] },
  moonshot: { countries: ["US", "CN"], subprocessors: ["moonshot"] },
  zhipu: { countries: ["US", "CN"], subprocessors: ["zhipu"] },
  baichuan: { countries: ["US", "CN"], subprocessors: ["baichuan"] },
  yi: { countries: ["US", "CN"], subprocessors: ["01-ai"] },
  internlm: { countries: ["US", "CN"], subprocessors: ["internlm"] },
  amazon: { countries: ["US", "EU"], subprocessors: ["aws"] },
  microsoft: { countries: ["US", "EU"], subprocessors: ["azure"] },
  cerebras: { countries: ["US"], subprocessors: ["cerebras"] },
  sambanova: { countries: ["US"], subprocessors: ["sambanova"] },
  novita: { countries: ["US"], subprocessors: ["novita"] },
  baseten: { countries: ["US"], subprocessors: ["baseten"] },
  ai21: { countries: ["US"], subprocessors: ["ai21"] },
  upstage: { countries: ["US", "KR"], subprocessors: ["upstage"] },
  cohere_aws: { countries: ["US"], subprocessors: ["cohere", "aws"] },
  "deepseek-ai": { countries: ["US", "CN"], subprocessors: ["deepseek"] },
  "meta-llama": { countries: ["US"], subprocessors: ["meta"] },
  poolside: { countries: ["US", "EU"], subprocessors: ["poolside"] },
  minimax: { countries: ["US", "CN"], subprocessors: ["minimax"] },
};

export function resolveVercelCompliance(params: {
  readonly modelId: string;
  readonly funding: "no_credits" | "monthly_credits";
  readonly zdrStatus?: string | undefined; // "all" | "some" | "none"
  readonly noTrainingStatus?: string | undefined; // "all" | "some" | "none"
  readonly ownedBy?: string | undefined;
}): Compliance | undefined {
  const { modelId, funding, zdrStatus, noTrainingStatus, ownedBy } = params;

  // 1. Identify creator slug
  const [creatorSlug] = modelId.split("/");
  const normalizedCreator = (ownedBy ?? creatorSlug)?.toLowerCase().trim() ?? "";

  const audited = VERCEL_UPSTREAM_PROVIDER_COUNTRIES[normalizedCreator];
  if (!audited) {
    // Fail closed on unverified/unmapped creators
    return undefined;
  }

  const countries = [...audited.countries];
  const subprocessors = audited.subprocessors ? [...audited.subprocessors] : undefined;

  // Tier 1: $0 promotional / partner evaluation models
  if (funding === "no_credits") {
    return {
      zdr: false,
      no_training: false,
      data_retention: true,
      countries,
      ...(subprocessors ? { subprocessors } : {}),
      description: "Upstream provider retains prompts and completions for training",
    };
  }

  // Tier 2: Monthly free credits models ($5/mo)
  // On Hobby accounts, ZDR routing cannot be enforced; only models where ALL providers guarantee ZDR qualify as ZDR.
  const isZdrVerified = zdrStatus === "all" && noTrainingStatus === "all";
  const isNoTraining = noTrainingStatus === "all";

  if (isZdrVerified) {
    return {
      zdr: true,
      no_training: true,
      data_retention: false,
      countries,
      ...(subprocessors ? { subprocessors } : {}),
      description: "Zero data retention and no model training across all upstream providers",
    };
  }

  return {
    zdr: false,
    no_training: isNoTraining,
    data_retention: true,
    countries,
    ...(subprocessors ? { subprocessors } : {}),
    description: "Upstream providers may retain data unless training is disabled",
    conditional: true,
  };
}
