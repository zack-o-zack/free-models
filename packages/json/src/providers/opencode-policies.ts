import type { Compliance } from "../catalogue/schema.ts";

export const OPENCODE_POLICIES = {
  /**
   * Tier 1: Self-hosted in-memory on OpenCode Zen infrastructure (US + EU).
   * Ephemeral in-memory execution; zero data retention and no model training.
   */
  ZEN_IN_MEMORY_ZDR: {
    zdr: true,
    no_training: true,
    data_retention: false,
    countries: ["US", "EU"],
    description: "Zero data retention on in-memory inference",
  },

  /**
   * Tier 2: Promotional / preview models where prompts and completions are retained to improve models.
   */
  PROMO_PREVIEW_RETAINED: {
    zdr: false,
    no_training: false,
    data_retention: true,
    countries: ["US"],
    description: "Preview model retains prompts and outputs",
  },

  /**
   * Tier 3: Upstream evaluation proxy models routed to NVIDIA NIM trial endpoints (integrate.api.nvidia.com).
   */
  NVIDIA_TRIAL_PROXY: {
    zdr: false,
    no_training: false,
    data_retention: true,
    countries: ["US"],
    subprocessors: ["nvidia"],
    description: "NVIDIA trial endpoint logs interactions on US servers",
  },
} as const satisfies Record<string, Compliance>;

export type OpenCodePolicyTier = keyof typeof OPENCODE_POLICIES;

/**
 * Explicit mapping of audited OpenCode model IDs to their verified compliance tier.
 * Unlisted models fail closed (return undefined) to trigger unresolved state in workflow.
 */
export const OPENCODE_MODEL_POLICY_MAP: Readonly<Record<string, OpenCodePolicyTier>> = {
  // Tier 1: Zen In-Memory Self-Hosted (ZDR guaranteed)
  "deepseek-v4.1-flash-free": "ZEN_IN_MEMORY_ZDR",
  "glm-5.3-flash-free": "ZEN_IN_MEMORY_ZDR",
  "jev-1.13-free": "ZEN_IN_MEMORY_ZDR",
  "qwen-3.5-flash-free": "ZEN_IN_MEMORY_ZDR",
  "meta-llama-4-scout-free": "ZEN_IN_MEMORY_ZDR",
  "meta-llama-4-free": "ZEN_IN_MEMORY_ZDR",
  "deepseek-r2-free": "ZEN_IN_MEMORY_ZDR",
  "deepseek-v4-flash-free": "ZEN_IN_MEMORY_ZDR",
  "gemma-3-flash-free": "ZEN_IN_MEMORY_ZDR",
  "gpt-5.3-mini-free": "ZEN_IN_MEMORY_ZDR",
  "gpt-5.4-mini-free": "ZEN_IN_MEMORY_ZDR",
  "deepseek-v3.2-free": "ZEN_IN_MEMORY_ZDR",
  "claude-3.8-haiku-free": "ZEN_IN_MEMORY_ZDR",
  "minimax-m2.5-free": "ZEN_IN_MEMORY_ZDR",
  "kimi-k2.5-free": "ZEN_IN_MEMORY_ZDR",

  // Tier 2: Preview / Retention Models
  "flint-40b-free": "PROMO_PREVIEW_RETAINED",
  "beam-free": "PROMO_PREVIEW_RETAINED",
  "big-pickle": "PROMO_PREVIEW_RETAINED",
  "mimo-v2.6-flash-free": "PROMO_PREVIEW_RETAINED",

  // Tier 3: Upstream NVIDIA Trial Proxy
  "nemotron-3.5-super-vl-free": "NVIDIA_TRIAL_PROXY",
  "nemotron-3.5-lightning-free": "NVIDIA_TRIAL_PROXY",
};

/**
 * Resolves verified compliance for an OpenCode model.
 * Fails closed (returns undefined) if model is not recognized or has conflicting documentation.
 */
export function resolveOpenCodeCompliance(
  modelId: string,
  upstreamDocType?: string,
): Compliance | undefined {
  const tier = OPENCODE_MODEL_POLICY_MAP[modelId];
  if (!tier) {
    return undefined;
  }

  // Fail-closed guard: If documentation signals retention/preview on what we thought was a Zen ZDR model
  if (tier === "ZEN_IN_MEMORY_ZDR" && upstreamDocType === "retained_preview") {
    return undefined;
  }

  return OPENCODE_POLICIES[tier];
}
