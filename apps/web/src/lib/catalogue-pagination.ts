import { sortCatalogue } from "@/lib/model-sort";
import type { ModelSummary } from "@/lib/model-types";

export const CATALOGUE_PAGE_SIZE = 20;

export function cataloguePageHref(page: number): string {
  return page === 1 ? "/" : `/catalogue/${page}`;
}

export function cataloguePageCount(total: number): number {
  return Math.max(1, Math.ceil(total / CATALOGUE_PAGE_SIZE));
}

export function cataloguePageModels(models: ModelSummary[], page: number): ModelSummary[] {
  return sortCatalogue(models).slice((page - 1) * CATALOGUE_PAGE_SIZE, page * CATALOGUE_PAGE_SIZE);
}

export function parseCataloguePage(value: string, total: number): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 2 && page <= cataloguePageCount(total) ? page : null;
}

export function cataloguePageTitle(page: number): string {
  return `Free AI Models — Page ${page}`;
}
export function cataloguePageDescription(page: number, total: number): string {
  return `Browse page ${page} of ${cataloguePageCount(total)} in the free AI model catalogue. Compare providers, context windows, and benchmarks.`;
}
