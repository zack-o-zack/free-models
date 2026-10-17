import { describe, expect, test } from "bun:test";
import {
  cataloguePageCount,
  cataloguePageHref,
  cataloguePageModels,
  parseCataloguePage,
} from "../src/lib/catalogue-pagination";
import type { ModelSummary } from "../src/lib/model-types";
import { catalogueJsonLd } from "../src/lib/seo";

const models = Array.from({ length: 43 }, (_, index) => ({
  id: `maker/${index}`,
  name: `Model ${index}`,
  created: index,
})) as ModelSummary[];

describe("Crawlable catalogue pagination", () => {
  test("covers the catalogue exactly once in newest-first pages of 20", () => {
    const pages = Array.from({ length: cataloguePageCount(models.length) }, (_, index) =>
      cataloguePageModels(models, index + 1),
    );
    expect(pages.map((page) => page.length)).toEqual([20, 20, 3]);
    expect(pages.flat().map((model) => model.id)).toEqual(
      [...models].reverse().map((model) => model.id),
    );
    expect(models[0].created).toBe(0);
    expect(cataloguePageHref(1)).toBe("/");
    expect(cataloguePageHref(2)).toBe("/catalogue/2");
  });

  test.each(["0", "1", "01", "2.0", "-2", "4", "2abc", "9007199254740992"])(
    "rejects invalid or duplicate page route %s",
    (value) => {
      expect(parseCataloguePage(value, models.length)).toBeNull();
    },
  );

  test("last page and schema retain the full count and absolute list positions", () => {
    expect(parseCataloguePage("3", models.length)).toBe(3);
    const schema = catalogueJsonLd(cataloguePageModels(models, 3), {
      page: 3,
      total: models.length,
    });
    expect(schema.url).toEndWith("/catalogue/3");
    expect(schema.mainEntity.numberOfItems).toBe(43);
    expect(schema.mainEntity.itemListElement.map((item) => item.position)).toEqual([41, 42, 43]);
    expect(cataloguePageCount(0)).toBe(1);
    expect(cataloguePageModels([], 1)).toEqual([]);
  });
});
