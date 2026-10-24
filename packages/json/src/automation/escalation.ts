import { z } from "zod";
import type { JsonValue, ProviderSnapshot } from "../catalogue/schema.ts";
import { freeReviewer } from "./inference.ts";
import type { CommittedAlias } from "./identity-index.ts";
import type { OfferSummary } from "./resolution.ts";

export interface EscalationCandidate {
  readonly id: string;
  readonly name: string;
  readonly inCanonical: boolean;
  readonly metadata: Readonly<Record<string, JsonValue>> | null;
}

export interface EscalationRequest {
  readonly offer: OfferSummary;
  readonly candidates: readonly EscalationCandidate[];
  readonly committedAliases: readonly CommittedAlias[];
  readonly distribution: Readonly<Record<string, number>>;
}

export type Escalate = (request: EscalationRequest) => Promise<unknown>;

export const escalationDecisionSchema = z
  .object({
    canonicalId: z.string().min(1).nullable(),
    reason: z.string().trim().min(1).max(2000),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type EscalationDecision = z.infer<typeof escalationDecisionSchema>;

export const ESCALATION_INSTRUCTIONS =
  'Decide whether the offer in the JSON below is the same model as one of its candidates. Choose only a candidate id from the list, or null when none is the same model. Versions, quantizations and variants are different models. Return only {"canonicalId": string|null, "reason": string, "confidence": number between 0 and 1}.';

export type FreeReviewer = Awaited<ReturnType<typeof freeReviewer>>;

export interface Escalator {
  readonly escalate: Escalate;
  readonly models: () => readonly string[];
}

/**
 * Routes escalation through the existing free-reviewer path. The reviewer is created lazily once per
 * run; its request budget is the reviewer's own limit, and exhaustion surfaces as a deferral.
 */
export function createEscalator(
  baseline: ReadonlyMap<string, ProviderSnapshot>,
  createReviewer: (
    catalogued: ReadonlyMap<string, ProviderSnapshot>,
  ) => Promise<FreeReviewer> = freeReviewer,
): Escalator {
  const models: string[] = [];
  let reviewer: Promise<FreeReviewer> | undefined;

  return {
    async escalate(request) {
      reviewer ??= createReviewer(baseline);
      const review = await reviewer;
      const { model, result } = await review(
        `${ESCALATION_INSTRUCTIONS}\n${JSON.stringify(request)}`,
        escalationDecisionSchema,
      );
      models.push(model);
      return result;
    },
    models: () => [...models],
  };
}
