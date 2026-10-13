import { describe, expect, test } from "bun:test";
import { entityHref, getCatalogueEntities, getEntityDocs } from "../src/lib/catalogue-entities";
import type { ModelSummary } from "../src/lib/model-types";

function model(id: string, providers: string[], extra: Partial<ModelSummary> = {}): ModelSummary {
  return {
    id,
    name: id,
    author: "Maker",
    providers,
    providerNames: {},
    providerDocs: {},
    isStealth: id.startsWith("stealth:"),
    ...extra,
  } as ModelSummary;
}

const models = [
  model("maker/one", ["host", "other", "host"]),
  model("maker/two", ["host"]),
  model("stealth:hidden", ["other"]),
  model("unknown", ["other"]),
  model("another/three", ["other"], { author: "Maker", providerNames: { host: "Live Host" } }),
];

describe("Catalogue entity membership", () => {
  test("counts a model once per provider and uses catalogue display names", () => {
    const host = getCatalogueEntities(models, "providers").find((entity) => entity.slug === "host");
    expect(host?.name).toBe("Live Host");
    expect(host?.models.map((entry) => entry.id)).toEqual(["maker/one", "maker/two"]);
  });

  test("groups publishers by identity, excludes undisclosed publishers, and keeps shared names separate", () => {
    const publishers = getCatalogueEntities(models, "publishers");
    expect(publishers.map((entity) => entity.slug).sort()).toEqual(["another", "maker"]);
    expect(publishers.find((entity) => entity.slug === "maker")?.models).toHaveLength(2);
    expect(
      getCatalogueEntities(models, "providers").find((entity) => entity.slug === "other")?.models,
    ).toHaveLength(4);
  });

  test("encodes provider variants without merging them", () => {
    expect(entityHref("providers", "host:free tier")).toBe("/providers/host%3Afree%20tier");
    expect(
      getCatalogueEntities([model("maker/a", ["host", "host:free"])], "providers"),
    ).toHaveLength(2);
  });

  test("uses only the selected provider's valid, deduplicated documentation", () => {
    const entity = {
      slug: "host",
      name: "Host",
      models: [
        model("maker/a", ["host"], {
          providerDocs: {
            host: {
              overview: "https://host.test/docs",
              models: "https://host.test/docs",
              pricing: "javascript:alert(1)",
              rateLimit: "invalid",
            },
            other: { overview: "https://other.test/docs" },
          },
        }),
      ],
    };
    expect(getEntityDocs(entity)).toEqual([
      { label: "Documentation", url: "https://host.test/docs" },
    ]);
  });
});
