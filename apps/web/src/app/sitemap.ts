import type { MetadataRoute } from "next";

import { entityHref, getCatalogueEntities } from "@/lib/catalogue-entities";
import { getModels } from "@/lib/model-data";
import { modelHref } from "@/lib/model-path";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { models } = await getModels();
  return [
    { url: absoluteUrl("/") },
    ...["providers", "publishers"].flatMap((kind) => {
      const entityKind = kind as "providers" | "publishers";
      return [
        { url: absoluteUrl(`/${kind}`) },
        ...getCatalogueEntities(models, entityKind).map((entity) => ({
          url: absoluteUrl(entityHref(entityKind, entity.slug)),
        })),
      ];
    }),
    ...models.map((model) => ({ url: absoluteUrl(modelHref(model.id)) })),
  ];
}
