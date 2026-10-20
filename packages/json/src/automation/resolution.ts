import type {
  CanonicalMetadataEntry,
  CanonicalModel,
  DiscoveredOffer,
} from "../catalogue/schema.ts";

export interface ResolveTarget {
  readonly provider: string;
  readonly offer: DiscoveredOffer;
}

export interface OfferSummary {
  readonly provider: string;
  readonly model_id: string;
  readonly name: string;
  readonly normalized_id: string;
}

interface Decision {
  readonly provider: string;
  readonly id: string;
  readonly reason: string;
}

export type Resolution =
  | (Decision & {
      outcome: "verified";
      canonicalId: string;
      confidence: number;
      probabilities?: Readonly<Record<string, number>>;
      source: "deterministic" | "jev";
    })
  | (Decision & {
      outcome: "escalated";
      canonicalId: string;
      confidence: number;
      probabilities: Readonly<Record<string, number>>;
      source: "escalation";
    })
  | (Decision & {
      outcome: "minted";
      canonicalId: string;
      confidence: number;
      canonical: CanonicalModel;
      metadata: CanonicalMetadataEntry;
      source: "mint";
    })
  | (Decision & { outcome: "deferred"; source: "none"; code?: "mint_cap" });

export function verified(
  target: ResolveTarget,
  canonicalId: string,
  confidence: number,
  source: "deterministic" | "jev",
  probabilities: Readonly<Record<string, number>> | undefined,
  reason: string,
): Resolution {
  return {
    outcome: "verified",
    provider: target.provider,
    id: target.offer.model_id,
    canonicalId,
    confidence,
    ...(probabilities ? { probabilities } : {}),
    source,
    reason,
  };
}

export function deferred(target: ResolveTarget, reason: string, code?: "mint_cap"): Resolution {
  return {
    outcome: "deferred",
    provider: target.provider,
    id: target.offer.model_id,
    source: "none",
    reason,
    ...(code ? { code } : {}),
  };
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}
