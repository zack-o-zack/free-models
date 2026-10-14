import { describe, expect, test } from "bun:test";
import { providerFaviconUrl, publisherFaviconUrl } from "../src/lib/provider-logos";

describe("publisher logo resolution", () => {
  test("new publishers get a logo URL without a website-map entry", () => {
    expect(publisherFaviconUrl("apodex")).toBe("https://openrouter.ai/images/icons/Apodex.svg");
    expect(publisherFaviconUrl("inception")).toBe(
      "https://openrouter.ai/images/icons/Inception.svg",
    );
  });

  test("existing publisher websites still use the favicon service", () => {
    const url = new URL(publisherFaviconUrl("liquid", 128) ?? "");
    expect(url.searchParams.get("url")).toBe("https://www.liquid.ai/");
    expect(url.searchParams.get("size")).toBe("128");
  });

  test("invalid or undisclosed publishers have no guessed asset URL", () => {
    for (const publisher of ["", "stealth:test", "../apodex", "https://example.com"]) {
      expect(publisherFaviconUrl(publisher)).toBeNull();
    }
  });

  test("provider URLs are taken from catalogue documentation", () => {
    const url = new URL(providerFaviconUrl({ overview: "https://example.com/docs" }) ?? "");
    expect(url.searchParams.get("url")).toBe("https://example.com/docs");
  });
});
