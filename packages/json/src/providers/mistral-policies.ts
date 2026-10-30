import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for Mistral AI.
 * Sources: the Commercial Terms of Service, Privacy Policy, and Data
 * Processing Addendum.
 * - API inputs and outputs are kept for the period needed to generate the
 *   output and then for 30 rolling days to monitor abuse, unless Zero Data
 *   Retention is activated.
 * - Standard commercial models are not trained on customer inputs or outputs
 *   by default. Feedback, explicit opt-in, contract terms, and Labs or Preview
 *   models are exceptions.
 * - Hosting is EU-first, but service providers outside the EU may be used in
 *   exceptional cases and transfers are covered by standard contractual
 *   clauses.
 * - Mistral uses subprocessors listed in its Trust Center.
 */
export const MISTRAL_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: true,
  data_retention: true,
  countries: ["FR", "EU"],
  subprocessors: ["mistral"],
  description: "Logs kept up to 30 days unless zero retention is enabled",
};

/** Labs and preview models may use customer data to train or improve models. */
export const MISTRAL_LABS_COMPLIANCE: Compliance = {
  ...MISTRAL_COMPLIANCE,
  no_training: false,
  description: "Labs models may use prompts and outputs for training",
};

export function resolveMistralCompliance(modelId: string): Compliance {
  return modelId.startsWith("labs-") ? MISTRAL_LABS_COMPLIANCE : MISTRAL_COMPLIANCE;
}
