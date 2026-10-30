import { describe, expect, test } from "bun:test";
import {
  BAZAARLINK_COMPLIANCE,
  resolveBazaarLinkCompliance,
} from "../src/providers/bazaarlink-policies.ts";

describe("BazaarLink policies & compliance resolver", () => {
  test("resolves conditional upstream relay terms for BazaarLink endpoints", () => {
    const compliance = resolveBazaarLinkCompliance("nvidia/nemotron-3.5-lightning-free:free");

    expect(compliance).toEqual(BAZAARLINK_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual([]);
    expect(compliance.subprocessors).toEqual([]);
    expect(compliance.conditional).toBe(true);
    expect(compliance.description).toBe("Upstream providers may retain or use prompts");
  });
});
