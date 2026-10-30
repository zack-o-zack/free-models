import { describe, expect, test } from "bun:test";
import { ANYAPI_COMPLIANCE, resolveAnyApiCompliance } from "../src/providers/anyapi-policies.ts";

describe("AnyAPI policies & compliance resolver", () => {
  test("resolves conditional third-party routing terms for AnyAPI endpoints", () => {
    const compliance = resolveAnyApiCompliance("google/gemma-4-26b-a4b-it:free");

    expect(compliance).toEqual(ANYAPI_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual([]);
    expect(compliance.subprocessors).toEqual([]);
    expect(compliance.conditional).toBe(true);
    expect(compliance.description).toBe("Retention policies vary by upstream provider");
  });
});
