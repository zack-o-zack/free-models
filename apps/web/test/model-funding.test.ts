import { expect, test } from "bun:test";
import { getProviderFundingLabel } from "../src/lib/model-funding";
import type { ModelConnection } from "../src/lib/model-types";

test("funding labels distinguish free offers, credit allowances, mixed offers, and unknown terms", () => {
  const base: ModelConnection = { provider: "vercel", modelId: "maker/model", limits: [] };
  const free: ModelConnection = { ...base, funding: "no_credits" };
  const credit: ModelConnection = { ...base, funding: "monthly_credits" };
  expect(getProviderFundingLabel([base], "vercel")).toBeUndefined();
  expect(getProviderFundingLabel([free], "vercel")).toBe("Free — no credits used");
  expect(getProviderFundingLabel([credit], "vercel")).toBe("Free with monthly credits");
  expect(getProviderFundingLabel([free, credit], "vercel")).toBe("Free or monthly credits");
  expect(getProviderFundingLabel([free], "other")).toBeUndefined();
});
