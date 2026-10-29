import { describe, expect, test } from "bun:test";
import { GROQ_COMPLIANCE, resolveGroqCompliance } from "../src/providers/groq-policies.ts";

describe("Groq policies & compliance resolver", () => {
  test("resolves limited retention and no-training terms for Groq LPU models", () => {
    const compliance = resolveGroqCompliance("openai/gpt-oss-120b");

    expect(compliance).toEqual(GROQ_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(true);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual(["US"]);
    expect(compliance.subprocessors).toEqual(["groq", "google"]);
    expect(compliance.description).toContain("30 days");
  });
});
