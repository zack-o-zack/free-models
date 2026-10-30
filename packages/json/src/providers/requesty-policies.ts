import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for Requesty's free tier.
 * Sources: Requesty Privacy Policy, Security page, Data Privacy & ZDR docs, and
 * public subprocessor list (updated 6 October 2026).
 * - Requesty's own use of content for training is limited to free plan
 *   accounts, so the free catalogue cannot claim a no-training guarantee even
 *   when the upstream provider does not train.
 * - Logging is on by default on self-serve plans and retained for up to 30 days
 *   in the EU. Per-key logging off is available; organisation-wide ZDR is a
 *   paid-plan option, so the free catalogue cannot claim it.
 * - Requesty's platform is hosted on AWS in Frankfurt, but inference follows
 *   the selected upstream provider. The subprocessor table gives the upstream
 *   location, retention, and training position for each provider.
 */
export const REQUESTY_COMPLIANCE: Compliance = {
  zdr: false,
  no_training: false,
  data_retention: true,
  countries: [],
  subprocessors: ["requesty", "aws"],
  description: "Free plan logs up to 30 days and may train on prompts",
};

interface RequestyUpstreamPolicy {
  readonly countries: readonly string[];
  readonly subprocessors: readonly string[];
}

/**
 * Upstream locations from Requesty's published subprocessor table. Requesty
 * itself processes on AWS Frankfurt; these entries describe where inference
 * runs, not where the gateway stores its logs.
 */
const REQUESTY_UPSTREAM_POLICIES: Readonly<Record<string, RequestyUpstreamPolicy>> = {
  // Google LLC (Gemini API) is listed as Global.
  google: { countries: [], subprocessors: ["requesty", "aws", "google"] },
  mistral: { countries: ["EU"], subprocessors: ["requesty", "aws", "mistral"] },
  novita: { countries: ["US"], subprocessors: ["requesty", "aws", "novita"] },
  nvidia: { countries: ["US"], subprocessors: ["requesty", "aws", "nvidia"] },
  poolside: { countries: ["US"], subprocessors: ["requesty", "aws", "poolside"] },
};

export function resolveRequestyCompliance(modelId: string): Compliance {
  const parts = modelId.split("/");
  const prefix = parts.length > 1 ? parts[0] : undefined;
  const upstream = prefix ? REQUESTY_UPSTREAM_POLICIES[prefix] : undefined;

  return {
    ...REQUESTY_COMPLIANCE,
    countries: upstream ? [...upstream.countries] : [...REQUESTY_COMPLIANCE.countries],
    subprocessors: upstream
      ? [...upstream.subprocessors]
      : REQUESTY_COMPLIANCE.subprocessors
        ? [...REQUESTY_COMPLIANCE.subprocessors]
        : undefined,
  };
}
