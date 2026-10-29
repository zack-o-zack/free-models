import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for AnyAPI API inference endpoints.
 * Under AnyAPI Terms of Service (AnyAPI Inc., US):
 * - Inference requests are executed by independent third-party Model Providers.
 * - AnyAPI does not disclose provider identities or control their infrastructure, privacy practices, or data retention.
 * - End-to-end ZDR and no-training guarantees cannot be verified for routed upstream models.
 * - Hosting regions and subprocessors are undisclosed and dynamic.
 */
export const ANYAPI_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: [],
  subprocessors: [],
  description: "Retention policies vary by upstream provider",
  conditional: true,
};

export function resolveAnyApiCompliance(_modelId: string): Compliance {
  return ANYAPI_COMPLIANCE;
}
