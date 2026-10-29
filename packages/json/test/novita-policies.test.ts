import { describe, expect, test } from "bun:test";
import { NOVITA_COMPLIANCE, resolveNovitaCompliance } from "../src/providers/novita-policies.ts";

describe("Novita policies & compliance resolver", () => {
  test("resolves ZDR and no-training terms for Novita AI endpoints", () => {
    const compliance = resolveNovitaCompliance("apodex/apodex-1.1-mini");

    expect(compliance).toEqual(NOVITA_COMPLIANCE);
    expect(compliance.zdr).toBe(true);
    expect(compliance.no_training).toBe(true);
    expect(compliance.data_retention).toBe(false);
    expect(compliance.countries).toEqual(["US"]);
    expect(compliance.subprocessors).toEqual(["novita", "aws"]);
    expect(compliance.description).toBe(
      "API content is not retained and not used for model training",
    );
  });
});
