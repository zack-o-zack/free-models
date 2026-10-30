import type { Metadata } from "next";
import {
  type CatalogueEntity,
  type EntityKind,
  entityBreadcrumbs,
  entityDescription,
  entityHref,
  entityTitle,
} from "@/lib/catalogue-entities";
import {
  CATALOGUE_PAGE_SIZE,
  cataloguePageDescription,
  cataloguePageHref,
  cataloguePageTitle,
} from "@/lib/catalogue-pagination";
import { homeTitle, siteConfig, socialImageAlt } from "@/lib/config";
import { modelDisplayName } from "@/lib/model-format";
import { modelHref } from "@/lib/model-path";
import { sortCatalogue } from "@/lib/model-sort";
import type { ModelSummary } from "@/lib/model-types";
import {
  type BreadcrumbItem,
  contentSnippet,
  homeDescription,
  modelBreadcrumbs,
  modelDescription,
} from "@/lib/page-content";

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
export const isIndexable = Boolean(configuredUrl) && process.env.SITE_ENVIRONMENT !== "preview";
export { homeDescription, homeTitle, modelDescription };

export function absoluteUrl(path: string): string {
  if (path === "/") return siteUrl;
  return new URL(path, `${siteUrl}/`).href;
}

function breadcrumbItems(items: BreadcrumbItem[]) {
  return items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.href),
  }));
}

export function pageMetadata(title: string, description: string, path?: string): Metadata {
  const url = path === undefined ? undefined : absoluteUrl(path);
  const pageTitle = `${title} | ${siteConfig.name}`;
  description = contentSnippet(description);
  const image = {
    url: absoluteUrl("/opengraph-image"),
    width: 1200,
    height: 630,
    alt: socialImageAlt,
  };
  return {
    title: { absolute: pageTitle },
    description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: siteConfig.name,
      title: pageTitle,
      description,
      ...(url ? { url } : {}),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [image],
    },
  };
}

export function websiteJsonLd(description = siteConfig.description) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: siteConfig.name,
    alternateName: ["free-models", "free-models.zackozack.com", "FreeModels"],
    url: absoluteUrl("/"),
    description,
    inLanguage: "en",
  };
}

export function catalogueJsonLd(
  models: ModelSummary[],
  {
    page = 1,
    total = models.length,
    description,
  }: { page?: number; total?: number; description?: string } = {},
) {
  const path = cataloguePageHref(page);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absoluteUrl(`${path}#catalogue`),
    name: page === 1 ? homeTitle : cataloguePageTitle(page),
    description:
      page === 1 ? (description ?? siteConfig.description) : cataloguePageDescription(page, total),
    url: absoluteUrl(path),
    isPartOf: { "@id": absoluteUrl("/#website") },
    ...(page > 1
      ? {
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
              {
                "@type": "ListItem",
                position: 2,
                name: cataloguePageTitle(page),
                item: absoluteUrl(path),
              },
            ],
          },
        }
      : {}),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: sortCatalogue(models).map((model, index) => ({
        "@type": "ListItem",
        position: (page - 1) * CATALOGUE_PAGE_SIZE + index + 1,
        name: modelDisplayName(model),
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
        name: modelDisplayName(model),
        description: modelDescription(model),
        inLanguage: "en",
        isPartOf: { "@id": absoluteUrl("/#website") },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        about: {
          "@type": "Thing",
          name: modelDisplayName(model),
          description: model.description,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: breadcrumbItems(modelBreadcrumbs(model)),
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
    name: entityTitle(entity, kind),
    description: contentSnippet(entityDescription(entity, kind)),
    url,
    isPartOf: { "@id": absoluteUrl("/#website") },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems(entityBreadcrumbs(entity, kind)),
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: entity.models.length,
      itemListElement: sortCatalogue(entity.models)
        .slice(0, CATALOGUE_PAGE_SIZE)
        .map((model, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: modelDisplayName(model),
          url: absoluteUrl(modelHref(model.id)),
        })),
    },
  };
}

export function changelogJsonLd() {
  const url = absoluteUrl("/changelog");
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free AI Models Changelog",
    description:
      "Track daily additions and removals of free AI models and zero-cost LLM APIs across all supported providers over the past 30 days.",
    url,
    isPartOf: { "@id": absoluteUrl("/#website") },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Changelog", item: url },
      ],
    },
  };
}

export function termsJsonLd(description: string) {
  const url = absoluteUrl("/terms");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: "Terms & Conditions",
        description: contentSnippet(description),
        inLanguage: "en",
        isPartOf: { "@id": absoluteUrl("/#website") },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Terms & Conditions", item: url },
        ],
      },
    ],
  };
}

export function compareJsonLd(models: ModelSummary[]) {
  const url = absoluteUrl("/compare");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url,
        url,
        name: "Compare free AI models",
        description:
          "Compare free AI models by context window, capabilities, reasoning, tool calling, providers, usage limits, and benchmark scores.",
        inLanguage: "en",
        isPartOf: { "@id": absoluteUrl("/#website") },
        mainEntity: {
          "@type": "ItemList",
          name: "Free AI models",
          numberOfItems: models.length,
          itemListElement: models.slice(0, 50).map((model, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: model.name,
            url: absoluteUrl(modelHref(model.id)),
          })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What can I compare?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "You can compare available model capabilities, context windows, modalities, reasoning support, tool calling, providers, listed limits, and benchmark scores.",
            },
          },
          {
            "@type": "Question",
            name: "Are these models completely free?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The catalogue lists models available through free providers. Availability and usage limits can vary by provider.",
            },
          },
          {
            "@type": "Question",
            name: "Can I share a comparison?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Selected models are stored in the URL, so you can copy and share the comparison link.",
            },
          },
        ],
      },
    ],
  };
}
