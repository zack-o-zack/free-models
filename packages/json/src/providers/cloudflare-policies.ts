import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for Cloudflare Workers AI.
 * Under Cloudflare Workers AI terms:
 * - Stateless inference requests operate under Zero Data Retention (ZDR).
 * - Customer Content (prompts and completions) is processed ephemerally in-memory and discarded upon response delivery.
 * - Cloudflare does not use customer inputs or outputs to train or fine-tune models.
 * - Inference runs serverless-ly on Cloudflare's global edge GPU network across US and EU PoPs.
 * - Self-hosted by Cloudflare without third-party inference subprocessors.
 */
export const CLOUDFLARE_WORKERS_AI_COMPLIANCE: Compliance = {
  zdr: true,
  no_training: true,
  data_retention: false,
  countries: ["US", "EU"],
  subprocessors: ["cloudflare"],
  edge: true,
  description: "Zero data retention and no model training on edge GPUs",
};

export function resolveCloudflareCompliance(_modelId: string): Compliance {
  return CLOUDFLARE_WORKERS_AI_COMPLIANCE;
}
