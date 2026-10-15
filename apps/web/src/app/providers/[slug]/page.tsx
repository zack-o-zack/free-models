import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogueEntityPage } from "@/components/catalogue-entity-page";
import {
  entityDescription,
  entityHref,
  entityTitle,
  getCatalogueEntities,
} from "@/lib/catalogue-entities";
import { getModels } from "@/lib/model-data";
import { pageMetadata } from "@/lib/seo";

interface EntityPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const { models } = await getModels();
  return getCatalogueEntities(models, "providers").map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: EntityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { models } = await getModels();
  const entity = getCatalogueEntities(models, "providers").find((entry) => entry.slug === slug);
  if (!entity) notFound();
  return pageMetadata(
    entityTitle(entity, "providers"),
    entityDescription(entity, "providers"),
    entityHref("providers", slug),
  );
}

export default async function EntityPage({ params }: EntityPageProps) {
  const { slug } = await params;
  const { models, githubStars } = await getModels();
  const entity = getCatalogueEntities(models, "providers").find((entry) => entry.slug === slug);
  if (!entity) notFound();
  return (
    <CatalogueEntityPage
      entity={entity}
      kind="providers"
      models={models}
      githubStars={githubStars}
    />
  );
}
