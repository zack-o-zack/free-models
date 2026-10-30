import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for Groq.
 * Sources: Groq Services Agreement section 4.2, the GroqCloud "Your Data"
 * documentation, and the GroqCloud Data Processing Addendum.
 * - Inputs and outputs are not retained by default, but Groq may log them for
 *   up to 30 days to troubleshoot failures and investigate abuse.
 * - Zero Data Retention is opt-in through Data Controls, which disables the
 *   reliability and abuse-monitoring logs.
 * - Groq does not train or fine-tune models on inputs or outputs without
 *   explicit customer permission.
 * - Customer data is stored in Google Cloud Storage buckets in the United
 *   States. The DPA permits transfers to countries where Groq and its
 *   subprocessors operate.
 */
export const GROQ_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: true,
  data_retention: true,
  countries: ["US"],
  subprocessors: ["groq", "google"],
  description: "Logs kept up to 30 days unless zero retention is enabled",
};

export function resolveGroqCompliance(_modelId: string): Compliance {
  return GROQ_COMPLIANCE;
}
