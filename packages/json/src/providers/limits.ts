import type { OfferLimits } from "../catalogue/schema.ts";

export function unavailableLimits(
  status: "account_specific" | "unpublished",
  scope: OfferLimits["scope"],
  sourceUrl: string,
): OfferLimits {
  return {
    status,
    scope,
    source_url: sourceUrl,
    tiers: [],
  };
}

export function parseCompactInteger(value: string, label: string): number {
  const normalized = value.trim().replaceAll(",", "").toUpperCase();
  const match = /^(\d+(?:\.\d+)?)([KM]?)$/.exec(normalized);
  if (!match) {
    throw new Error(`${label} has an invalid numeric amount: ${value}`);
  }

  const magnitude = Number(match[1]);
  const multiplier = match[2] === "K" ? 1_000 : match[2] === "M" ? 1_000_000 : 1;
  const amount = magnitude * multiplier;
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`${label} has an invalid numeric amount: ${value}`);
  }
  return amount;
}
