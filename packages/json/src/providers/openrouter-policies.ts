import type { Compliance } from "../catalogue/schema.ts";

export interface OpenRouterProviderInfo {
  readonly slug: string;
  readonly name?: string | undefined;
  readonly headquarters?: string | null | undefined;
  readonly datacenters?: readonly string[] | null | undefined;
}

export interface AuditedHostInfo {
  readonly countries: readonly string[];
  readonly subprocessors?: readonly string[] | undefined;
}

/**
 * Audited fallback directory of upstream inference providers serving OpenRouter models.
 * Used when OpenRouter's /api/v1/providers endpoint does not provide datacenter metadata,
 * or when validating against known safe jurisdictions.
 */
export const OPENROUTER_AUDITED_HOSTS: Readonly<Record<string, AuditedHostInfo>> = {
  baseten: { countries: ["US"], subprocessors: ["baseten"] },
  cohere: { countries: ["US"], subprocessors: ["cohere"] },
  "dots-studio": { countries: ["US"], subprocessors: ["dots-studio"] },
  "fish-audio": { countries: ["US"], subprocessors: ["fish-audio"] },
  google: { countries: ["US"], subprocessors: ["google"] },
  "google-ai-studio": { countries: ["US"], subprocessors: ["google"] },
  "google-vertex": { countries: ["US"], subprocessors: ["google"] },
  inception: { countries: ["US"], subprocessors: ["inception"] },
  liquid: { countries: ["US"], subprocessors: ["liquid"] },
  nvidia: { countries: ["US"], subprocessors: ["nvidia"] },
  poolside: { countries: ["US", "EU"], subprocessors: ["poolside"] },
  recursive: { countries: ["US"], subprocessors: ["recursive"] },
  respan: { countries: ["US"], subprocessors: ["respan"] },
  thinkingmachines: { countries: ["US"], subprocessors: ["thinkingmachines"] },
  "xingchen-agi": { countries: ["US", "CN"], subprocessors: ["xingchen-agi"] },
  chutes: { countries: ["US"], subprocessors: ["chutes"] },
  together: { countries: ["US"], subprocessors: ["together"] },
  featherless: { countries: ["US"], subprocessors: ["featherless"] },
  deepinfra: { countries: ["US", "EU"], subprocessors: ["deepinfra"] },
  hyperbolic: { countries: ["US"], subprocessors: ["hyperbolic"] },
  parasail: { countries: ["US"], subprocessors: ["parasail"] },
  mistralai: { countries: ["EU", "US"], subprocessors: ["mistralai"] },
  qwen: { countries: ["US", "CN"], subprocessors: ["qwen"] },
  deepseek: { countries: ["US", "CN"], subprocessors: ["deepseek"] },
  "meta-llama": { countries: ["US"], subprocessors: ["meta"] },
};

export function isZeroPrice(value: string | number | undefined | null): boolean {
  if (value === undefined || value === null) return true;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return !Number.isNaN(parsed) && parsed === 0;
}

export function resolveOpenRouterCompliance(params: {
  readonly modelId: string;
  readonly isZdrVerified?: boolean;
  readonly providerInfo?: OpenRouterProviderInfo | undefined;
  readonly upstreamProviders?: readonly string[] | undefined;
}): Compliance | undefined {
  const { modelId, isZdrVerified = false, providerInfo, upstreamProviders } = params;

  // Extract author prefix (e.g., "nvidia" from "nvidia/nemotron-3.5-lightning:free")
  const [authorSlug] = modelId.split("/");
  const normalizedAuthor = authorSlug?.toLowerCase().trim() ?? "";

  // 1. Determine subprocessors (only include actual inference hosts, not author weight-licensors)
  const subprocessorsSet = new Set<string>();
  if (upstreamProviders && upstreamProviders.length > 0) {
    for (const p of upstreamProviders) {
      subprocessorsSet.add(p.toLowerCase().trim());
    }
  } else if (providerInfo?.slug) {
    subprocessorsSet.add(providerInfo.slug.toLowerCase().trim());
  } else if (normalizedAuthor) {
    subprocessorsSet.add(normalizedAuthor);
  }

  // 2. Determine countries
  // OpenRouter control & routing plane operates in US
  const countriesSet = new Set<string>(["US"]);

  // If live provider metadata exists with datacenters, use them
  if (providerInfo?.datacenters && providerInfo.datacenters.length > 0) {
    for (const dc of providerInfo.datacenters) {
      if (dc && typeof dc === "string" && dc.trim().length > 0) {
        countriesSet.add(dc.trim().toUpperCase());
      }
    }
  } else if (providerInfo?.headquarters && typeof providerInfo.headquarters === "string") {
    countriesSet.add(providerInfo.headquarters.trim().toUpperCase());
  }

  // Also check audited host registry for known datacenter footprints
  const audited = OPENROUTER_AUDITED_HOSTS[normalizedAuthor];
  if (audited) {
    for (const c of audited.countries) {
      countriesSet.add(c);
    }
    if (audited.subprocessors) {
      for (const s of audited.subprocessors) {
        subprocessorsSet.add(s);
      }
    }
  } else if (!providerInfo && (!upstreamProviders || upstreamProviders.length === 0)) {
    // Unaudited host with no live metadata -> fail closed
    return undefined;
  }

  const countries = [...countriesSet];
  const subprocessors = subprocessorsSet.size > 0 ? [...subprocessorsSet] : undefined;

  // 3. Determine compliance based on verified ZDR registry
  if (isZdrVerified) {
    return {
      zdr: true,
      no_training: true,
      data_retention: false,
      countries,
      ...(subprocessors ? { subprocessors } : {}),
      description: "Zero data retention verified in live registry",
    };
  }

  return {
    zdr: false,
    no_training: false,
    data_retention: true,
    countries,
    ...(subprocessors ? { subprocessors } : {}),
    description: "Free endpoints may log prompts and completions",
  };
}
