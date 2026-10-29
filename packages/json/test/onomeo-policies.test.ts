import { describe, expect, test } from "bun:test";
import { ONOMEO_COMPLIANCE, resolveOnomeoCompliance } from "../src/providers/onomeo-policies.ts";

describe("Onomeo policies & compliance resolver", () => {
  test("resolves conditional upstream privacy with 30-day excerpts", () => {
    const compliance = resolveOnomeoCompliance("deepseek-v4-flash");

    expect(compliance).toEqual(ONOMEO_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual([]);
    expect(compliance.subprocessors).toEqual(["onomeo", "cloudflare", "railway"]);
    expect(compliance.description).toContain("30-day");
    expect(compliance.conditional).toBe(true);
  });
});
