import { describe, expect, test } from "bun:test";
import { COHERE_COMPLIANCE, resolveCohereCompliance } from "../src/providers/cohere-policies.ts";

describe("Cohere policies & compliance resolver", () => {
  test("resolves trial API retention and training terms", () => {
    const compliance = resolveCohereCompliance("command-a-03-2025");

    expect(compliance).toEqual(COHERE_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual(["US"]);
    expect(compliance.subprocessors).toEqual(["cohere", "google"]);
    expect(compliance.description).toContain("30 days");
  });
});
