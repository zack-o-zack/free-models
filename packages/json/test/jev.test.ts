import { describe, expect, test } from "bun:test";
import {
  createJevClient,
  DEFAULT_JEV_MODEL,
  JEV_ENDPOINT,
  JevUnavailable,
  type JevQuestions,
} from "../src/automation/jev.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const questions: JevQuestions = {
  pick: {
    type: "choice",
    instructions: "Which model?",
    criteria: { "alpha/one": "first", "beta/two": "second" },
  },
  same: {
    type: "noul",
    instructions: "Is it one of them?",
  },
};

const validAnswers = {
  model: "jev-latest",
  answers: {
    pick: {
      type: "choice",
      choice: "alpha/one",
      confidence: 0.9,
      probabilities: { "alpha/one": 0.8, "beta/two": 0.2 },
    },
    same: { type: "noul", noul: 0.95 },
  },
  usage: { input_tokens: 10, output_tokens: 2 },
};

describe("Jev client", () => {
  test("missing key fails without touching the network", async () => {
    let requests = 0;
    const client = createJevClient({
      env: {},
      fetch: async () => {
        requests++;
        return jsonResponse(validAnswers);
      },
    });

    const failure = await client.evaluate("state", questions).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(JevUnavailable);
    expect((failure as JevUnavailable).reason).toBe("missing_key");
    expect(requests).toBe(0);
  });

  test("posts one batched request with the key, model and questions", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const client = createJevClient({
      env: { TYPESAFE_API_KEY: "test-key" },
      fetch: async (url, init) => {
        seen.push({ url, init });
        return jsonResponse(validAnswers);
      },
    });

    const result = await client.evaluate("candidate state", questions);

    expect(result.answers.same).toEqual({ type: "noul", noul: 0.95 });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toBe(JEV_ENDPOINT);
    expect(seen[0]?.init.redirect).toBe("error");
    const headers = seen[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(String(seen[0]?.init.body));
    expect(body).toEqual({ model: DEFAULT_JEV_MODEL, state: "candidate state", questions });
  });

  test("model comes from JEV_MODEL when set", async () => {
    let body: unknown;
    const client = createJevClient({
      env: { TYPESAFE_API_KEY: "test-key", JEV_MODEL: "jev-1.13.0" },
      fetch: async (_url, init) => {
        body = JSON.parse(String(init.body));
        return jsonResponse({ ...validAnswers, model: "jev-1.13.0" });
      },
    });

    await client.evaluate("state", questions);

    expect(body).toMatchObject({ model: "jev-1.13.0" });
  });

  test("transport failure is typed", async () => {
    const client = createJevClient({
      env: { TYPESAFE_API_KEY: "test-key" },
      fetch: async () => {
        throw new TypeError("socket closed");
      },
    });

    await expect(client.evaluate("state", questions)).rejects.toMatchObject({
      reason: "transport",
    });
  });

  test("non-2xx responses are typed with the status", async () => {
    const client = createJevClient({
      env: { TYPESAFE_API_KEY: "test-key" },
      fetch: async () => jsonResponse({ detail: "rate limited" }, 429),
    });

    const failure = await client.evaluate("state", questions).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(JevUnavailable);
    expect(failure).toMatchObject({ reason: "http", status: 429 });
  });

  test("a response missing a requested answer is a schema failure", async () => {
    const client = createJevClient({
      env: { TYPESAFE_API_KEY: "test-key" },
      fetch: async () =>
        jsonResponse({
          ...validAnswers,
          answers: { pick: validAnswers.answers.pick },
        }),
    });

    await expect(client.evaluate("state", questions)).rejects.toMatchObject({ reason: "schema" });
  });

  test("a choice outside the requested criteria is a schema failure", async () => {
    const client = createJevClient({
      env: { TYPESAFE_API_KEY: "test-key" },
      fetch: async () =>
        jsonResponse({
          ...validAnswers,
          answers: {
            ...validAnswers.answers,
            pick: { type: "choice", choice: "gamma/three", confidence: 0.9, probabilities: {} },
          },
        }),
    });

    await expect(client.evaluate("state", questions)).rejects.toMatchObject({ reason: "schema" });
  });

  test("a non-JSON body is a schema failure", async () => {
    const client = createJevClient({
      env: { TYPESAFE_API_KEY: "test-key" },
      fetch: async () => new Response("<html>", { status: 200 }),
    });

    await expect(client.evaluate("state", questions)).rejects.toMatchObject({ reason: "schema" });
  });

  test("more than 255 choices is rejected before any request", async () => {
    let requests = 0;
    const criteria = Object.fromEntries(
      Array.from({ length: 256 }, (_, index) => [`model/${index}`, "option"]),
    );
    const client = createJevClient({
      env: { TYPESAFE_API_KEY: "test-key" },
      fetch: async () => {
        requests++;
        return jsonResponse(validAnswers);
      },
    });

    await expect(
      client.evaluate("state", { pick: { type: "choice", instructions: "Which?", criteria } }),
    ).rejects.toThrow();
    expect(requests).toBe(0);
  });
});
