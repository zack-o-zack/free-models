import { compareStrings } from "../catalogue/files.ts";
import type { CatalogueState } from "../catalogue/state.ts";
import { metadataById } from "../catalogue/state.ts";
import { type Escalate, type EscalationRequest, escalationDecisionSchema } from "./escalation.ts";
import {
  buildCandidate,
  type Candidate,
  committedAliases,
  committedConsensus,
  compactUniverse,
  normalizeIdentity,
  prefilter,
  type UniverseModel,
  universeCriteria,
} from "./identity-index.ts";
import {
  type JevAnswer,
  type JevClient,
  type JevQuestion,
  type JevQuestions,
  JEV_MAX_CHOICES,
  type JevResponse,
} from "./jev.ts";
import { mintCanonical, type MintLedger } from "./mint.ts";
import { identityCandidates } from "./policy.ts";
import {
  deferred,
  describeError,
  type OfferSummary,
  type Resolution,
  type ResolveTarget,
  verified,
} from "./resolution.ts";

export { createMintLedger, MINT_CAP, type MintLedger } from "./mint.ts";
export type { Escalate, EscalationRequest } from "./escalation.ts";
export type { Resolution, ResolveTarget } from "./resolution.ts";
export type { UniverseModel } from "./identity-index.ts";

export const VERIFY_PROBABILITY = 0.8;
export const VERIFY_CONFIDENCE = 0.6;
export const NOUL_YES = 0.8;
export const ESCALATE_PROBABILITY = 0.4;
export const AMBIGUITY_MARGIN = 0.1;
export const STAGE_A_NOUL_FLOOR = 0.5;
export const SHARD_SIZE = JEV_MAX_CHOICES;

export interface ResolveDeps {
  readonly jev: JevClient;
  readonly escalate: Escalate;
  /** null when the upstream list could not be loaded; recall is then skipped. */
  readonly universe: readonly UniverseModel[] | null;
  readonly mints: MintLedger;
}

const RECALL_INSTRUCTION =
  "Which listed model, if any, is the same model as the offer in the state? Match on provider model id, name and family. Probabilities show how closely each listed model matches.";
const SHARD_NOUL_QUESTION =
  "Is the offer in the state the same model as one of the options listed here?";
const PRECISE_INSTRUCTION =
  "Which candidate is the same model as the offer in the state? Versions, quantizations and variants are different models.";
const SAME_MODEL_QUESTION =
  "Is the offer in the state the same model as one of the listed options, rather than a model that is not on the list?";

export async function resolveOffer(
  state: CatalogueState,
  target: ResolveTarget,
  deps: ResolveDeps,
): Promise<Resolution> {
  try {
    return await resolveStages(state, target, deps);
  } catch (error) {
    return deferred(target, `identity resolution unavailable: ${describeError(error)}`);
  }
}

async function resolveStages(
  state: CatalogueState,
  target: ResolveTarget,
  deps: ResolveDeps,
): Promise<Resolution> {
  const canonicalIds = new Map(state.canonicalModels.models.map((model) => [model.id, model]));
  const identity = normalizeIdentity(target.offer.model_id);

  const candidates = identityCandidates(state, target.offer);
  const [only] = candidates;
  if (candidates.length === 1 && only && canonicalIds.has(only.id)) {
    return verified(target, only.id, 1, "deterministic", undefined, "single canonical identity");
  }

  const consensus = committedConsensus(state, identity, canonicalIds);
  if (consensus) {
    return verified(
      target,
      consensus,
      1,
      "deterministic",
      undefined,
      "committed aliases agree on one canonical model",
    );
  }

  if (candidates.length > 1) {
    return precise(
      state,
      target,
      candidates.map((candidate) => buildCandidate(candidate.id, state, new Map())),
      deps,
    );
  }

  if (deps.universe === null) {
    return deferred(target, "upstream model universe unavailable; recall skipped");
  }
  const index = prefilter(identity, deps.universe);
  if (index.size === 0) {
    return deferred(
      target,
      "no upstream model resembles this identity; minting needs a model answer",
    );
  }
  const recalled = await recall(target, index, deps);
  if (recalled.survivors.length === 0) {
    return escalate(state, target, [], recalled.distribution, deps);
  }
  const survivors = recalled.survivors.map((id) => buildCandidate(id, state, index));
  return precise(state, target, survivors, deps);
}

async function recall(
  target: ResolveTarget,
  index: ReadonlyMap<string, UniverseModel>,
  deps: ResolveDeps,
): Promise<{ survivors: string[]; distribution: Record<string, number> }> {
  const ids = [...index.keys()].sort(compareStrings);

  const questions: Record<string, JevQuestion> = {};
  const shards = chunk(ids, SHARD_SIZE);
  for (const [position, shard] of shards.entries()) {
    questions[`recall_${position}`] = {
      type: "choice",
      instructions: RECALL_INSTRUCTION,
      criteria: Object.fromEntries(shard.map((id) => [id, universeCriteria(id, index.get(id))])),
    };
    questions[`recall_${position}_noul`] = {
      type: "noul",
      instructions: { question: SHARD_NOUL_QUESTION, options: shard },
    };
  }

  const response = await deps.jev.evaluate(
    JSON.stringify({
      offer: offerSummary(target),
      candidates: ids.map((id) => compactUniverse(id, index.get(id))),
    }),
    questions,
  );

  const distribution = new Map<string, number>();
  for (const [position, shard] of shards.entries()) {
    const members = new Set(shard);
    const choice = choiceAnswer(response, `recall_${position}`);
    const noul = noulAnswer(response, `recall_${position}_noul`);
    if (noul.noul < STAGE_A_NOUL_FLOOR) continue;
    for (const [id, probability] of Object.entries(choice.probabilities)) {
      if (probability > 0 && members.has(id)) {
        distribution.set(id, Math.max(distribution.get(id) ?? 0, probability));
      }
    }
  }

  const survivors = [...distribution]
    .sort(([leftId, left], [rightId, right]) => right - left || compareStrings(leftId, rightId))
    .slice(0, SHARD_SIZE)
    .map(([id]) => id);

  return { survivors, distribution: Object.fromEntries(distribution) };
}

