import { describe, expect, test } from "bun:test";

import { modelHref, modelIdFromRouteSegments, modelRouteSegments } from "../src/lib/model-path";
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

  test("snippets use only the displayed model name and description", () => {
    const description = modelDescription({
      name: "Example",
      description: "No description available yet.",
    });
    expect(description).toBe("Example. No description available yet.");
    expect(description).not.toContain("benchmarks");
    expect(description).not.toContain("context window");
    expect(description).not.toContain("usage limits");
  });

  test("long names and descriptions remain bounded and preserve displayed wording", () => {
    const description = modelDescription({
      name: `Publisher: ${"Long model name ".repeat(20)}`,
      description: "A model for translation. ".repeat(30),
    });
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toStartWith("Publisher:");
    expect(description).toContain("A model for translation.");
    expect(description).not.toContain("  ");
  });
});
