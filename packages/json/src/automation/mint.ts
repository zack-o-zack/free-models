import { canonicalModelIdSchema, type DiscoveredOffer } from "../catalogue/schema.ts";
import type { CatalogueState } from "../catalogue/state.ts";
import type { EscalationDecision } from "./escalation.ts";
import { normalizeIdentity } from "./identity-index.ts";
import { deferred, type Resolution, type ResolveTarget } from "./resolution.ts";

export const MINT_CAP = 10;

export interface MintLedger {
  readonly minted: Set<string>;
}

export function createMintLedger(): MintLedger {
  return { minted: new Set<string>() };
}

export function mintCanonical(
  state: CatalogueState,
  target: ResolveTarget,
  decision: EscalationDecision,
  mints: MintLedger,
): Resolution {
  const canonicalId = normalizeIdentity(target.offer.model_id);
  if (!canonicalModelIdSchema.safeParse(canonicalId).success) {
    return deferred(target, `normalized id is not a canonical identifier: ${canonicalId}`);
  }
  if (state.canonicalModels.models.some((model) => model.id === canonicalId)) {
    return deferred(target, `normalized id is already committed, refusing to fork: ${canonicalId}`);
  }
  if (mints.minted.has(canonicalId)) {
    return deferred(target, `normalized id was already minted this run: ${canonicalId}`);
  }
  if (mints.minted.size >= MINT_CAP) {
    return deferred(target, `mint cap of ${MINT_CAP} reached this run`, "mint_cap");
  }
  mints.minted.add(canonicalId);

  return {
    outcome: "minted",
    provider: target.provider,
    id: target.offer.model_id,
    canonicalId,
    confidence: decision.confidence,
    source: "mint",
    reason: decision.reason,
    canonical: { id: canonicalId, name: mintName(target.offer, canonicalId) },
    metadata: {
      id: canonicalId,
      metadata: {
        identity_provenance: {
          source: "minted",
          provider: target.provider,
          model_id: target.offer.model_id,
          reason: decision.reason,
          escalation_confidence: decision.confidence,
        },
      },
    },
  };
}

function mintName(offer: DiscoveredOffer, canonicalId: string): string {
  return offer.name.replace(/\s*\(free\)|\s+free$/gi, "").trim() || canonicalId;
}
