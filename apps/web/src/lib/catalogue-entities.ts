import type { ModelSummary, ProviderDoc } from "@/lib/model-types";
import { getProviderName } from "@/lib/provider-logos";

export type EntityKind = "providers" | "publishers";

export type DirectorySortOption = "models-desc" | "name-asc" | "name-desc" | "models-asc";

export type EntitySortOption = DirectorySortOption | "models" | "alphabetical" | "name";

export const defaultDirectorySort: DirectorySortOption = "models-desc";

export const directorySortLabels: Record<DirectorySortOption, string> = {
  "models-desc": "Most models",
  "name-asc": "Alphabetical (A–Z)",
  "name-desc": "Alphabetical (Z–A)",
  "models-asc": "Fewest models",
};

export interface CatalogueEntity {
  slug: string;
  name: string;
  models: ModelSummary[];
}

export function publisherSlug(model: Pick<ModelSummary, "id" | "isStealth">): string | null {
  if (model.isStealth || model.id.startsWith("stealth:")) return null;
  const separator = model.id.indexOf("/");
  return separator > 0 ? model.id.slice(0, separator) : null;
}

export function entityHref(kind: EntityKind, slug: string): string {
  return `/${kind}/${encodeURIComponent(slug)}`;
}

export function compareCatalogueEntities(
  left: CatalogueEntity,
  right: CatalogueEntity,
  sort: EntitySortOption = "models-desc",
): number {
  switch (sort) {
    case "alphabetical":
    case "name":
    case "name-asc":
      return left.name.localeCompare(right.name) || right.models.length - left.models.length;
    case "name-desc":
      return right.name.localeCompare(left.name) || right.models.length - left.models.length;
    case "models-asc":
      return left.models.length - right.models.length || left.name.localeCompare(right.name);
    default:
      return right.models.length - left.models.length || left.name.localeCompare(right.name);
  }
}

export function sortCatalogueEntities(
  entities: CatalogueEntity[],
  sort: EntitySortOption = "models-desc",
): CatalogueEntity[] {
  return [...entities].sort((left, right) => compareCatalogueEntities(left, right, sort));
}

export function getCatalogueEntities(
  models: ModelSummary[],
  kind: EntityKind,
  sort: EntitySortOption = "models-desc",
): CatalogueEntity[] {
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

  return sortCatalogueEntities([...entities.values()], sort);
}

export function entityDescription(entity: CatalogueEntity, kind: EntityKind): string {
  const count = entity.models.length;
  const noun = count === 1 ? "model" : "models";
  return kind === "providers"
    ? `Explore ${count} free AI ${noun} and zero-cost LLM APIs on ${entity.name}. Compare context windows, reasoning, tool calling, and benchmarks.`
    : `Explore ${count} free AI ${noun} from ${entity.name} across verified API providers. Compare context windows, reasoning, tool calling, and benchmarks.`;
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
    title: "Free AI & LLM API Providers",
    description:
      "Compare API providers offering free AI model access. Explore their zero-cost LLMs, capabilities, rate limits, and official API documentation.",
  },
  publishers: {
    title: "AI Model Publishers with Free APIs",
    description:
      "Explore the AI labs and organisations behind the models. Find their free-tier AI models, benchmarks, and the API providers hosting them at $0.",
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
  return kind === "providers" ? "Free AI Models & API Provider" : "Free AI Models & API Providers";
}

export function entityTitle(entity: CatalogueEntity, kind: EntityKind): string {
  return `${entity.name} – ${entityLabel(kind)}`;
}
