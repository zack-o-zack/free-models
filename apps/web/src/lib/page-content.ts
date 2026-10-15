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

export function modelDescription(model: Pick<ModelSummary, "name" | "description">): string {
  const name = contentSnippet(model.name, 65);
  return `${name}. ${contentSnippet(model.description, 160 - name.length - 2)}`;
}

export const notFoundContent = {
  title: "Page not found",
  description: "This page may have moved, or the model may no longer be in the free catalogue.",
};
