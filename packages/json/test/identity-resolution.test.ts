import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { cataloguePaths } from "../src/catalogue/files.ts";
import type { DiscoveredOffer } from "../src/catalogue/schema.ts";
import { type CatalogueState, loadCatalogueState } from "../src/catalogue/state.ts";
import {
  type JevAnswer,
  type JevClient,
  JevUnavailable,
  type JevQuestions,
  type JevResponse,
} from "../src/automation/jev.ts";
import {
  createMintLedger,
  type Escalate,
  type EscalationRequest,
  MINT_CAP,
  type ResolveDeps,
  type Resolution,
  type UniverseModel,
  resolveOffer,
} from "../src/automation/resolve.ts";
import { providerRegistry } from "../src/providers/registry.ts";

const realState = await loadCatalogueState(
  cataloguePaths(resolve(import.meta.dir, "..")),
  providerRegistry,
);

const BEAM = "reflection/beam-1.0-501b-a23b";

const BEAM_UNIVERSE: UniverseModel[] = [
  {
    id: BEAM,
    name: "Reflection: Beam 1.0 501B A23B",
    canonical_slug: "reflection/beam-1.0-501b-a23b-20261016",
    context_length: 1048576,
  },
];

const ACME_UNIVERSE: UniverseModel[] = [
  { id: "acme/novel-thing-pro", name: "Acme Novel Thing Pro" },
];

function offer(modelId: string, name = modelId): DiscoveredOffer {
  return {
    model_id: modelId,
    name,
    connection: { base_url: "https://example.test/v1", protocol: "openai" },
    limits: { terms: ["test limit"] },
  };
}

function withCanonicalModels(
  state: CatalogueState,
  extra: { id: string; name: string }[],
): CatalogueState {
  return {
    ...state,
    canonicalModels: { models: [...state.canonicalModels.models, ...extra] },
  };
}

type Answers = JevResponse["answers"];

function response(answers: Answers): JevResponse {
  return { model: "jev-test", answers, usage: { input_tokens: 1, output_tokens: 1 } };
}

function choice(
  selected: string,
  probabilities: Record<string, number>,
  confidence = 0.9,
): JevAnswer {
  return { type: "choice", choice: selected, confidence, probabilities };
}

function noul(value: number): JevAnswer {
  return { type: "noul", noul: value };
}

function jevStub(table: Record<string, JevAnswer>) {
  const requests: string[][] = [];
  const client: JevClient = {
    async evaluate(_state: string, questions: JevQuestions) {
      requests.push(Object.keys(questions));
      const answers: Answers = {};
      for (const id of Object.keys(questions)) {
        const answer = table[id];
        if (!answer) throw new Error(`stub has no answer for ${id}`);
        answers[id] = answer;
      }
      return response(answers);
    },
  };
  return { client, requests };
}

function failingJev(error: Error): JevClient {
  return {
    async evaluate() {
      throw error;
    },
  };
}

function escalateStub(
  decide: (request: EscalationRequest) => unknown = () => ({
    canonicalId: null,
    reason: "no listed candidate is this model",
    confidence: 0.9,
  }),
) {
  const requests: EscalationRequest[] = [];
  const escalate: Escalate = async (request) => {
    requests.push(request);
    return decide(request);
  };
  return { escalate, requests };
}

function depsFor(
  jev: JevClient,
  escalate: Escalate,
  universe: UniverseModel[] | null = BEAM_UNIVERSE,
  mints = createMintLedger(),
): ResolveDeps {
  return { jev, escalate, universe, mints };
}

function noMatchJev(): JevClient {
  return {
    async evaluate(_state, questions) {
      const answers: Answers = {};
      for (const [id, question] of Object.entries(questions)) {
        if (question.type === "noul") {
          answers[id] = noul(0.1);
        } else {
          const probabilities = Object.fromEntries(
            Object.keys(question.criteria).map((key) => [key, 0]),
          );
          const [first] = Object.keys(question.criteria);
          answers[id] = choice(first ?? "", probabilities, 0.1);
        }
      }
      return response(answers);
    },
  };
}

function unexpectedJev(): JevClient {
  return {
    async evaluate() {
      throw new Error("model must not be called");
    },
  };
}

