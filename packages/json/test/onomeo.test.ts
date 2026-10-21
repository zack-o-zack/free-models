import { expect, test } from "bun:test";
import { onomeoPublishedLimits } from "../src/providers/limits.ts";
import {
  isFreeOnomeoModel,
  ONOMEO_API_BASE_URL,
  ONOMEO_INFO_URL,
  OnomeoProvider,
} from "../src/providers/onomeo.ts";

test("discovers free models and skips routing endpoints", async () => {
  const provider = new OnomeoProvider({
    fetch: async (url, init) => {
      expect(url).toBe(ONOMEO_INFO_URL);
      expect(new Headers(init?.headers).get("accept")).toBe("application/json");
      return Response.json({
        freeModels: ["auto", "deepseek-v4-flash", "glm-5.2", "gemini-3.1-flash-lite"],
      });
    },
  });

  const offers = await provider.discover(new Map());

  expect(offers.map((offer) => offer.model_id)).toEqual([
    "deepseek-v4-flash",
    "gemini-3.1-flash-lite",
    "glm-5.2",
  ]);
  expect(offers[0]?.connection).toEqual({
    base_url: ONOMEO_API_BASE_URL,
    protocol: "openai",
    auth: { env: ["ONOMEO_API_KEY"] },
  });
  expect(offers[0]?.limits.terms).toEqual(["12 req / min", "30 req / 5 hr"]);
});

test("returns hardcoded published Onomeo limits", () => {
  expect(onomeoPublishedLimits()).toEqual({
    terms: ["12 req / min", "30 req / 5 hr"],
  });
});

test("uses an environment key supplied by models.dev when available", async () => {
  const provider = new OnomeoProvider({
    fetch: async () =>
      Response.json({
        freeModels: ["deepseek-v4-flash"],
      }),
  });
  const modelsDev = new Map([["onomeo", { id: "onomeo", env: ["ONOMEO_CUSTOM_KEY"] }]]);

  const offers = await provider.discover(modelsDev);

  expect(offers[0]?.connection.auth).toEqual({ env: ["ONOMEO_CUSTOM_KEY"] });
});

test("rejects malformed responses, duplicate IDs, empty lists, and HTTP failures", async () => {
  const malformed = new OnomeoProvider({
    fetch: async () => Response.json({ error: "unexpected" }),
  });
  await expect(malformed.discover(new Map())).rejects.toThrow();

  const duplicate = new OnomeoProvider({
    fetch: async () =>
      Response.json({
        freeModels: ["deepseek-v4-flash", "deepseek-v4-flash"],
      }),
  });
  await expect(duplicate.discover(new Map())).rejects.toThrow("duplicate model ID");

  const empty = new OnomeoProvider({
    fetch: async () =>
      Response.json({
        freeModels: [],
      }),
  });
  await expect(empty.discover(new Map())).rejects.toThrow();

  const routerOnly = new OnomeoProvider({
    fetch: async () =>
      Response.json({
        freeModels: ["auto"],
      }),
  });
  await expect(routerOnly.discover(new Map())).rejects.toThrow("no free models");

  const unavailable = new OnomeoProvider({
    fetch: async () => new Response("Unavailable", { status: 503 }),
  });
  await expect(unavailable.discover(new Map())).rejects.toThrow("HTTP status 503");
});

test("identifies router endpoints and valid model IDs", () => {
  expect(isFreeOnomeoModel("auto")).toBe(false);
  expect(isFreeOnomeoModel("")).toBe(false);
  expect(isFreeOnomeoModel("  ")).toBe(false);
  expect(isFreeOnomeoModel("deepseek-v4-flash")).toBe(true);
  expect(isFreeOnomeoModel("stealth/glyph-cluster")).toBe(true);
});
