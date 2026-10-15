import { ArrowUpRight } from "lucide-react";
import { getBestFreeLimit } from "@/lib/model-free-limit";
import { getBestMonthlyCreditOffer } from "@/lib/model-funding";
import type { ModelSummary } from "@/lib/model-types";
import { getProviderName } from "@/lib/provider-logos";

export function ModelOfferCard({ model }: { model: ModelSummary }) {
  const freeConnections = model.connections.filter((offer) => offer.funding !== "monthly_credits");
  const freeLimit = getBestFreeLimit(freeConnections);
  const credit = getBestMonthlyCreditOffer(model.connections);
  const noCredits = freeConnections.find((offer) => offer.funding === "no_credits");
  const offers = [];

  if (freeLimit) {
    offers.push({
      provider: freeLimit.provider,
      heading: "Best free allowance",
      prefix: "Up to",
      amount: freeLimit.amount,
      allowance: freeLimit.allowance,
      detail: freeLimit.qualifier,
    });
  } else if (noCredits || !credit) {
    offers.push({
      provider: noCredits?.provider,
      heading: noCredits ? "No usage credits" : "Free access",
      prefix: "",
      amount: noCredits ? "$0" : "Free",
      allowance: noCredits ? "no credits used" : "check provider terms",
      detail: "",
    });
  }

  if (credit && !freeLimit && !noCredits) {
    offers.push({
      provider: credit.provider,
      heading: "Best monthly credit offer",
      prefix: "",
      amount: `$${credit.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
      allowance: "free credits / month",
      detail: "",
    });
  }

  return (
    <section aria-label="Free offers" className="space-y-2">
      {offers.map((offer) => (
        <a
          key={offer.heading}
          href={offer.provider ? `#provider-${encodeURIComponent(offer.provider)}` : "#providers"}
          className="block rounded-[20px] bg-primary p-4 text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {offer.prefix && <span className="text-xs font-medium">{offer.prefix}</span>}
              <span className="font-heading text-4xl leading-none font-black tracking-[-0.06em] tabular-nums sm:text-5xl">
                {offer.amount}
              </span>
              <span className="text-sm font-semibold">{offer.allowance}</span>
            </p>
            <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xs leading-5">
            {offer.provider && (
              <span className="font-semibold">
                via {getProviderName(offer.provider, model.providerNames)}
                {offer.detail && " · "}
              </span>
            )}
            {offer.detail}
          </p>
        </a>
      ))}
    </section>
  );
}
