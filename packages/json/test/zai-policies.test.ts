import { describe, expect, test } from "bun:test";
import { resolveZaiCompliance, ZAI_COMPLIANCE } from "../src/providers/zai-policies.ts";

describe("Z.ai policies & compliance resolver", () => {
  test("resolves ZDR and Singapore jurisdiction terms for Z.ai endpoints", () => {
    const compliance = resolveZaiCompliance("glm-4.5-flash");

    expect(compliance).toEqual(ZAI_COMPLIANCE);
    expect(compliance.zdr).toBe(true);
    expect(compliance.no_training).toBe(true);
    expect(compliance.data_retention).toBe(false);
    expect(compliance.countries).toEqual(["SG"]);
    expect(compliance.subprocessors).toEqual(["zhipu"]);
    expect(compliance.description).toBe(
      "Zero data retention and no model training with Singapore hosting",
    );
  });
});
