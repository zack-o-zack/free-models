import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for Cohere.
 * Sources: Cohere Terms of Use, Privacy Policy, Enterprise Data Commitments,
 * and Trust Center.
 * - Enterprise Data Commitments apply only to paying customers. Trial keys are
 *   governed by the Terms of Use and Privacy Policy.
 * - The Privacy Policy says Trial or Research User inputs and outputs may be
 *   used to improve model performance and safety.
 * - Enterprise customers can opt out of training in Data Controls; the default
 *   is training on.
 * - SaaS prompts and generations are logged and deleted after 30 days, with
 *   exceptions for legal holds, contracts, and abuse investigations.
 * - Zero Data Retention is available only to approved enterprise customers and
 *   does not cover usage metadata.
 * - Hosting is on Google Cloud in US-Central and Cohere does not use servers
 *   outside the United States. The Trust Center lists Google Cloud as an
 *   infrastructure subprocessor.
 */
export const COHERE_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: ["US"],
  subprocessors: ["cohere", "google"],
  description: "Trial prompts are logged for 30 days and may be used to train models",
};

export function resolveCohereCompliance(_modelId: string): Compliance {
  return COHERE_COMPLIANCE;
}
