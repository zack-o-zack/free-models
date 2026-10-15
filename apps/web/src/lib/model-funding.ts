import type { ModelConnection } from "./model-types";

export function getProviderFundingLabel(
  connections: ModelConnection[],
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
