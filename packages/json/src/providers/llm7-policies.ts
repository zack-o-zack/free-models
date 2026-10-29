import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for LLM7 API inference endpoints.
 * Under LLM7 Terms of Service and Privacy Policy:
 * - Responses may be temporarily cached for up to 5 minutes for performance and reliability.
 * - Prompts and outputs may be processed under licence to improve the service and safety systems.
 * - Third-party model providers and infrastructure terms apply to routed inference.
 * - Edge hosting and storage operate across Cloudflare infrastructure.
 */
export const LLM7_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: [],
  subprocessors: ["cloudflare"],
  description: "Responses may be cached up to 5 minutes",
  conditional: true,
};

export function resolveLlm7Compliance(_modelId: string): Compliance {
  return LLM7_COMPLIANCE;
}