describe("identity resolution", () => {
  test("reflection/beam:free resolves deterministically with zero model calls", async () => {
    const { escalate, requests } = escalateStub();
    const before = JSON.stringify(realState);

    const result = await resolveOffer(
      realState,
      { provider: "bazaarlink", offer: offer("reflection/beam:free", "Reflection Beam (free)") },
      depsFor(unexpectedJev(), escalate),
    );

    expect(result).toMatchObject({
      outcome: "verified",
      canonicalId: BEAM,
      confidence: 1,
      source: "deterministic",
    });
    expect(requests).toHaveLength(0);
    expect(JSON.stringify(realState)).toBe(before);
  });

  test("reflection/beam-free:free resolves through committed aliases without calls", async () => {
    const { escalate, requests } = escalateStub();

    const result = await resolveOffer(
      realState,
      { provider: "bazaarlink", offer: offer("reflection/beam-free:free") },
      depsFor(unexpectedJev(), escalate),
    );

    expect(result).toMatchObject({
      outcome: "verified",
      canonicalId: BEAM,
      source: "deterministic",
    });
    expect(requests).toHaveLength(0);
  });

  test("verifies among several candidates when Jev is decisive", async () => {
    const state = withCanonicalModels(realState, [
      { id: "alpha/nova-mini", name: "Alpha Nova Mini" },
      { id: "beta/nova-mini", name: "Beta Nova Mini" },
    ]);
    const jev = jevStub({
      choose: choice("alpha/nova-mini", { "alpha/nova-mini": 0.92, "beta/nova-mini": 0.03 }, 0.85),
      same_model: noul(0.95),
    });
    const { escalate, requests } = escalateStub();

    const result = await resolveOffer(
      state,
      { provider: "kilo", offer: offer("nova-mini:free") },
      depsFor(jev.client, escalate, []),
    );

    expect(result).toMatchObject({
      outcome: "verified",
      canonicalId: "alpha/nova-mini",
      source: "jev",
    });
    expect(requests).toHaveLength(0);
  });

  test("near-tied candidates escalate instead of picking a winner", async () => {
    const state = withCanonicalModels(realState, [
      { id: "alpha/nova-mini", name: "Alpha Nova Mini" },
      { id: "beta/nova-mini", name: "Beta Nova Mini" },
    ]);
    const jev = jevStub({
      choose: choice("alpha/nova-mini", { "alpha/nova-mini": 0.55, "beta/nova-mini": 0.47 }),
      same_model: noul(0.95),
    });
    const { escalate, requests } = escalateStub(() => ({
      canonicalId: "alpha/nova-mini",
      reason: "variant names match alpha",
      confidence: 0.6,
    }));

    const result = await resolveOffer(
      state,
      { provider: "kilo", offer: offer("nova-mini:free") },
      depsFor(jev.client, escalate, []),
    );

    expect(result).toMatchObject({ outcome: "escalated", canonicalId: "alpha/nova-mini" });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.candidates.map((candidate) => candidate.inCanonical)).toEqual([true, true]);
  });

  test("low precision probability defers without escalating", async () => {
    const state = withCanonicalModels(realState, [
      { id: "alpha/nova-mini", name: "Alpha Nova Mini" },
      { id: "beta/nova-mini", name: "Beta Nova Mini" },
    ]);
    const jev = jevStub({
      choose: choice("alpha/nova-mini", { "alpha/nova-mini": 0.3, "beta/nova-mini": 0.25 }),
      same_model: noul(0.1),
    });
    const { escalate, requests } = escalateStub();

    const result = await resolveOffer(
      state,
      { provider: "kilo", offer: offer("nova-mini:free") },
      depsFor(jev.client, escalate, []),
    );

    expect(result.outcome).toBe("deferred");
    expect(requests).toHaveLength(0);
  });

  test("Jev unavailable defers and writes nothing", async () => {
    const before = JSON.stringify(realState);
    const { escalate, requests } = escalateStub();
    const mints = createMintLedger();

    const result = await resolveOffer(
      realState,
      { provider: "vercel", offer: offer("acme/novel-thing:free", "Novel Thing (free)") },
      depsFor(
        failingJev(new JevUnavailable("http", "TypeSafe responded with HTTP 503", { status: 503 })),
        escalate,
        ACME_UNIVERSE,
        mints,
      ),
    );

    expect(result.outcome).toBe("deferred");
    expect(result.reason).toContain("HTTP 503");
    expect(requests).toHaveLength(0);
    expect(mints.minted.size).toBe(0);
    expect(JSON.stringify(realState)).toBe(before);
  });

  test("escalation returning an id outside the candidate set is rejected", async () => {
    const jev = jevStub({
      recall_0: choice("acme/novel-thing-pro", { "acme/novel-thing-pro": 0.9 }),
      recall_0_noul: noul(0.95),
      choose: choice("acme/novel-thing-pro", { "acme/novel-thing-pro": 0.5 }, 0.5),
      same_model: noul(0.2),
    });
    const { escalate, requests } = escalateStub(() => ({
      canonicalId: BEAM,
      reason: "looks like beam",
      confidence: 0.8,
    }));
    const mints = createMintLedger();

    const result = await resolveOffer(
      realState,
      { provider: "vercel", offer: offer("acme/novel-thing:free", "Novel Thing (free)") },
      depsFor(jev.client, escalate, ACME_UNIVERSE, mints),
    );

    expect(result.outcome).toBe("deferred");
    expect(result.reason).toContain("outside the candidate set");
    expect(requests).toHaveLength(1);
    expect(mints.minted.size).toBe(0);
  });

  test("escalation failure defers without minting", async () => {
    const { escalate } = escalateStub(() => {
      throw new Error("escalation model timed out");
    });
    const mints = createMintLedger();

    const result = await resolveOffer(
      realState,
      { provider: "vercel", offer: offer("acme/novel-thing:free") },
      depsFor(noMatchJev(), escalate, ACME_UNIVERSE, mints),
    );

    expect(result.outcome).toBe("deferred");
    expect(result.reason).toContain("escalation unavailable");
    expect(mints.minted.size).toBe(0);
  });

  test("mints a derived canonical with provenance when escalation finds no match", async () => {
    const mints = createMintLedger();
    const { escalate } = escalateStub();

    const result = await resolveOffer(
      realState,
      { provider: "vercel", offer: offer("acme/novel-thing:free", "Novel Thing (free)") },
      depsFor(noMatchJev(), escalate, ACME_UNIVERSE, mints),
    );

    expect(result).toMatchObject({
      outcome: "minted",
      canonicalId: "acme/novel-thing",
      source: "mint",
      canonical: { id: "acme/novel-thing", name: "Novel Thing" },
      metadata: {
        id: "acme/novel-thing",
        metadata: { identity_provenance: { source: "minted", provider: "vercel" } },
      },
    });
    expect(mints.minted.has("acme/novel-thing")).toBe(true);
  });

  test("refuses to mint beyond the per-run cap", async () => {
    const mints = createMintLedger();
    for (let index = 0; index < MINT_CAP; index++) mints.minted.add(`filler/model-${index}`);
    const { escalate } = escalateStub();

    const result = await resolveOffer(
      realState,
      { provider: "vercel", offer: offer("acme/novel-thing:free") },
      depsFor(noMatchJev(), escalate, ACME_UNIVERSE, mints),
    );

    expect(result.outcome).toBe("deferred");
    expect(result.reason).toContain("mint cap");
    expect(result).toMatchObject({ code: "mint_cap" });
    expect(mints.minted.has("acme/novel-thing")).toBe(false);
    expect(mints.minted.size).toBe(MINT_CAP);
  });

  test("does not mint a second identity that already minted this run", async () => {
    const mints = createMintLedger();
    const { escalate } = escalateStub();
    const deps = depsFor(noMatchJev(), escalate, ACME_UNIVERSE, mints);

    const first = await resolveOffer(
      realState,
      { provider: "kilo", offer: offer("acme/novel-thing:free") },
      deps,
    );
    const second = await resolveOffer(
      realState,
      { provider: "openrouter", offer: offer("acme/novel-thing:free") },
      deps,
    );

    expect(first.outcome).toBe("minted");
    expect(second.outcome).toBe("deferred");
    expect(second.reason).toContain("already minted");
  });

  test("replays the eleven unresolved identities from the failed run with one outcome each", async () => {
    const unresolved: { provider: string; model_id: string; name: string }[] = [
      {
        provider: "bazaarlink",
        model_id: "nvidia/nemotron-3.5-lightning-free:free",
        name: "NVIDIA Nemotron 3.5 Lightning (free)",
      },
      {
        provider: "bazaarlink",
        model_id: "reflection/beam-free:free",
        name: "Reflection Beam (free)",
      },
      { provider: "bazaarlink", model_id: "reflection/beam:free", name: "Reflection Beam (free)" },
      { provider: "bazaarlink", model_id: "stealth/cat-jam:free", name: "Cat Jam (free)" },
      {
        provider: "bazaarlink",
        model_id: "stealth/glyph-cluster:free",
        name: "Glyph Cluster (free)",
      },
      { provider: "cloudflare", model_id: "@cf/cloudflare/clairic", name: "Clairic" },
      {
        provider: "kilo",
        model_id: "minimax/minimax-m3.1-flash:free",
        name: "MiniMax M3.1 Flash (free)",
      },
      {
        provider: "opencode",
        model_id: "minimax-m3.1-flash-free",
        name: "MiniMax M3.1 Flash (free)",
      },
      {
        provider: "openrouter",
        model_id: "minimax/minimax-m3.1-flash:free",
        name: "MiniMax M3.1 Flash (free)",
      },
      { provider: "vercel", model_id: "inception/mercury-3", name: "Mercury 3" },
      { provider: "vercel", model_id: "minimax/minimax-m3.1-flash", name: "MiniMax M3.1 Flash" },
    ];
    const silentJev = noMatchJev();
    const { escalate } = escalateStub();
    const mints = createMintLedger();
    const deps = depsFor(silentJev, escalate, BEAM_UNIVERSE, mints);
    const before = JSON.stringify(realState);

    const outcomes: Resolution[] = [];
    for (const entry of unresolved) {
      outcomes.push(
        await resolveOffer(
          realState,
          { provider: entry.provider, offer: offer(entry.model_id, entry.name) },
          deps,
        ),
      );
    }

    expect(outcomes).toHaveLength(unresolved.length);
    const keys = outcomes.map((result) => `${result.provider}/${result.id}`);
    expect(new Set(keys).size).toBe(unresolved.length);
    expect(keys.sort()).toEqual(
      unresolved.map((entry) => `${entry.provider}/${entry.model_id}`).sort(),
    );
    expect(mints.minted.size).toBeLessThanOrEqual(MINT_CAP);
    const deterministic = Object.fromEntries(
      outcomes
        .filter((result) => result.outcome === "verified")
        .map((result) => [result.id, result.canonicalId]),
    );
    expect(deterministic).toEqual({
      "nvidia/nemotron-3.5-lightning-free:free": "nvidia/nemotron-3.5-lightning",
      "reflection/beam-free:free": BEAM,
      "reflection/beam:free": BEAM,
      "stealth/cat-jam:free": "stealth:cat-jam",
      "stealth/glyph-cluster:free": "stealth:glyph-cluster",
    });
    expect(
      outcomes.filter(
        (result) => result.outcome === "verified" && result.source !== "deterministic",
      ),
    ).toHaveLength(0);
    expect(JSON.stringify(realState)).toBe(before);
  });

  test("an unavailable universe skips recall and never mints", async () => {
    const { escalate, requests } = escalateStub();
    const mints = createMintLedger();

    const result = await resolveOffer(
      realState,
      { provider: "vercel", offer: offer("acme/novel-thing:free") },
      depsFor(unexpectedJev(), escalate, null, mints),
    );

    expect(result.outcome).toBe("deferred");
    expect(result.reason).toContain("universe unavailable");
    expect(requests).toHaveLength(0);
    expect(mints.minted.size).toBe(0);
  });

  test("deterministic identities still resolve when the universe is unavailable", async () => {
    const { escalate } = escalateStub();

    const result = await resolveOffer(
      realState,
      { provider: "bazaarlink", offer: offer("reflection/beam:free") },
      depsFor(unexpectedJev(), escalate, null),
    );

    expect(result).toMatchObject({ outcome: "verified", canonicalId: BEAM });
  });

  test("an empty recall pool defers instead of minting without a model answer", async () => {
    const { escalate, requests } = escalateStub();
    const mints = createMintLedger();

    const result = await resolveOffer(
      realState,
      { provider: "vercel", offer: offer("acme/novel-thing:free") },
      depsFor(unexpectedJev(), escalate, BEAM_UNIVERSE, mints),
    );

    expect(result.outcome).toBe("deferred");
    expect(result.reason).toContain("minting needs a model answer");
    expect(requests).toHaveLength(0);
    expect(mints.minted.size).toBe(0);
  });
});
