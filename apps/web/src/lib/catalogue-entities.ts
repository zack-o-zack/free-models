import type { ModelSummary, ProviderDoc } from "@/lib/model-types";
import { getProviderName } from "@/lib/provider-logos";

export type EntityKind = "providers" | "publishers";

export interface CatalogueEntity {
  slug: string;
  name: string;
  models: ModelSummary[];
}

export function publisherSlug(model: ModelSummary): string | null {
  if (model.isStealth || model.id.startsWith("stealth:")) return null;
  const separator = model.id.indexOf("/");
  return separator > 0 ? model.id.slice(0, separator) : null;
}

export function entityHref(kind: EntityKind, slug: string): string {
  return `/${kind}/${encodeURIComponent(slug)}`;
}

export function getCatalogueEntities(models: ModelSummary[], kind: EntityKind): CatalogueEntity[] {
  const entities = new Map<string, CatalogueEntity>();
  const names = Object.assign({}, ...models.map((model) => model.providerNames));

  for (const model of models) {
    const publisher = publisherSlug(model);
    const slugs = kind === "providers" ? model.providers : publisher ? [publisher] : [];
    for (const slug of new Set(slugs)) {
      let entity = entities.get(slug);
      if (!entity) {
        entity = {
          slug,
          name: kind === "providers" ? getProviderName(slug, names) : model.author,
          models: [],
        };
        entities.set(slug, entity);
      }
      entity.models.push(model);
    }
  }

  return [...entities.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function entityDescription(entity: CatalogueEntity, kind: EntityKind): string {
  const count = entity.models.length;
  return `Explore ${count} free AI ${count === 1 ? "model" : "models"} ${kind === "providers" ? "available through" : "published by"} ${entity.name}.`;
}

export function getEntityDocs(entity: CatalogueEntity): Array<{ label: string; url: string }> {
  const labels: Record<keyof ProviderDoc, string> = {
    overview: "Documentation",
    models: "Model catalogue",
    pricing: "Pricing & free access",
    rateLimit: "Rate limits",
  };
  const seen = new Set<string>();
  const links: Array<{ label: string; url: string }> = [];
  for (const model of entity.models) {
    const docs = model.providerDocs[entity.slug];
    for (const key of Object.keys(labels) as Array<keyof ProviderDoc>) {
      const url = docs?.[key];
      if (!url || seen.has(url)) continue;
      try {
        if (!["https:", "http:"].includes(new URL(url).protocol)) continue;
      } catch {
        continue;
      }
      seen.add(url);
      links.push({ label: labels[key], url });
    }
  }
  return links;
}

export const directoryContent = {
  providers: {
    title: "Find your API provider.",
    description:
      "Browse the services offering free model access. Explore their models, capabilities, and API documentation.",
  },
  publishers: {
    title: "Meet the model makers.",
    description:
      "Explore the organisations behind the models. Find their free models and the providers that make them available.",
  },
};

export function entityBreadcrumbs(entity: CatalogueEntity, kind: EntityKind) {
  return [
    { name: "Home", href: "/" },
    { name: kind === "providers" ? "Providers" : "Publishers", href: `/${kind}` },
    { name: entity.name, href: entityHref(kind, entity.slug) },
  ];
}

export function entityLabel(kind: EntityKind): string {
  return kind === "providers" ? "Provider" : "Publisher";
}

export function entityTitle(entity: CatalogueEntity, kind: EntityKind): string {
  return `${entity.name} — ${entityLabel(kind)}`;
}
