import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for BazaarLink API inference endpoints.
 * Under BazaarLink Privacy Policy (集聯科技有限公司, Taiwan):
 * - BazaarLink operates as a pass-through relay and does not store prompts or model outputs.
 * - Requests are forwarded to independent upstream model providers whose retention policies apply.
 * - Upstream providers may retain inputs or outputs and use them for model training or improvement.
 * - Physical inference hosting regions and upstream infrastructure are dynamic across third parties.
 */
export const BAZAARLINK_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: [],
  subprocessors: [],
  description: "Upstream providers may retain or use prompts",
  conditional: true,
};

export function resolveBazaarLinkCompliance(_modelId: string): Compliance {
  return BAZAARLINK_COMPLIANCE;
}
