import { describe, expect, test } from "bun:test";

import { modelHref, modelIdFromRouteSegments, modelRouteSegments } from "../src/lib/model-path";
import type { ModelSummary } from "../src/lib/model-types";
import { modelDescription, serializeJsonLd } from "../src/lib/seo";

describe("SEO catalogue boundaries", () => {
  test.each(["google/gemini-2.5-pro", "stealth:alpha", "publisher/model with spaces:free"])(
    "keeps links and static parameters consistent for %s",
    (id) => {
      const route = modelHref(id).slice("/models/".length).split("/").map(decodeURIComponent);
      expect(route).toEqual(modelRouteSegments(id));
      expect(modelIdFromRouteSegments(route)).toBe(id);
      expect(modelHref(id)).not.toContain(" ");
    },
  );

  test("catalogue text cannot terminate the JSON-LD script", () => {
    const data = { name: '</script><script>alert("x")</script>', description: "A < B & C" };
    const serialized = serializeJsonLd(data);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(data);
  });

  test("long names produce bounded, readable descriptions without losing the API context", () => {
    const model = { name: `Publisher: ${"Long model name ".repeat(20)}` } as ModelSummary;
    const description = modelDescription(model);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toStartWith("Compare Publisher:");
    expect(description).toEndWith("supported formats, and benchmarks.");
    expect(description).not.toContain("  ");
  });
});
