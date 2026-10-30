import { describe, expect, test } from "bun:test";
import { NVIDIA_COMPLIANCE, resolveNvidiaCompliance } from "../src/providers/nvidia-policies.ts";

describe("NVIDIA policies & compliance resolver", () => {
  test("resolves trial evaluation terms for NVIDIA Build endpoints", () => {
    const compliance = resolveNvidiaCompliance("meta/llama-3.3-70b-instruct");

    expect(compliance).toEqual(NVIDIA_COMPLIANCE);
    expect(compliance.zdr).toBe(false);
    expect(compliance.no_training).toBe(false);
    expect(compliance.data_retention).toBe(true);
    expect(compliance.countries).toEqual(["US"]);
    expect(compliance.subprocessors).toEqual(["nvidia"]);
    expect(compliance.description).toBe(
      "Trial interactions are retained and monitored on US servers",
    );
  });
});
