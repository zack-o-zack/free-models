import { expect, test } from "bun:test";
import {
  COMMANDCODE_API_BASE_URL,
  COMMANDCODE_MODELS_URL,
  COMMANDCODE_PRICING_URL,
  CommandCodeProvider,
  isFreeCommandCodeModel,
  matchCommandCodeLimits,
  parseCommandCodeDeals,
  parseCommandCodeModels,
} from "../src/providers/commandcode.ts";

const SAMPLE_PRICING_HTML = `
<article id="laguna-s-2.1-free">
  <div class="text-[11px]">Free while capacity lasts</div>
  <span>100%</span><span>off</span>
  <code>laguna-s-2.1-free</code>
  <dt>Discount</dt><dd>100%</dd>
  <dt>Term</dt><dd>while capacity lasts</dd>
  <p>Laguna S 2.1 is free while capacity lasts.</p>
</article>
<article id="glyph-cluster-free">
  <div class="text-[11px]">Free while the stealth preview lasts</div>
  <span>100%</span><span>off</span>
  <code>glyph-cluster:free</code>
  <dt>Discount</dt><dd>100%</dd>
  <dt>Term</dt><dd>while the stealth preview lasts</dd>
  <p>100 requests a day, per account: the quota resets at midnight UTC.</p>
</article>
<article id="beam-free">
  <div class="text-[11px]">Free while capacity lasts</div>
  <span>100%</span><span>off</span>
  <code>beam:free</code>
  <dt>Discount</dt><dd>100%</dd>
  <dt>Term</dt><dd>while capacity lasts</dd>
  <p>No daily request limit: use it as much as you like while the free tier lasts.</p>
</article>
<article id="paid-deal">
  <span>50%</span><span>off</span>
  <code>minimax-m3</code>
  <dt>Discount</dt><dd>50%</dd>
  <dt>Term</dt><dd>while capacity lasts</dd>
</article>
`;

