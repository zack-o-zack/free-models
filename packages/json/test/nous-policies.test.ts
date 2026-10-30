import { describe, expect, test } from "bun:test";
import { NOUS_COMPLIANCE, resolveNousCompliance } from "../src/providers/nous-policies.ts";

describe("Nous policies & compliance resolver", () => {
  test("resolves retention and training terms for Nous Portal endpoints", () => {
    const compliance = resolveNousCompliance("meituan/longcat-2.0:free");

    expect(compliance).toEqual(NOUS_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual([]);
    expect(compliance.subprocessors).toEqual(["nous"]);
    expect(compliance.description).toBe(
      "Prompts and completions may be logged and used for training",
    );
  });
});
