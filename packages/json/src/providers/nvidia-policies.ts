import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for NVIDIA Build / NIM API free evaluation endpoints.
 * Under NVIDIA API Catalog & Build terms:
 * - Public free evaluation endpoints at integrate.api.nvidia.com do not offer Zero Data Retention.
 * - Interactions, queries, and generated outputs may be logged and monitored for service improvement.
 * - Hosted on NVIDIA DGX Cloud infrastructure primarily in the United States.
 * - Operated directly by NVIDIA without third-party inference subprocessors.
 */
export const NVIDIA_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: ["US"],
  subprocessors: ["nvidia"],
  description: "Trial interactions are retained and monitored on US servers",
};

export function resolveNvidiaCompliance(_modelId: string): Compliance {
  return NVIDIA_COMPLIANCE;
}
