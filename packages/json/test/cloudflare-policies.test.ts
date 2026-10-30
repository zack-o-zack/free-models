import { describe, expect, test } from "bun:test";
import {
  CLOUDFLARE_WORKERS_AI_COMPLIANCE,
  resolveCloudflareCompliance,
} from "../src/providers/cloudflare-policies.ts";

describe("Cloudflare Workers AI policies & compliance resolver", () => {
  test("resolves strict ZDR and no-training terms for Workers AI models", () => {
    const compliance = resolveCloudflareCompliance("@cf/meta/llama-3.3-70b-instruct-fp8-fast");

    expect(compliance).toEqual(CLOUDFLARE_WORKERS_AI_COMPLIANCE);
    expect(compliance.zdr).toBe(true);
    expect(compliance.no_training).toBe(true);
    expect(compliance.data_retention).toBe(false);
    expect(compliance.countries).toEqual(["US", "EU"]);
    expect(compliance.subprocessors).toEqual(["cloudflare"]);
    expect(compliance.edge).toBe(true);
    expect(compliance.description).toBe("Zero data retention and no model training on edge GPUs");
  });
});
