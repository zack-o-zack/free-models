import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for Onomeo.
 * Sources: Onomeo Privacy Policy (updated 2026-10-27) and Terms of Use
 * (updated 2026-10-11).
 * - Onomeo forwards prompts to third-party model providers and does not train
 *   on them itself.
 * - API calls keep excerpts (1,000 system prompt characters, 4,000 last-user
 *   characters, 4,000 reply characters) for the latest 100 calls, for up to
 *   30 days. Chat conversations are stored until deleted.
 * - Upstream providers, especially free tiers, may retain prompts or use them
 *   to improve their services, so the effective training guarantee is false.
 * - Onomeo does not publish a single inference region. Railway and Cloudflare
 *   are the gateway and storage providers, so no country claim is made.
 */
export const ONOMEO_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: [],
  subprocessors: ["onomeo", "cloudflare", "railway"],
  description: "Keeps 30-day excerpts and upstream providers may train",
  conditional: true,
};

export function resolveOnomeoCompliance(_modelId: string): Compliance {
  return ONOMEO_COMPLIANCE;
}
