import { describe, expect, test } from "bun:test";
import { resolveVercelCompliance } from "../src/providers/vercel-policies.ts";

describe("Vercel AI Gateway policies & compliance resolver", () => {
  test("resolves unconditional ZDR when zdr and no_training are both 'all'", () => {
    const compliance = resolveVercelCompliance({
      modelId: "openai/gpt-5-mini",
      funding: "monthly_credits",
      zdrStatus: "all",
      noTrainingStatus: "all",
      ownedBy: "openai",
    });

    expect(compliance).toBeDefined();
    expect(compliance?.zdr).toBe(true);
    expect(compliance?.no_training).toBe(true);
    expect(compliance?.data_retention).toBe(false);
    expect(compliance?.countries).toContain("US");
    expect(compliance?.subprocessors).toContain("openai");
    expect(compliance?.description).toBe(
      "Zero data retention and no model training across all upstream providers",
    );
    expect(compliance?.conditional).toBeUndefined();
  });

  test("fails closed to zdr: false when zdr is 'some'", () => {
    const compliance = resolveVercelCompliance({
      modelId: "google/gemini-2.5-flash",
      funding: "monthly_credits",
      zdrStatus: "some",
      noTrainingStatus: "all",
      ownedBy: "google",
    });

    expect(compliance).toBeDefined();
    expect(compliance?.zdr).toBe(false);
    expect(compliance?.no_training).toBe(true);
    expect(compliance?.data_retention).toBe(true);
    expect(compliance?.countries).toContain("US");
    expect(compliance?.subprocessors).toContain("google");
    expect(compliance?.conditional).toBe(true);
    expect(compliance?.description).toBe(
      "Upstream providers may retain data unless training is disabled",
    );
  });

  test("classifies $0 promotional models with retention and training enabled", () => {
    const compliance = resolveVercelCompliance({
      modelId: "poolside/laguna-s-2.1-free",
      funding: "no_credits",
      zdrStatus: "none",
      noTrainingStatus: "none",
      ownedBy: "poolside",
    });

    expect(compliance).toBeDefined();
    expect(compliance?.zdr).toBe(false);
    expect(compliance?.no_training).toBe(false);
    expect(compliance?.data_retention).toBe(true);
    expect(compliance?.countries).toContain("US");
    expect(compliance?.countries).toContain("EU");
    expect(compliance?.subprocessors).toContain("poolside");
    expect(compliance?.description).toBe(
      "Upstream provider retains prompts and completions for training",
    );
    expect(compliance?.conditional).toBeUndefined();
  });

  test("resolves multi-region APAC lab models with accurate countries", () => {
    const compliance = resolveVercelCompliance({
      modelId: "alibaba/qwen-3-14b",
      funding: "monthly_credits",
      zdrStatus: "none",
      noTrainingStatus: "all",
      ownedBy: "alibaba",
    });

    expect(compliance).toBeDefined();
    expect(compliance?.countries).toContain("US");
    expect(compliance?.countries).toContain("CN");
    expect(compliance?.subprocessors).toContain("alibaba");
  });

  test("fails closed (returns undefined) when creator is completely unrecognized", () => {
    const compliance = resolveVercelCompliance({
      modelId: "unknown-creator/test-model",
      funding: "monthly_credits",
      ownedBy: "unknown-creator",
    });

    expect(compliance).toBeUndefined();
  });
});
