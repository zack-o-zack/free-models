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
  return kind === "providers"
    ? `Explore ${entity.models.length} free AI models available through ${entity.name}. Compare capabilities, benchmarks, and model-specific API limits.`
    : `Explore ${entity.models.length} free AI models published by ${entity.name}. Compare capabilities, benchmarks, and the API providers offering them.`;
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
