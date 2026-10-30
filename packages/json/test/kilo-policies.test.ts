import { describe, expect, test } from "bun:test";
import {
  KILO_COMPLIANCE,
  KILO_NVIDIA_COMPLIANCE,
  resolveKiloCompliance,
} from "../src/providers/kilo-policies.ts";

describe("Kilo Gateway policies & compliance resolver", () => {
  test("defaults free routes to conditional upstream privacy", () => {
    const compliance = resolveKiloCompliance("poolside/laguna-s-2.1:free");

    expect(compliance).toEqual(KILO_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual([]);
    expect(compliance.subprocessors).toEqual(["kilo", "openrouter"]);
    expect(compliance.description).toContain("prompts and outputs");
    expect(compliance.conditional).toBe(true);
  });

  test("uses NVIDIA trial terms for NVIDIA free endpoints", () => {
    const compliance = resolveKiloCompliance("nvidia/nemotron-3-super-120b-a12b:free");

    expect(compliance).toEqual(KILO_NVIDIA_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual([]);
    expect(compliance.subprocessors).toEqual(["kilo", "openrouter", "nvidia"]);
    expect(compliance.description).toContain("NVIDIA trial endpoint");
    expect(compliance.conditional).toBeUndefined();
  });

  test("does not invent a Cohere-specific policy through Kilo", () => {
    const compliance = resolveKiloCompliance("cohere/north-mini-code:free");

    expect(compliance).toEqual(KILO_COMPLIANCE);
    expect(compliance.subprocessors).toEqual(["kilo", "openrouter"]);
    expect(compliance.conditional).toBe(true);
  });
});
