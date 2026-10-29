import { describe, expect, test } from "bun:test";
import { ROUTEWAY_COMPLIANCE } from "../src/providers/routeway-policies.ts";

describe("Routeway free-tier compliance", () => {
  test("fails closed on upstream retention and training", () => {
    expect(ROUTEWAY_COMPLIANCE.zdr).toBe(false);
    expect(ROUTEWAY_COMPLIANCE.no_training).toBe(false);
    expect(ROUTEWAY_COMPLIANCE.data_retention).toBe(true);
    expect(ROUTEWAY_COMPLIANCE.countries).toEqual([]);
    expect(ROUTEWAY_COMPLIANCE.subprocessors).toEqual(["routeway", "aws", "google"]);
    expect(ROUTEWAY_COMPLIANCE.conditional).toBe(true);
  });

  test("uses a one-line tooltip without a semicolon", () => {
    const description = ROUTEWAY_COMPLIANCE.description ?? "";

    expect(description).toBe("Upstream providers may retain or use prompts");
    expect(description).not.toContain("\n");
    expect(description).not.toContain(";");
  });
});
