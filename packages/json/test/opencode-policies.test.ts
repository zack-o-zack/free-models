import { describe, expect, test } from "bun:test";
import { complianceSchema } from "../src/catalogue/schema.ts";
import {
  OPENCODE_POLICIES,
  resolveOpenCodeCompliance,
} from "../src/providers/opencode-policies.ts";

describe("OpenCode compliance policy resolution & schema validation", () => {
  test("resolves self-hosted Zen In-Memory policy with ZDR and US/EU regions", () => {
    const compliance = resolveOpenCodeCompliance("deepseek-v4.1-flash-free");
    expect(compliance).toEqual(OPENCODE_POLICIES.ZEN_IN_MEMORY_ZDR);
    expect(compliance?.zdr).toBe(true);
    expect(compliance?.no_training).toBe(true);
    expect(compliance?.data_retention).toBe(false);
    expect(compliance?.countries).toEqual(["US", "EU"]);
  });

  test("resolves promotional preview policy with data retention", () => {
    const compliance = resolveOpenCodeCompliance("big-pickle");
    expect(compliance).toEqual(OPENCODE_POLICIES.PROMO_PREVIEW_RETAINED);
    expect(compliance?.zdr).toBe(false);
    expect(compliance?.data_retention).toBe(true);
    expect(compliance?.no_training).toBe(false);
    expect(compliance?.countries).toEqual(["US"]);
  });

  test("resolves NVIDIA trial proxy policy with US-only routing and subprocessor tag", () => {
    const compliance = resolveOpenCodeCompliance("nemotron-3.5-super-vl-free");
    expect(compliance).toEqual(OPENCODE_POLICIES.NVIDIA_TRIAL_PROXY);
    expect(compliance?.zdr).toBe(false);
    expect(compliance?.data_retention).toBe(true);
    expect(compliance?.subprocessors).toEqual(["nvidia"]);
    expect(compliance?.countries).toEqual(["US"]);
    expect(compliance?.countries).not.toContain("EU");
  });

  test("fails closed (returns undefined) for unmapped models", () => {
    expect(resolveOpenCodeCompliance("unmapped-model-free")).toBeUndefined();
  });

  test("fails closed upon policy drift when upstream signals preview on ZDR model", () => {
    // If upstream documentation signals retention on deepseek, ZDR is rejected:
    const drifted = resolveOpenCodeCompliance("deepseek-v4.1-flash-free", "retained_preview");
    expect(drifted).toBeUndefined();
  });

  test("complianceSchema enforces invariants and rejects contradictory states", () => {
    // Valid ZDR
    expect(
      complianceSchema.safeParse({
        zdr: true,
        no_training: true,
        data_retention: false,
        countries: ["US", "EU"],
      }).success,
    ).toBe(true);

    // Contradictory: zdr=true AND data_retention=true
    const conflictRetention = complianceSchema.safeParse({
      zdr: true,
      data_retention: true,
      countries: ["US"],
    });
    expect(conflictRetention.success).toBe(false);

    // Contradictory: zdr=true AND no_training=false
    const conflictTraining = complianceSchema.safeParse({
      zdr: true,
      no_training: false,
      countries: ["US"],
    });
    expect(conflictTraining.success).toBe(false);
  });
});
