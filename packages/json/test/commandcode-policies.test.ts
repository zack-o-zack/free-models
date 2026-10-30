import { describe, expect, test } from "bun:test";
import {
  COMMANDCODE_COMPLIANCE,
  resolveCommandCodeCompliance,
} from "../src/providers/commandcode-policies.ts";

describe("CommandCode policies & compliance resolver", () => {
  test("resolves 30-day retention and model improvement terms for CommandCode endpoints", () => {
    const compliance = resolveCommandCodeCompliance("poolside/laguna-s-2.1-free");

    expect(compliance).toEqual(COMMANDCODE_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual([]);
    expect(compliance.subprocessors).toEqual([]);
    expect(compliance.description).toBe("Free models retain prompts up to 30 days");
  });
});
