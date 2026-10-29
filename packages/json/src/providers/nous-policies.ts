import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for Nous Portal API inference endpoints.
 * Under Nous Portal Terms of Service and Privacy Policy:
 * - Data collection includes prompts, inputs, model responses, API calls, and telemetry.
 * - Data may be shared with partners and used for model evaluation, fine-tuning, training, and service improvement.
 * - API logs and interactions are retained at rest.
 * - Public endpoint operates over distributed cloud networks with no single isolated inference region claimed.
 */
export const NOUS_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: [],
  subprocessors: ["nous"],
  description: "Prompts and completions may be logged and used for training",
};

export function resolveNousCompliance(_modelId: string): Compliance {
  return NOUS_COMPLIANCE;
}
