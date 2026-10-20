import { expect, test } from "bun:test";
import {
  isFreeNousModel,
  NOUS_API_BASE_URL,
  NOUS_MODELS_URL,
  NousProvider,
} from "../src/providers/nous.ts";

test("discovers models only when every billed pricing field is zero", async () => {
  const provider = new NousProvider({
    fetch: async (url, init) => {
      expect(url).toBe(NOUS_MODELS_URL);
      expect(new Headers(init?.headers).get("accept")).toBe("application/json");
      return Response.json({
        data: [
          {
            id: "vendor/paid-output",
            name: "Paid Output",
            pricing: { prompt: "0", completion: "0.1" },
          },
          {
            id: "vendor/free-second",
            name: "Free Second",
            pricing: { prompt: "0.0000000000", completion: "0", input_cache_read: "0" },
          },
          {
            id: "vendor/paid-cache",
            name: "Paid Cache",
            pricing: { prompt: "0", completion: "0", input_cache_read: "0.01" },
          },
          {
            id: "vendor/free-first",
            name: "Free First",
            pricing: { prompt: 0, completion: "0", input_cache_read: "0" },
          },
          { id: "vendor/missing-pricing", name: "Missing Pricing" },
        ],
      });
    },
  });

  const offers = await provider.discover(new Map());

  expect(offers.map((offer) => offer.model_id)).toEqual([
    "vendor/free-first",
    "vendor/free-second",
  ]);
  expect(offers[0]?.connection).toEqual({
    base_url: NOUS_API_BASE_URL,
    protocol: "openai",
    auth: { env: ["NOUS_API_KEY"] },
  });
  expect(offers[0]?.limits.terms).toEqual(["50 req / min", "500k tok / min"]);
});

test("uses an environment key supplied by models.dev when available", async () => {
  const provider = new NousProvider({
    fetch: async () =>
      Response.json({
        data: [{ id: "vendor/free", pricing: { prompt: "0", completion: "0" } }],
      }),
  });
  const modelsDev = new Map([["nous", { id: "nous", env: ["NOUS_PORTAL_API_KEY"] }]]);

  const offers = await provider.discover(modelsDev);

  expect(offers[0]?.connection.auth).toEqual({ env: ["NOUS_PORTAL_API_KEY"] });
});

test("rejects malformed model lists, duplicate IDs, and HTTP failures", async () => {
  const malformed = new NousProvider({ fetch: async () => Response.json({ error: "unexpected" }) });
  await expect(malformed.discover(new Map())).rejects.toThrow();

  const duplicate = new NousProvider({
    fetch: async () =>
      Response.json({
        data: [
          { id: "vendor/free", pricing: { prompt: "0", completion: "0" } },
          { id: "vendor/free", pricing: { prompt: "0", completion: "0" } },
        ],
      }),
  });
  await expect(duplicate.discover(new Map())).rejects.toThrow("duplicate ID");

  const unavailable = new NousProvider({
    fetch: async () => new Response("Unavailable", { status: 503 }),
  });
  await expect(unavailable.discover(new Map())).rejects.toThrow("HTTP status 503");
});

test("treats missing, malformed, or nonzero prices as paid or unknown", () => {
  expect(isFreeNousModel(undefined)).toBe(false);
  expect(isFreeNousModel({ prompt: "0", completion: "0" })).toBe(true);
  expect(isFreeNousModel({ prompt: "0", completion: "0", image: null })).toBe(false);
  expect(isFreeNousModel({ prompt: "0", completion: "0", image: "0.01" })).toBe(false);
});
