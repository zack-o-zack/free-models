import { describe, expect, test } from "bun:test";
import { isZeroPrice, resolveOpenRouterCompliance } from "../src/providers/openrouter-policies.ts";

describe("OpenRouter policies & compliance resolver", () => {
  test("isZeroPrice correctly recognizes free tiers", () => {
    expect(isZeroPrice(0)).toBe(true);
    expect(isZeroPrice("0")).toBe(true);
    expect(isZeroPrice(undefined)).toBe(true);
    expect(isZeroPrice(null)).toBe(true);
    expect(isZeroPrice("0.000001")).toBe(false);
    expect(isZeroPrice(0.01)).toBe(false);
  });

  test("assigns ZDR-verified compliance when endpoint appears in live ZDR registry", () => {
    const compliance = resolveOpenRouterCompliance({
      modelId: "baseten/elephant-1:free",
      isZdrVerified: true,
      providerInfo: {
        slug: "baseten",
        headquarters: "US",
        datacenters: ["US"],
      },
    });

    expect(compliance).toBeDefined();
    expect(compliance?.zdr).toBe(true);
    expect(compliance?.no_training).toBe(true);
    expect(compliance?.data_retention).toBe(false);
    expect(compliance?.countries).toContain("US");
    expect(compliance?.subprocessors).toContain("baseten");
    expect(compliance?.description).toContain("Zero data retention");
  });

  test("fails closed to retained and training for standard free models not in ZDR registry", () => {
    const compliance = resolveOpenRouterCompliance({
      modelId: "nvidia/nemotron-3.5-lightning:free",
      isZdrVerified: false,
      providerInfo: {
        slug: "nvidia",
        headquarters: "US",
        datacenters: ["US"],
      },
    });

    expect(compliance).toBeDefined();
    expect(compliance?.zdr).toBe(false);
    expect(compliance?.no_training).toBe(false);
    expect(compliance?.data_retention).toBe(true);
    expect(compliance?.countries).toContain("US");
    expect(compliance?.subprocessors).toContain("nvidia");
    expect(compliance?.description).toContain("Free endpoints may log prompts and completions");
  });

  test("falls back to audited host registry when live provider metadata is missing", () => {
    const compliance = resolveOpenRouterCompliance({
      modelId: "poolside/laguna-s-2.1:free",
      isZdrVerified: false,
    });

    expect(compliance).toBeDefined();
    expect(compliance?.zdr).toBe(false);
    expect(compliance?.countries).toContain("US");
    expect(compliance?.countries).toContain("EU");
    expect(compliance?.subprocessors).toContain("poolside");
  });

  test("fails closed (returns undefined) when upstream host is completely unrecognized", () => {
    const compliance = resolveOpenRouterCompliance({
      modelId: "unrecognized-unknown/random-model:free",
      isZdrVerified: false,
    });

    expect(compliance).toBeUndefined();
  });
});
