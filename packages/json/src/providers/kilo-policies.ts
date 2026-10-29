import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for Kilo Gateway.
 * Sources: Kilo Privacy Policy (updated 2026-05-29), Kilo Terms of Service,
 * Kilo Security & Compliance page, and Kilo Gateway model documentation.
 * - Kilo's own services are hosted in the United States, but free models are
 *   routed through OpenRouter and other upstream providers, so the gateway
 *   policy makes no single inference-region claim.
 * - Kilo's Terms let it use Customer Data to provide and improve its services.
 *   Paid plans advertise no retention for prompts and outputs; free plans do
 *   not get that guarantee.
 * - Kilo documents that free routes may log prompts and outputs and use them
 *   to improve services, so the effective training guarantee is false.
 */
export const KILO_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: [],
  subprocessors: ["kilo", "openrouter"],
  description: "Free models may log prompts and outputs",
  conditional: true,
};

/**
 * NVIDIA's free endpoints are documented separately by Kilo as trial use:
 * prompts and outputs are logged for security and to improve NVIDIA products.
 * NVIDIA does not publish a single inference region for these endpoints.
 */
export const KILO_NVIDIA_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: [],
  subprocessors: ["kilo", "openrouter", "nvidia"],
  description: "NVIDIA trial endpoint logs prompts and outputs",
};

export function resolveKiloCompliance(modelId: string): Compliance {
  if (modelId.startsWith("nvidia/")) {
    return KILO_NVIDIA_COMPLIANCE;
  }
  return KILO_COMPLIANCE;
}
