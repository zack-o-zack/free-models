import { expect, spyOn, test } from "bun:test";
import { type ActiveCanonicalModel, withMetadataFallback } from "../src/metadata/provider.ts";
import { VercelMetadataProvider } from "../src/metadata/vercel.ts";
import { VERCEL_MODELS_URL } from "../src/providers/vercel.ts";

function active(id: string, providerId = "vercel", offerId = id): ActiveCanonicalModel {
  return {
    model: { id, name: id },
    offers: [
      {
        provider: providerId,
        offer: {
          model_id: offerId,
          name: offerId,
          connection: { protocol: "openai", base_url: "https://ai-gateway.vercel.sh/v1" },
          limits: { terms: ["Free"] },
        },
      },
    ],
  };
}

test("metadata fallback receives only missing identities and preserves primary records", async () => {
  const preferred = { description: "Primary" };
  const provider = withMetadataFallback(
    { enrich: async () => new Map([["vendor/primary", preferred]]) },
    {
      enrich: async (models) => {
        expect(models.map(({ model }) => model.id)).toEqual(["vendor/fallback"]);
        return new Map([
          ["vendor/fallback", { description: "Fallback" }],
          ["vendor/primary", { description: "Must not override" }],
        ]);
      },
    },
  );
  const results = await provider.enrich([
    active("vendor/primary"),
    {
      ...active("vendor/fallback"),
      previousMetadata: { embedding_dimensions: [1024], description: "Stale" },
    },
  ]);
  expect(results.get("vendor/primary")).toEqual(preferred);
  expect(results.get("vendor/fallback")).toEqual({
    description: "Fallback",
    embedding_dimensions: [1024],
  });
});

test("fallback failure preserves successful primary metadata", async () => {
  const warning = spyOn(console, "warn").mockImplementation(() => {});
  try {
    const primary = new Map([["vendor/primary", { description: "Primary" }]]);
    const provider = withMetadataFallback(
      { enrich: async () => primary },
      {
        enrich: async () => {
          throw new Error("Unavailable");
        },
      },
    );
    expect(await provider.enrich([active("vendor/fallback")])).toEqual(primary);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("retaining primary results"));
  } finally {
    warning.mockRestore();
  }
});

test("Vercel metadata follows reviewed offer IDs and keeps native model types", async () => {
  const catalogue = [
    { copyString: "alias/voice", displayName: "Voice", type: "speech", availableToFreeTier: true },
    {
      copyString: "deepseek/search",
      displayName: "Search",
      type: "tool",
      availableToFreeTier: true,
    },
    {
      copyString: "vendor/incomplete",
      displayName: "Incomplete",
      type: "chat",
      availableToFreeTier: true,
    },
  ];
  const row = `1:["$","$L2",null,${JSON.stringify({ models: catalogue })}]\n`;
  const provider = new VercelMetadataProvider({
    fetch: async (url) =>
      url === VERCEL_MODELS_URL
        ? Response.json({
            data: [
              {
                id: "alias/voice",
                description: "Source voice",
                modalities: { input: ["text"], output: ["audio"] },
              },
              { id: "vendor/incomplete", context_window: 1000 },
            ],
          })
        : new Response(`<script>self.__next_f.push(${JSON.stringify([1, row])})</script>`),
  });
  const results = await provider.enrich([
    active("vendor/voice", "vercel", "alias/voice"),
    active("deepseek/search"),
    active("vendor/incomplete"),
    active("vendor/unrelated", "other"),
  ]);
  expect(results.get("vendor/voice")).toMatchObject({
    description: "Source voice",
    model_type: "speech",
    architecture: { input_modalities: ["text"], output_modalities: ["audio"] },
    metadata_source: { model_id: "alias/voice", url: VERCEL_MODELS_URL },
  });
  expect(results.get("deepseek/search")?.model_type).toBe("tool");
  expect(results.has("vendor/incomplete")).toBe(false);
  expect(results.has("vendor/unrelated")).toBe(false);
});

test("Vercel metadata rejects duplicate or missing source IDs", async () => {
  for (const data of [[{ id: "vendor/model" }, { id: "vendor/model" }], [{}]]) {
    const provider = new VercelMetadataProvider({
      fetch: async (url) =>
        url === VERCEL_MODELS_URL ? Response.json({ data }) : new Response("unused"),
    });
    await expect(provider.enrich([active("vendor/model")])).rejects.toThrow(
      data.length === 2 ? "duplicate ID" : "id",
    );
  }
});
