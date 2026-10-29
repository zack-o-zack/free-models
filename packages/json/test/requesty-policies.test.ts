import { describe, expect, test } from "bun:test";
import {
  REQUESTY_COMPLIANCE,
  resolveRequestyCompliance,
} from "../src/providers/requesty-policies.ts";

describe("Requesty free-tier policies & compliance resolver", () => {
  test("defaults to free-plan logging and training with no region claim", () => {
    const compliance = resolveRequestyCompliance("tiered/free");

    expect(compliance).toEqual(REQUESTY_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual([]);
    expect(compliance.subprocessors).toEqual(["requesty", "aws"]);
    expect(compliance.description).toContain("Free plan");
    expect(compliance.conditional).toBeUndefined();
  });

  test("adds the documented upstream location and subprocessor", () => {
    const nvidia = resolveRequestyCompliance("nvidia/nemotron-3-super-120b-a12b");
    expect(nvidia.countries).toEqual(["US"]);
    expect(nvidia.subprocessors).toEqual(["requesty", "aws", "nvidia"]);
    expect(nvidia.zdr).toBe(false);
    expect(nvidia.no_training).toBe(false);
    expect(nvidia.data_retention).toBe(true);

    const mistral = resolveRequestyCompliance("mistral/leanstral-1-5");
    expect(mistral.countries).toEqual(["EU"]);
    expect(mistral.subprocessors).toEqual(["requesty", "aws", "mistral"]);

    const novita = resolveRequestyCompliance("novita/ling-3.1-flash");
    expect(novita.countries).toEqual(["US"]);
    expect(novita.subprocessors).toEqual(["requesty", "aws", "novita"]);

    const poolside = resolveRequestyCompliance("poolside/laguna-m.1");
    expect(poolside.countries).toEqual(["US"]);
    expect(poolside.subprocessors).toEqual(["requesty", "aws", "poolside"]);
  });

  test("does not claim a region for Google's global Gemini API", () => {
    const google = resolveRequestyCompliance("google/gemma-4-31b-it");

    expect(google.countries).toEqual([]);
    expect(google.subprocessors).toEqual(["requesty", "aws", "google"]);
  });
});
