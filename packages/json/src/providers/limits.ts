import type { OfferLimits } from "../catalogue/schema.ts";

const GEMINI_LITE_MODELS = new Set(["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"]);
const GEMINI_FLASH_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
]);

export function geminiUnconfirmedLimits(modelId: string): OfferLimits {
  const knownLiteModel = GEMINI_LITE_MODELS.has(modelId);
  const knownFlashModel = GEMINI_FLASH_MODELS.has(modelId);
  const rpm = knownLiteModel ? 15 : knownFlashModel ? 5 : 15;
  const rpd = knownLiteModel ? 500 : knownFlashModel ? 20 : 500;

  return termsLimits(
    formatLimitTerm(rpm, "req", "min"),
    formatLimitTerm(250_000, "tok", "min"),
    formatLimitTerm(rpd, "req", "day"),
  );
}

export function mistralUnconfirmedLimits(): OfferLimits {
  return termsLimits(formatLimitTerm(50, "req", "min"), formatLimitTerm(50_000, "tok", "min"));
}

export function tokenRouterUnconfirmedLimits(): OfferLimits {
  return termsLimits("8 req / min");
}

export function cohereOfferLimits(endpoints: readonly string[]): OfferLimits {
  const monthly = formatLimitTerm(1_000, "req", "month");
  const normalized = new Set(endpoints.map((endpoint) => endpoint.trim().toLowerCase()));
  if (normalized.has("chat")) {
    return termsLimits(formatLimitTerm(20, "req", "min"), monthly);
  }
  if (normalized.has("rerank")) {
    return termsLimits(formatLimitTerm(10, "req", "min"), monthly);
  }
  if (normalized.has("embed")) {
    return termsLimits(formatLimitTerm(2_000, "inputs", "min"), monthly);
  }
  if (normalized.has("embed_image")) {
    return termsLimits(formatLimitTerm(5, "inputs", "min"), monthly);
  }
  if (normalized.has("transcriptions")) {
    return termsLimits(formatLimitTerm(5, "req", "min"), monthly);
  }
  return termsLimits(formatLimitTerm(500, "req", "min"), monthly);
}

export function openCodePublishedLimits(): OfferLimits {
  return termsLimits("200 req / day");
}

export function termsLimits(...terms: string[]): OfferLimits {
  return { terms };
}

export function formatLimitTerm(amount: number, unit: string, period?: string): string {
  const suffix = period ? ` / ${period}` : "";
  return `${formatCompactInteger(amount)} ${unit}${suffix}`;
}

export function formatCompactInteger(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`Limit has an invalid numeric amount: ${amount}`);
  }
  if (amount >= 1_000_000) {
    return `${formatMagnitude(amount / 1_000_000)}m`;
  }
  if (amount >= 1_000) {
    return `${formatMagnitude(amount / 1_000)}k`;
  }
  return String(amount);
}

function formatMagnitude(value: number): string {
  return Number(value.toFixed(3)).toString();
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
