import type { ModelConnection } from "./model-types";

export function getBestMonthlyCreditOffer(connections: ModelConnection[]) {
  const offers = connections.flatMap((connection) => {
    if (connection.funding !== "monthly_credits") return [];
    return connection.limits.flatMap((term) => {
      const match = term.match(/^Free with \$([\d,]+(?:\.\d+)?) monthly credits$/i);
      const amount = match ? Number(match[1].replaceAll(",", "")) : 0;
      return amount > 0 && Number.isFinite(amount)
        ? [{ provider: connection.provider, amount }]
        : [];
    });
  });
  return (
    offers.sort((a, b) => b.amount - a.amount || a.provider.localeCompare(b.provider))[0] ?? null
  );
}

export function getProviderFundingLabel(
  connections: Pick<ModelConnection, "provider" | "funding">[],
  provider: string,
): string | undefined {
  const offers = connections.filter((connection) => connection.provider === provider);
  const noCredits = offers.some((offer) => offer.funding === "no_credits");
  const credits = offers.some((offer) => offer.funding === "monthly_credits");
  if (noCredits && credits) return "Free or monthly credits";
  if (noCredits) return "Free — no credits used";
  if (credits) return "Free with monthly credits";
  return undefined;
}
