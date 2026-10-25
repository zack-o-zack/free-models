import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import brandLogos from "../src/lib/brand-logos.json";
import { providerFaviconUrl, publisherFaviconUrl } from "../src/lib/provider-logos";

const localLogo = /^\/brand-logos\/[a-f0-9]{16}\.(png|jpg|webp|ico|svg)$/;

describe("local brand logo resolution", () => {
  test("known and newly discovered publishers use checked-in snapshots", () => {
    for (const publisher of [
      "amazon",
      "apodex",
      "baseten",
      "bytedance",
      "inception",
      "liquid",
      "routeway",
      "voyage",
      "x-ai",
    ]) {
      expect(publisherFaviconUrl(publisher)).toMatch(localLogo);
    }
  });

  test("publisher aliases resolve to their canonical brand logo", () => {
    for (const alias of ["bytedance-seed", "voyageai", "minimaxai", "preferred-networks", "xai"]) {
      expect(publisherFaviconUrl(alias)).toMatch(localLogo);
    }
  });

  test("invalid and unavailable publishers use initials instead of guessed requests", () => {
    for (const publisher of [
      "",
      "stealth:test",
      "../apodex",
      "https://example.com",
      "unknown-brand",
      "recursive",
    ]) {
      expect(publisherFaviconUrl(publisher)).toBeNull();
    }
  });

  test("provider documentation resolves locally and rejects unsafe URLs", () => {
    expect(
      providerFaviconUrl({ overview: "https://developers.cloudflare.com/workers-ai/" }),
    ).toMatch(localLogo);
    expect(providerFaviconUrl({ overview: "javascript:alert(1)" })).toBeNull();
    expect(providerFaviconUrl({ overview: "https://unknown-brand.example/docs" })).toBeNull();
    expect(
      providerFaviconUrl({
        overview: "invalid",
        models: "https://developers.cloudflare.com/workers-ai/",
      }),
    ).toMatch(localLogo);
  });

  test("every manifest entry has a real local image", async () => {
    for (const path of Object.values(brandLogos)) {
      expect(path).toMatch(localLogo);
      expect(
        await Bun.file(fileURLToPath(new URL(`../public${path}`, import.meta.url))).exists(),
      ).toBe(true);
    }
  });
});
