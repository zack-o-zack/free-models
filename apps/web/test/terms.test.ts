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

describe("Terms & Conditions content and disclaimer verification", () => {
  test("termsData includes explicit disclaimer of third-party ownership", () => {
    expect(termsData.summaryNotice).toContain("do not own");
    const noOwnershipHighlight = termsData.highlights.find((h) => h.id === "no-ownership");
    expect(noOwnershipHighlight).toBeDefined();
    expect(noOwnershipHighlight?.description.toLowerCase()).toContain("do not own");

    const ownershipSection = termsData.sections.find((s) => s.id === "third-party-ownership");
    expect(ownershipSection).toBeDefined();
    expect(ownershipSection?.content.some((p) => p.includes("zero ownership"))).toBe(true);
  });

  test("termsData clarifies that claims and limits are provider-dependent and may be outdated", () => {
    expect(termsData.providerClaimsDisclaimer.toLowerCase()).toContain("provider-dependent");
    expect(termsData.providerClaimsDisclaimer.toLowerCase()).toContain("outdated");

    const providerHighlight = termsData.highlights.find((h) => h.id === "provider-dependent");
    expect(providerHighlight).toBeDefined();
    expect(providerHighlight?.description.toLowerCase()).toContain("provider");

    const accuracySection = termsData.sections.find((s) => s.id === "accuracy-and-claims");
    expect(accuracySection).toBeDefined();
    expect(accuracySection?.content.some((p) => p.includes("outdated"))).toBe(true);
  });

  test("termsData explicitly protects against provider falsehoods / lies and disclaims liability", () => {
    expect(termsData.providerClaimsDisclaimer.toLowerCase()).toContain(
      "cannot be blamed or held liable",
    );

    const liabilityHighlight = termsData.highlights.find((h) => h.id === "no-blame");
    expect(liabilityHighlight).toBeDefined();
    expect(liabilityHighlight?.description.toLowerCase()).toContain("zero liability");

    const liabilitySection = termsData.sections.find(
      (s) => s.id === "no-liability-provider-falsehoods",
    );
    expect(liabilitySection).toBeDefined();
    expect(
      liabilitySection?.content.some((p) =>
        p.toLowerCase().includes("cannot and will not be blamed or held liable"),
      ),
    ).toBe(true);
  });

  test("termsData states that logos and trademarks belong to publishers and providers", () => {
    expect(termsData.trademarkDisclaimer.toLowerCase()).toContain(
      "belong exclusively to their respective owners",
    );
    expect(termsData.trademarkDisclaimer.toLowerCase()).toContain("publishers");
    expect(termsData.trademarkDisclaimer.toLowerCase()).toContain("providers");

    const tmHighlight = termsData.highlights.find((h) => h.id === "trademarks");
    expect(tmHighlight).toBeDefined();
    expect(tmHighlight?.description.toLowerCase()).toContain(
      "intellectual property of their respective creators, publishers, and providers",
    );

    const tmSection = termsData.sections.find((s) => s.id === "third-party-ownership");
    expect(tmSection).toBeDefined();
    expect(tmSection?.content.some((p) => p.includes("exclusive property"))).toBe(true);
  });

  test("terms page metadata conforms to SEO requirements", () => {
    const desc =
      "Terms and conditions, trademark ownership notices, provider-dependent claims disclaimer, and limitation of liability for Free Models.";
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
