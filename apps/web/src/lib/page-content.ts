import { entityHref, publisherSlug } from "@/lib/catalogue-entities";
import { modelHref } from "@/lib/model-path";
import type { ModelSummary } from "@/lib/model-types";

export interface BreadcrumbItem {
  name: string;
  href: string;
}

export function modelBreadcrumbs(model: ModelSummary): BreadcrumbItem[] {
  const publisher = publisherSlug(model);
  return [
    { name: "Models", href: "/#models" },
    ...(publisher ? [{ name: model.author, href: entityHref("publishers", publisher) }] : []),
    { name: model.name, href: modelHref(model.id) },
  ];
}

export function contentSnippet(text: string, limit = 160): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  const shortened = normalized.slice(0, limit - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > limit / 2 ? lastSpace : undefined).trimEnd()}…`;
}

export function homeDescription(models: readonly Pick<ModelSummary, "providers">[]): string {
  const modelCount = models.length;
  const providerCount = new Set(models.flatMap((model) => model.providers)).size;
  if (modelCount === 0) {
    return "Compare free AI models and zero-cost LLM APIs across verified providers.";
  }
  return `Compare ${modelCount} free AI models and zero-cost LLM APIs across ${providerCount} ${
    providerCount === 1 ? "provider" : "providers"
  }.`;
}

export function modelDescription(
  model: Pick<ModelSummary, "name" | "description"> & Partial<Pick<ModelSummary, "providers">>,
): string {
  const name = contentSnippet(model.name, 55);
  const providerCount = model.providers?.length ?? 0;
  const prefix =
    providerCount > 0
      ? `${name} — free API access across ${providerCount} ${providerCount === 1 ? "provider" : "providers"}. `
      : `${name} — free AI model & API specs. `;
  return `${prefix}${contentSnippet(model.description, Math.max(40, 160 - prefix.length))}`;
}

export const notFoundContent = {
  title: "Page not found",
  description: "This page may have moved, or the model may no longer be in the free catalogue.",
};
