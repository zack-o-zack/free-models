import type { Metadata } from "next";

import {
  type CatalogueEntity,
  type EntityKind,
  entityDescription,
  entityHref,
} from "@/lib/catalogue-entities";
import { siteConfig } from "@/lib/config";
import { modelHref } from "@/lib/model-path";
import type { ModelSummary } from "@/lib/model-types";

const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
const origin = new URL(configuredUrl || "http://localhost:3000");

if (
  !["http:", "https:"].includes(origin.protocol) ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
) {
  throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) origin without a path.");
}

export const siteUrl = origin.origin;
export const isIndexable = Boolean(configuredUrl) && process.env.VERCEL_ENV !== "preview";
export const homeTitle = "Free AI Models: Compare APIs, Limits & Benchmarks";

export function absoluteUrl(path: string): string {
  if (path === "/") return siteUrl;
  return new URL(path, `${siteUrl}/`).href;
}

function snippet(text: string, limit: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  const shortened = normalized.slice(0, limit - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > limit / 2 ? lastSpace : undefined).trimEnd()}…`;
}

export function modelDescription(model: ModelSummary): string {
  return `Compare ${snippet(model.name, 55)} free API providers, usage limits, context window, supported formats, and benchmarks.`;
}

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const url = absoluteUrl(path);
  const image = {
    url: absoluteUrl("/opengraph-image"),
    width: 1200,
    height: 630,
    alt: "Free Models — Compare free AI models, API providers, limits, and benchmarks",
  };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: siteConfig.name,
      title,
      description,
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: siteConfig.name,
    url: absoluteUrl("/"),
    description: siteConfig.description,
    inLanguage: "en",
  };
}

export function catalogueJsonLd(models: ModelSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absoluteUrl("/#catalogue"),
    name: homeTitle,
    description: siteConfig.description,
    url: absoluteUrl("/"),
    isPartOf: { "@id": absoluteUrl("/#website") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: models.length,
      itemListElement: [...models]
        .sort((left, right) => (right.created ?? 0) - (left.created ?? 0))
        .map((model, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: model.name,
          url: absoluteUrl(modelHref(model.id)),
        })),
    },
  };
}

export function modelJsonLd(model: ModelSummary) {
  const url = absoluteUrl(modelHref(model.id));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: `${model.name} — Free API Providers & Limits`,
        description: modelDescription(model),
        inLanguage: "en",
        isPartOf: { "@id": absoluteUrl("/#website") },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        about: {
          "@type": "Thing",
          name: model.name,
          identifier: model.id,
          description: model.description,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Models", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: model.name, item: url },
        ],
      },
    ],
  };
}

export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function entityJsonLd(entity: CatalogueEntity, kind: EntityKind) {
  const url = absoluteUrl(entityHref(kind, entity.slug));
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${entity.name} — Free AI Models`,
    description: entityDescription(entity, kind),
    url,
    isPartOf: { "@id": absoluteUrl("/#website") },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        {
          "@type": "ListItem",
          position: 2,
          name: kind === "providers" ? "Providers" : "Publishers",
          item: absoluteUrl(`/${kind}`),
        },
        { "@type": "ListItem", position: 3, name: entity.name, item: url },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: entity.models.length,
      itemListElement: entity.models.map((model, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: model.name,
        url: absoluteUrl(modelHref(model.id)),
      })),
    },
  };
}
