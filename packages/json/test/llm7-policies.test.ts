import { describe, expect, test } from "bun:test";
import { LLM7_COMPLIANCE, resolveLlm7Compliance } from "../src/providers/llm7-policies.ts";

describe("LLM7 policies & compliance resolver", () => {
  test("resolves 5-minute caching and Cloudflare infrastructure terms for LLM7 endpoints", () => {
    const compliance = resolveLlm7Compliance("codestral-latest");

    expect(compliance).toEqual(LLM7_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual([]);
    expect(compliance.subprocessors).toEqual(["cloudflare"]);
    expect(compliance.conditional).toBe(true);
    expect(compliance.description).toBe("Responses may be cached up to 5 minutes");
  });
});
