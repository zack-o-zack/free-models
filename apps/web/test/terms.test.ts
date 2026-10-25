import { describe, expect, mock, test } from "bun:test";
import { pageMetadata } from "../src/lib/seo";
import { termsData } from "../src/lib/terms-data";

mock.module("../src/lib/model-data", () => ({
  getModels: async () => ({
    models: [
      {
        id: "meta/llama-3-8b",
        name: "Llama 3 8B",
        author: "Meta",
        providers: ["groq"],
      },
    ],
    githubStars: 100,
  }),
}));

function contentContain(id: string, needle: string) {
  const section = termsData.sections.find((s) => s.id === id);
  expect(section, `section ${id} should exist`).toBeDefined();
  return section?.content.some((p) => p.toLowerCase().includes(needle.toLowerCase())) ?? false;
}

describe("Terms & Conditions content verification", () => {
  test("termsData includes explicit disclaimer of third-party ownership", () => {
    expect(
      contentContain("no-ownership", "belong to their respective providers and publishers"),
    ).toBe(true);
    expect(contentContain("no-ownership", "free models claims no ownership")).toBe(true);
  });

  test("termsData states trademarks and logos belong to publishers and providers", () => {
    expect(contentContain("no-ownership", "trademarks")).toBe(true);
    expect(contentContain("no-ownership", "logos")).toBe(true);
    expect(contentContain("no-ownership", "publishers")).toBe(true);
  });

  test("termsData clarifies that claims and limits are provider-dependent and may be outdated", () => {
    expect(contentContain("accuracy", "determined solely by the respective providers")).toBe(true);
    expect(contentContain("accuracy", "outdated")).toBe(true);
    expect(contentContain("accuracy", "without notice")).toBe(true);
  });

  test("termsData disclaims liability for third-party provider conduct and misrepresentation", () => {
    expect(contentContain("third-party", "misrepresented capabilities")).toBe(true);
    expect(contentContain("third-party", "not responsible for")).toBe(true);
    expect(contentContain("third-party", "at your own risk")).toBe(true);
  });

  test("termsData says the site does not host or operate models", () => {
    expect(contentContain("about-the-service", "informational only")).toBe(true);
    expect(contentContain("about-the-service", "host, serve, or operate")).toBe(true);
  });

  test("terms page metadata conforms to SEO requirements", () => {
    const desc =
      "The terms and conditions that apply to using Free Models, including trademark ownership and third-party liability notices.";
    const meta = pageMetadata("Terms & Conditions", desc, "/terms");
    expect(meta.title).toEqual({ absolute: "Terms & Conditions | Free Models" });
    expect(typeof meta.description).toBe("string");
    expect((meta.description as string).length).toBeLessThanOrEqual(160);
  });

  test("sitemap includes /terms endpoint", async () => {
    const sitemap = (await import("../src/app/sitemap")).default;
    const map = await sitemap();
    const urls = map.map((item) => item.url);
    expect(urls.some((u) => u.endsWith("/terms"))).toBe(true);
  });
});
