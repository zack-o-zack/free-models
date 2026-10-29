import { expect, test } from "bun:test";
import {
  ANYAPI_MODELS_URL,
  AnyApiProvider,
  parseAnyApiCatalogue,
  parseAnyApiModelId,
} from "../src/providers/anyapi.ts";
import { ANYAPI_COMPLIANCE } from "../src/providers/anyapi-policies.ts";

function card(tier: string, name: string, href = "/ai-models/free"): string {
  return `<div class="ailist_card"><div fs-list-field="tier">${tier}</div><a fs-list-field="name" href="${href}">${name}</a></div>`;
}

const detail = '<div class="model_ctas-id"><span>vendor/model:free</span><img /></div>';

test("follows catalogue pagination and reads exact model IDs from Free cards", async () => {
  const visited: string[] = [];
  const provider = new AnyApiProvider({
    fetch: async (url) => {
      visited.push(url);
      if (url === ANYAPI_MODELS_URL)
        return new Response(
          `${card("Premium", "Paid")}<a class="w-pagination-next" href="?page=2">Next</a>`,
        );
      if (url === `${ANYAPI_MODELS_URL}?page=2`) return new Response(card(" Free ", "Free Model"));
      expect(url).toBe(`${ANYAPI_MODELS_URL}/free`);
      return new Response(detail);
    },
  });
  const offers = await provider.discover(new Map());
  expect(visited).toHaveLength(3);
  expect(offers).toEqual([
    {
      model_id: "vendor/model:free",
      name: "Vendor: Model",
      connection: {
        base_url: "https://api.anyapi.ai/v1",
        protocol: "openai",
        auth: { env: ["ANYAPI_KEY"] },
      },
      limits: { terms: ["100k ANY Tokens / day", "Limited API calls (Free plan)"] },
      compliance: ANYAPI_COMPLIANCE,
    },
  ]);
});

test("does not infer free eligibility from the name, missing tier, or Basic tier", async () => {
  const page = await parseAnyApiCatalogue(
    card("Premium", "Model (free)") + card("Basic", "Basic") + card("", "Unknown"),
  );
  expect(page.models).toEqual([]);
});

test("rejects malformed pages and missing or ambiguous model IDs", async () => {
  await expect(parseAnyApiCatalogue("Unavailable")).rejects.toThrow("no model cards");
  await expect(parseAnyApiCatalogue('<div class="ailist_card">Free</div>')).rejects.toThrow(
    "incomplete",
  );
  await expect(parseAnyApiModelId("Unavailable")).rejects.toThrow("no unique valid");
  await expect(parseAnyApiModelId(detail + detail)).rejects.toThrow("no unique valid");
});

test("rejects pagination cycles and links outside the catalogue", async () => {
  for (const href of [ANYAPI_MODELS_URL, "https://example.com/ai-models?page=2"]) {
    const provider = new AnyApiProvider({
      fetch: async () =>
        new Response(
          `${card("Premium", "Paid")}<a class="w-pagination-next" href="${href}">Next</a>`,
        ),
    });
    await expect(provider.discover(new Map())).rejects.toThrow();
  }
});

test("rejects duplicate IDs and HTTP failures", async () => {
  const duplicate = new AnyApiProvider({
    fetch: async (url) =>
      new Response(
        url === ANYAPI_MODELS_URL
          ? card("Free", "First") + card("Free", "Second", "/ai-models/second")
          : detail,
      ),
  });
  await expect(duplicate.discover(new Map())).rejects.toThrow("duplicate model ID");
  const unavailable = new AnyApiProvider({
    fetch: async () => new Response("Unavailable", { status: 503 }),
  });
  await expect(unavailable.discover(new Map())).rejects.toThrow("HTTP status 503");
});

test("uses the published API identity when the catalogue label names a different model", async () => {
  const provider = new AnyApiProvider({
    fetch: async (url) =>
      new Response(
        url === ANYAPI_MODELS_URL
          ? card("Free", "Google: Gemma 3n 4B (free)")
          : '<div class="model_ctas-id">google/gemma-4-26b-a4b-it:free</div>',
      ),
  });
  const [offer] = await provider.discover(new Map());
  expect(offer?.model_id).toBe("google/gemma-4-26b-a4b-it:free");
  expect(offer?.name).toBe("Google: Gemma 4 26b a4b it");
});