test("discovers free models and parses deal limits dynamically", async () => {
  const provider = new CommandCodeProvider({
    fetch: async (url, init) => {
      if (url === COMMANDCODE_MODELS_URL) {
        expect(new Headers(init?.headers).get("accept")).toBe("application/json");
        return Response.json({
          object: "list",
          data: [
            {
              id: "Qwen/Qwen3.8-Max",
              object: "model",
              name: "Qwen 3.8 Max",
            },
            {
              id: "poolside/laguna-s-2.1-free",
              object: "model",
              name: "Laguna S 2.1",
            },
            {
              id: "stealth/glyph-cluster:free",
              object: "model",
              name: "Glyph Cluster",
            },
            {
              id: "reflection/beam:free",
              object: "model",
              name: "Beam 1.0",
            },
          ],
        });
      }
      if (url === COMMANDCODE_PRICING_URL) {
        return new Response(SAMPLE_PRICING_HTML, {
          headers: { "content-type": "text/html" },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  const offers = await provider.discover(new Map());

  expect(offers.map((offer) => offer.model_id)).toEqual([
    "poolside/laguna-s-2.1-free",
    "reflection/beam:free",
    "stealth/glyph-cluster:free",
  ]);
  expect(offers.map((offer) => offer.name)).toEqual(["Laguna S 2.1", "Beam 1.0", "Glyph Cluster"]);
  expect(offers[0]?.connection).toEqual({
    base_url: COMMANDCODE_API_BASE_URL,
    protocol: "openai",
    auth: { env: ["CMD_API_KEY"] },
  });
  expect(offers[0]?.limits.terms).toEqual(["No daily request limit (while capacity lasts)"]);
  expect(offers[1]?.limits.terms).toEqual(["No daily request limit (while capacity lasts)"]);
  expect(offers[2]?.limits.terms).toEqual(["100 req / day"]);
});

test("parses deal limits from pricing HTML dynamically", () => {
  const deals = parseCommandCodeDeals(SAMPLE_PRICING_HTML);

  expect(deals.size).toBe(3);
  expect(deals.get("glyph-cluster:free")).toEqual({
    terms: ["100 req / day"],
  });
  expect(deals.get("beam:free")).toEqual({
    terms: ["No daily request limit (while capacity lasts)"],
  });
  expect(deals.get("laguna-s-2.1-free")).toEqual({
    terms: ["No daily request limit (while capacity lasts)"],
  });
  expect(deals.has("minimax-m3")).toBe(false);
});

test("matches model limits against parsed deals and falls back when unlisted", () => {
  const deals = parseCommandCodeDeals(SAMPLE_PRICING_HTML);

  expect(matchCommandCodeLimits("stealth/glyph-cluster:free", deals)).toEqual({
    terms: ["100 req / day"],
  });
  expect(matchCommandCodeLimits("reflection/beam:free", deals)).toEqual({
    terms: ["No daily request limit (while capacity lasts)"],
  });
  expect(matchCommandCodeLimits("poolside/laguna-s-2.1-free", deals)).toEqual({
    terms: ["No daily request limit (while capacity lasts)"],
  });
  expect(matchCommandCodeLimits("newbrand/future-model:free", deals)).toEqual({
    terms: ["No daily request limit (while capacity lasts)"],
  });
});

test("uses an environment key supplied by models.dev when available", async () => {
  const provider = new CommandCodeProvider({
    fetch: async (url) => {
      if (url === COMMANDCODE_MODELS_URL) {
        return Response.json({
          object: "list",
          data: [{ id: "reflection/beam:free", name: "Beam 1.0" }],
        });
      }
      return new Response(SAMPLE_PRICING_HTML);
    },
  });
  const modelsDev = new Map([["commandcode", { id: "commandcode", env: ["CUSTOM_CMD_KEY"] }]]);

  const offers = await provider.discover(modelsDev);

  expect(offers[0]?.connection.auth).toEqual({ env: ["CUSTOM_CMD_KEY"] });
});

test("falls back to desluggified model id when name is missing or empty", async () => {
  const provider = new CommandCodeProvider({
    fetch: async (url) => {
      if (url === COMMANDCODE_MODELS_URL) {
        return Response.json({
          object: "list",
          data: [{ id: "test/unnamed-model:free", name: "   " }],
        });
      }
      return new Response(SAMPLE_PRICING_HTML);
    },
  });

  const offers = await provider.discover(new Map());
  expect(offers[0]?.name).toBe("Test: Unnamed model");
});

test("rejects malformed responses, duplicate IDs, empty lists, and HTTP failures", async () => {
  const malformedEnvelope = new CommandCodeProvider({
    fetch: async (url) =>
      url === COMMANDCODE_MODELS_URL
        ? Response.json({ error: "unexpected" })
        : new Response(SAMPLE_PRICING_HTML),
  });
  await expect(malformedEnvelope.discover(new Map())).rejects.toThrow("malformed");

  const malformedData = new CommandCodeProvider({
    fetch: async (url) =>
      url === COMMANDCODE_MODELS_URL
        ? Response.json({ object: "list", data: "not-an-array" })
        : new Response(SAMPLE_PRICING_HTML),
  });
  await expect(malformedData.discover(new Map())).rejects.toThrow("malformed");

  const malformedModel = new CommandCodeProvider({
    fetch: async (url) =>
      url === COMMANDCODE_MODELS_URL
        ? Response.json({ object: "list", data: [123] })
        : new Response(SAMPLE_PRICING_HTML),
  });
  await expect(malformedModel.discover(new Map())).rejects.toThrow("malformed");

  const duplicate = new CommandCodeProvider({
    fetch: async (url) =>
      url === COMMANDCODE_MODELS_URL
        ? Response.json({
            object: "list",
            data: [
              { id: "reflection/beam:free", name: "Beam 1.0" },
              { id: "reflection/beam:free", name: "Beam 1.0" },
            ],
          })
        : new Response(SAMPLE_PRICING_HTML),
  });
  await expect(duplicate.discover(new Map())).rejects.toThrow("duplicate model ID");

  const empty = new CommandCodeProvider({
    fetch: async (url) =>
      url === COMMANDCODE_MODELS_URL
        ? Response.json({
            object: "list",
            data: [],
          })
        : new Response(SAMPLE_PRICING_HTML),
  });
  await expect(empty.discover(new Map())).rejects.toThrow("no free models");

  const paidOnly = new CommandCodeProvider({
    fetch: async (url) =>
      url === COMMANDCODE_MODELS_URL
        ? Response.json({
            object: "list",
            data: [{ id: "openai/gpt-4o", name: "GPT-4o" }],
          })
        : new Response(SAMPLE_PRICING_HTML),
  });
  await expect(paidOnly.discover(new Map())).rejects.toThrow("no free models");

  const unavailable = new CommandCodeProvider({
    fetch: async () => new Response("Service Unavailable", { status: 503 }),
  });
  await expect(unavailable.discover(new Map())).rejects.toThrow("HTTP status 503");
});

test("parses model envelope with parseCommandCodeModels", () => {
  const models = parseCommandCodeModels({
    object: "list",
    data: [
      { id: "poolside/laguna-s-2.1-free", name: "Laguna S 2.1" },
      { id: "paid/model", name: "Paid Model" },
    ],
  });
  expect(models).toHaveLength(1);
  expect(models[0]?.id).toBe("poolside/laguna-s-2.1-free");
});

test("identifies free models correctly with isFreeCommandCodeModel", () => {
  expect(isFreeCommandCodeModel("reflection/beam:free")).toBe(true);
  expect(isFreeCommandCodeModel("poolside/laguna-s-2.1-free")).toBe(true);
  expect(isFreeCommandCodeModel("stealth/glyph-cluster:free")).toBe(true);
  expect(isFreeCommandCodeModel("openai/gpt-4o")).toBe(false);
  expect(isFreeCommandCodeModel("")).toBe(false);
  expect(isFreeCommandCodeModel("   ")).toBe(false);
});
