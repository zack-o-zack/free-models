import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for Routeway's free tier.
 * Sources: Routeway Privacy Policy (updated 28 June 2025), Terms of Service,
 * homepage FAQ, and API/model documentation.
 * - Routeway says it does not store prompts or model responses; its own logs
 *   cover usage metadata, errors, and billing rather than prompt content.
 * - Requests are forwarded to third-party AI model providers, and Routeway's
 *   terms say those providers may store, process, or use prompts under their
 *   own policies. The free catalogue does not publish enough upstream detail
 *   to claim a no-training or ZDR guarantee end to end.
 * - Routeway's own processing may use EU primary data centres and US cloud/AI
 *   providers, so no single inference region is claimed.
 */
export const ROUTEWAY_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: [],
  subprocessors: ["routeway", "aws", "google"],
  description: "Upstream providers may retain or use prompts",
  conditional: true,
};