async function precise(
  state: CatalogueState,
  target: ResolveTarget,
  candidates: readonly Candidate[],
  deps: ResolveDeps,
): Promise<Resolution> {
  if (candidates.length > SHARD_SIZE) {
    return deferred(target, `too many candidates for one precision question: ${candidates.length}`);
  }

  const questions: JevQuestions = {
    choose: {
      type: "choice",
      instructions: PRECISE_INSTRUCTION,
      criteria: Object.fromEntries(
        candidates.map((candidate) => [candidate.id, candidate.criteria]),
      ),
    },
    same_model: {
      type: "noul",
      instructions: {
        question: SAME_MODEL_QUESTION,
        options: candidates.map((candidate) => candidate.id),
      },
    },
  };
  const response = await deps.jev.evaluate(
    JSON.stringify({ offer: offerSummary(target) }),
    questions,
  );
  const choose = choiceAnswer(response, "choose");
  const same = noulAnswer(response, "same_model");

  const ranked = Object.entries(choose.probabilities).sort(
    ([leftId, left], [rightId, right]) => right - left || compareStrings(leftId, rightId),
  );
  const [top, next] = ranked;
  const topId = top?.[0];
  const topProbability = top?.[1] ?? 0;
  const margin = topProbability - (next?.[1] ?? 0);
  const winner = candidates.find((candidate) => candidate.id === choose.choice);

  if (
    winner?.inCanonical &&
    topId === choose.choice &&
    topProbability >= VERIFY_PROBABILITY &&
    choose.confidence >= VERIFY_CONFIDENCE &&
    same.noul >= NOUL_YES &&
    margin >= AMBIGUITY_MARGIN
  ) {
    return verified(
      target,
      winner.id,
      choose.confidence,
      "jev",
      choose.probabilities,
      `jev selected ${winner.id} at ${topProbability}`,
    );
  }

  if (topId !== undefined && topProbability >= ESCALATE_PROBABILITY) {
    return escalate(state, target, candidates, choose.probabilities, deps);
  }
  return deferred(target, `no candidate reached ${ESCALATE_PROBABILITY} (top ${topProbability})`);
}

async function escalate(
  state: CatalogueState,
  target: ResolveTarget,
  candidates: readonly Candidate[],
  distribution: Readonly<Record<string, number>>,
  deps: ResolveDeps,
): Promise<Resolution> {
  const metadata = metadataById(state.metadata);
  const request: EscalationRequest = {
    offer: offerSummary(target),
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      inCanonical: candidate.inCanonical,
      metadata: metadata.get(candidate.id) ?? null,
    })),
    committedAliases: committedAliases(
      state,
      normalizeIdentity(target.offer.model_id),
      new Set(candidates.map((candidate) => candidate.id)),
    ),
    distribution,
  };

  let raw: unknown;
  try {
    raw = await deps.escalate(request);
  } catch (error) {
    return deferred(target, `escalation unavailable: ${describeError(error)}`);
  }
  const parsed = escalationDecisionSchema.safeParse(raw);
  if (!parsed.success) return deferred(target, "escalation response failed validation");
  const decision = parsed.data;

  if (decision.canonicalId === null) return mintCanonical(state, target, decision, deps.mints);

  const chosen = candidates.find((candidate) => candidate.id === decision.canonicalId);
  if (!chosen) {
    return deferred(
      target,
      `escalation returned an id outside the candidate set: ${decision.canonicalId}`,
    );
  }
  if (!chosen.inCanonical) {
    return deferred(target, `escalation selected an uncommitted identity: ${chosen.id}`);
  }
  return {
    outcome: "escalated",
    provider: target.provider,
    id: target.offer.model_id,
    canonicalId: chosen.id,
    confidence: decision.confidence,
    probabilities: distribution,
    source: "escalation",
    reason: decision.reason,
  };
}

function choiceAnswer(response: JevResponse, id: string): Extract<JevAnswer, { type: "choice" }> {
  const answer = response.answers[id];
  if (answer?.type !== "choice") throw new Error(`Missing choice answer: ${id}`);
  return answer;
}

function noulAnswer(response: JevResponse, id: string): Extract<JevAnswer, { type: "noul" }> {
  const answer = response.answers[id];
  if (answer?.type !== "noul") throw new Error(`Missing noul answer: ${id}`);
  return answer;
}

function offerSummary(target: ResolveTarget): OfferSummary {
  return {
    provider: target.provider,
    model_id: target.offer.model_id,
    name: target.offer.name,
    normalized_id: normalizeIdentity(target.offer.model_id),
  };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}
