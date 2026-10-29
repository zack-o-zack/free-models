import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for Novita AI inference endpoints.
 * Under Novita AI Privacy Policy and Trust Center:
 * - API inputs and outputs are processed in-memory and discarded after delivery (Zero Data Retention).
 * - Customer prompts, completions, and generated content are not used to train or improve models.
 * - Primary GPU inference infrastructure is hosted in the United States, utilizing AWS for orchestration.
 * - Operates under SOC 2 Type II certification.
 */
export const NOVITA_COMPLIANCE: Compliance = {
  zdr: true,
  no_training: true,
  data_retention: false,
  countries: ["US"],
  subprocessors: ["novita", "aws"],
  description: "API content is not retained and not used for model training",
};

export function resolveNovitaCompliance(_modelId: string): Compliance {
  return NOVITA_COMPLIANCE;
}
