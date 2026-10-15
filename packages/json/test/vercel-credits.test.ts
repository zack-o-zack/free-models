import { expect, test } from "bun:test";
import { limitsSchema } from "../src/catalogue/schema.ts";
import { VERCEL_MODELS_URL, VercelProvider } from "../src/providers/vercel.ts";
import { parseVercelCatalogue } from "../src/providers/vercel-catalogue.ts";

const eligible = {
  copyString: "maker/paid",
  displayName: "Paid",
  type: "chat",
  availableToFreeTier: true,
};
function page(models: unknown[], split = false) {
  const row = `1:["$","$L2",null,${JSON.stringify({ models })}]\n`;
  const chunks = split ? [row.slice(0, 60), row.slice(60)] : [row];
  return chunks
    .map((chunk) => `<script>self.__next_f.push(${JSON.stringify([1, chunk])})</script>`)
    .join("");
}

test("discovers credit-eligible offers across modalities and distinguishes zero-price offers", async () => {
  const models = [
    eligible,
    { ...eligible, copyString: "maker/free", availableToFreeTier: true },
    { ...eligible, copyString: "maker/excluded", availableToFreeTier: false },
    ...[
      "image",
      "embedding",
      "speech",
      "transcription",
      "realtime",
      "reranking",
      "decision",
      "tool",
    ].map((type) => ({ ...eligible, copyString: `maker/${type}`, type })),
  ];
  const provider = new VercelProvider({
    fetch: async (url) =>
      url === VERCEL_MODELS_URL
        ? Response.json({
            object: "list",
            data: [
              {
                id: "maker/free",
                name: "Free",
                type: "language",
                pricing: { input: "0", output: "0" },
              },
              {
                id: "maker/paid",
                name: "Paid",
                type: "language",
                pricing: { input: "1", output: "2" },
              },
            ],
          })
        : new Response(page(models, true)),
  });
  const offers = await provider.discover(new Map());
  expect(offers).toHaveLength(10);
  expect(offers.find((o) => o.model_id === "maker/excluded")).toBeUndefined();
  expect(offers.find((o) => o.model_id === "maker/free")?.limits).toMatchObject({
    funding: "no_credits",
    terms: expect.arrayContaining(["Free — no credits used"]),
  });
  const paid = offers.find((o) => o.model_id === "maker/paid");
  expect(paid?.limits).toMatchObject({
    funding: "monthly_credits",
    terms: expect.arrayContaining([
      "Free with $5 monthly credits",
      "$5 / month shared across all eligible models in the Vercel team",
    ]),
  });
  expect(paid?.connection.protocol).toBe("openai");
  expect(offers.find((o) => o.model_id === "maker/image")?.connection).toMatchObject({
    protocol: "vercel-ai-gateway",
    model_type: "image",
  });
});

test("eligibility parsing fails closed on missing flags, duplicate IDs, or changed markup", async () => {
  await expect(parseVercelCatalogue("Maintenance")).rejects.toThrow("no unique");
  await expect(
    parseVercelCatalogue(page([{ ...eligible, availableToFreeTier: undefined }])),
  ).rejects.toThrow();
  await expect(parseVercelCatalogue(page([eligible, eligible]))).rejects.toThrow("duplicate");
  expect(
    await parseVercelCatalogue(page([{ ...eligible, availableToFreeTier: false }], true)),
  ).toHaveLength(1);
});

test("funding is optional for existing offers and constrained for classified offers", () => {
  expect(limitsSchema.parse({ terms: ["10 req / min"] })).toEqual({ terms: ["10 req / min"] });
  expect(() => limitsSchema.parse({ terms: ["Free"], funding: "unlimited" })).toThrow();
});
