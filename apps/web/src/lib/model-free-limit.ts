import type { ModelConnection } from "./model-types";

const periods = { min: 60, hour: 3_600, day: 86_400, week: 604_800, month: 2_592_000 };
const units = ["req", "tok", "inputs", "audio sec", "neurons"] as const;
type LimitUnit = (typeof units)[number];

interface ParsedLimit {
  amount: number;
  unit: LimitUnit;
  period: keyof typeof periods;
  qualifier: string;
  rate: number;
}

export interface ModelFreeLimit {
  provider: string;
  label: string;
  amount: string;
  allowance: string;
  qualifier: string;
  otherLimits: string[];
}

function parseFreeLimit(term: string): ParsedLimit | null {
  const match = term.match(
    /^([\d,.]+)([kmb]?)\s+(req|tok|inputs|audio sec|neurons)\s*\/\s*(min|hour|day|week|month)(?:\s+\(([^)]+)\))?$/i,
  );
  if (!match) return null;
  const qualifier = match[5]?.trim() ?? "";
  if (qualifier && !/^(no credit|new orgs|<\s*\$[\d.]+ credits)$/i.test(qualifier)) return null;
  const multiplier = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }[match[2].toLowerCase()] ?? 1;
  const amount = Number(match[1].replaceAll(",", "")) * multiplier;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[3].toLowerCase() as LimitUnit;
  const period = match[4].toLowerCase() as keyof typeof periods;
  return { amount, unit, period, qualifier, rate: amount / periods[period] };
}

function formatLimit(limit: ParsedLimit): string {
  const unit = {
    req: "requests",
    tok: "tokens",
    inputs: "inputs",
    "audio sec": "audio seconds",
    neurons: "neurons",
  }[limit.unit];
  return `${limit.amount.toLocaleString("en-US")} ${unit} / ${limit.period === "min" ? "minute" : limit.period}`;
}

export function getBestFreeLimit(connections: ModelConnection[]): ModelFreeLimit | null {
  const offers = connections.map((connection) => ({
    provider: connection.provider,
    limits: connection.limits.flatMap((term) => {
      const limit = parseFreeLimit(term);
      return limit ? [limit] : [];
    }),
  }));

  // Compare matching units only, using each offer's tightest rate across its time windows.
  for (const unit of units) {
    const candidates = offers.flatMap((offer) => {
      const limit = offer.limits
        .filter((entry) => entry.unit === unit)
        .sort((a, b) => a.rate - b.rate)[0];
      return limit ? [{ ...offer, limit }] : [];
    });
    const best = candidates.sort(
      (a, b) => b.limit.rate - a.limit.rate || a.provider.localeCompare(b.provider),
    )[0];
    if (!best) continue;

    return {
      provider: best.provider,
      label: `Up to ${formatLimit(best.limit)} free`,
      amount: best.limit.amount.toLocaleString("en-US"),
      allowance: formatLimit(best.limit).slice(
        best.limit.amount.toLocaleString("en-US").length + 1,
      ),
      qualifier: best.limit.qualifier,
      otherLimits: [
        ...new Set(
          best.limits
            .filter((limit) => limit !== best.limit)
            .map(
              (limit) => `${formatLimit(limit)}${limit.qualifier ? ` (${limit.qualifier})` : ""}`,
            ),
        ),
      ],
    };
  }

  return null;
}
