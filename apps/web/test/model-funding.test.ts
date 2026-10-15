import { expect, test } from "bun:test";
import { getBestMonthlyCreditOffer, getProviderFundingLabel } from "../src/lib/model-funding";
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

test("best credit offer compares dollar amounts without treating paid thresholds as allowances", () => {
  const offer = (provider: string, term: string): ModelConnection => ({
    provider,
    modelId: "maker/model",
    funding: "monthly_credits",
    limits: [term],
  });
  expect(
    getBestMonthlyCreditOffer([
      offer("vercel", "Free with $5 monthly credits"),
      offer("other", "Free with $12.50 monthly credits"),
      offer("paid", "1k req / day (>= $100 credits)"),
      { ...offer("free", "Free with $500 monthly credits"), funding: "no_credits" },
    ]),
  ).toEqual({ provider: "other", amount: 12.5 });
  expect(getBestMonthlyCreditOffer([offer("unknown", "Free with monthly credits")])).toBeNull();
  expect(getBestMonthlyCreditOffer([])).toBeNull();
});
