import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for CommandCode API inference endpoints.
 * Under Command Code Privacy Policy (Langbase, Inc., US):
 * - AI request content (prompts, attached code, completions) is retained for up to 30 days.
 * - Data from sessions on free models may be used to improve AI models.
 * - Zero Data Retention is opt-in via header or environment variable, not enabled by default on free models.
 * - Requests route through cloud infrastructure and downstream model providers.
 */
export const COMMANDCODE_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: [],
  subprocessors: [],
  description: "Free models retain prompts up to 30 days",
};

export function resolveCommandCodeCompliance(_modelId: string): Compliance {
  return COMMANDCODE_COMPLIANCE;
}
