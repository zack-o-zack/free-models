import { describe, expect, test } from "bun:test";
import {
  MISTRAL_COMPLIANCE,
  MISTRAL_LABS_COMPLIANCE,
  resolveMistralCompliance,
} from "../src/providers/mistral-policies.ts";

describe("Mistral policies & compliance resolver", () => {
  test("resolves limited retention and EU hosting for standard models", () => {
    const compliance = resolveMistralCompliance("codestral-latest");

    expect(compliance).toEqual(MISTRAL_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(true);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual(["FR", "EU"]);
    expect(compliance.subprocessors).toEqual(["mistral"]);
    expect(compliance.description).toContain("30 days");
  });

  test("marks Labs models as eligible for training", () => {
    const compliance = resolveMistralCompliance("labs-leanstral-1-5");

    expect(compliance).toEqual(MISTRAL_LABS_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual(["FR", "EU"]);
    expect(compliance.description).toContain("Labs models");
  });
});
