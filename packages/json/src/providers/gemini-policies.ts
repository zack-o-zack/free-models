import type { Compliance } from "../catalogue/schema.ts";

/**
 * Standard legal compliance policy for the Google AI Studio / Gemini API Free Tier.
 * Under Google AI Studio terms:
 * - Prompts and responses are retained in Google logs.
 * - Human annotators may review prompts and completions.
 * - Data is used to improve Google products and train machine learning models.
 * - Free tier inference runs in US Google datacenters.
 * - ZDR and DPA guarantees require paid Pay-as-you-go or Vertex AI.
 */
export const GEMINI_FREE_TIER_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: ["US"],
  subprocessors: ["google"],
  description: "Prompts and outputs are logged, reviewed, and used to train models",
};

export function resolveGeminiCompliance(_modelId: string): Compliance {
  return GEMINI_FREE_TIER_COMPLIANCE;
}
