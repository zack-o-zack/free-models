import { describe, expect, test } from "bun:test";
import {
  GEMINI_FREE_TIER_COMPLIANCE,
  resolveGeminiCompliance,
} from "../src/providers/gemini-policies.ts";

describe("Gemini policies & compliance resolver", () => {
  test("resolves strict free-tier compliance for standard models", () => {
    const compliance = resolveGeminiCompliance("gemini-2.5-flash");

    expect(compliance).toEqual(GEMINI_FREE_TIER_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual(["US"]);
    expect(compliance.subprocessors).toEqual(["google"]);
    expect(compliance.description).toBe(
      "Prompts and outputs are logged, reviewed, and used to train models",
    );
  });

  test("applies uniform free-tier terms to preview models", () => {
    const compliance = resolveGeminiCompliance("gemini-3.8-live");

    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual(["US"]);
    expect(compliance.subprocessors).toEqual(["google"]);
  });
});
