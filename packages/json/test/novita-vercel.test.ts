import { expect, test } from "bun:test";
import { NOVITA_MODELS_URL, NovitaProvider } from "../src/providers/novita.ts";
import { VERCEL_MODELS_URL, VercelProvider } from "../src/providers/vercel.ts";

const novitaModel = {
  id: "apodex/mini",
  display_name: "Mini",
  status: 1,
  model_type: "chat",
  input_token_price_per_m: 0,
  output_token_price_per_m: 0,
  is_tiered_billing: false,
};
const pricingPage = '<a href="/models/model-detail/apodex-mini?from=pricing">Mini</a>';
function novita(models: unknown[], html = pricingPage) {
  return new NovitaProvider({
    fetch: async (url) =>
      url === NOVITA_MODELS_URL ? Response.json({ data: models }) : new Response(html),
  });
}
const vercelModel = {
  id: "publisher/free",
  name: "Free",
  type: "language",
  pricing: { input: "0", output: "0" },
};
function vercel(models: unknown[]) {
  return new VercelProvider({
    fetch: async (url) => {
      if (url === VERCEL_MODELS_URL) return Response.json({ object: "list", data: models });
      return new Response(
        vercelPage([
          {
            copyString: "publisher/free",
            displayName: "Free",
            type: "chat",
            availableToFreeTier: false,
          },
        ]),
      );
    },
  });
}

export function vercelPage(models: unknown[]): string {
  const row = `1:["$","$L2",null,${JSON.stringify({ models })}]\n`;
  return `<script>self.__next_f.push(${JSON.stringify([1, row])})</script>`;
}

test("Novita requires public listing, active chat model, and zero non-tiered pricing", async () => {
  const offers = await novita([novitaModel, { ...novitaModel, id: "dev/hidden" }]).discover(
    new Map(),
  );
  expect(offers.map((offer) => offer.model_id)).toEqual(["apodex/mini"]);
  expect(offers[0]?.connection).toEqual({
    base_url: "https://api.novita.ai/openai",
    protocol: "openai",
    auth: { env: ["NOVITA_API_KEY"] },
  });
  for (const patch of [
    { status: 0 },
    { model_type: "embedding" },
    { input_token_price_per_m: 1 },
    { output_token_price_per_m: 1 },
    { input_token_price_per_m: undefined },
    { is_tiered_billing: true },
  ]) {
    expect(await novita([{ ...novitaModel, ...patch }]).discover(new Map())).toEqual([]);
  }
});

test("Vercel excludes paid and ambiguous pricing when models are not credit eligible", async () => {
  const offers = await vercel([vercelModel]).discover(new Map());
  expect(offers[0]?.connection).toEqual({
    base_url: "https://ai-gateway.vercel.sh/v1",
    protocol: "openai",
    auth: { env: ["AI_GATEWAY_API_KEY"] },
  });
  for (const pricing of [
    { input: "0", output: "1" },
    { input: "1", output: "0" },
    { input: "0" },
    { input: "", output: "" },
    { input: null, output: null },
    { input: "0", output: "0", input_cache_read: "1" },
    { input: "0", output: "0", varies_by_provider: true },
  ]) {
    expect(await vercel([{ ...vercelModel, pricing }]).discover(new Map())).toEqual([]);
  }

  expect(
    (await vercel([{ ...vercelModel, pricing: { input: 0, output: "0.00" } }]).discover(new Map()))
      .length,
  ).toBe(1);
});

test("discovery rejects duplicate IDs and unexpected upstream responses", async () => {
  await expect(novita([novitaModel, novitaModel]).discover(new Map())).rejects.toThrow("duplicate");
  await expect(vercel([vercelModel, vercelModel]).discover(new Map())).rejects.toThrow("duplicate");
  await expect(novita([novitaModel], "Maintenance").discover(new Map())).rejects.toThrow(
    "no model links",
  );
  for (const Provider of [NovitaProvider, VercelProvider]) {
    await expect(
      new Provider({ fetch: async () => new Response("Unavailable", { status: 503 }) }).discover(
        new Map(),
      ),
    ).rejects.toThrow("HTTP status 503");
    await expect(
      new Provider({ fetch: async () => Response.json({ error: "unexpected" }) }).discover(
        new Map(),
      ),
    ).rejects.toThrow();
  }
});
