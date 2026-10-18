import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CataloguePagination } from "@/components/catalogue-pagination";
import { JsonLd } from "@/components/json-ld";
import { ModelCard } from "@/components/model-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  CATALOGUE_PAGE_SIZE,
  cataloguePageCount,
  cataloguePageDescription,
  cataloguePageHref,
  cataloguePageModels,
  cataloguePageTitle,
  parseCataloguePage,
} from "@/lib/catalogue-pagination";
import { getModels } from "@/lib/model-data";
import { catalogueJsonLd, pageMetadata } from "@/lib/seo";

interface CataloguePageProps {
  params: Promise<{ page: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const { models } = await getModels();
  return Array.from({ length: cataloguePageCount(models.length) - 1 }, (_, index) => ({
    page: String(index + 2),
  }));
}

export async function generateMetadata({ params }: CataloguePageProps): Promise<Metadata> {
  const { page: value } = await params;
  const { models } = await getModels();
  const page = parseCataloguePage(value, models.length);
  if (page === null) notFound();
  return pageMetadata(
    cataloguePageTitle(page),
    cataloguePageDescription(page, models.length),
    cataloguePageHref(page),
  );
}

export default async function CataloguePage({ params }: CataloguePageProps) {
  const { page: value } = await params;
  const { models, githubStars } = await getModels();
  const page = parseCataloguePage(value, models.length);
  if (page === null) notFound();
  const pageModels = cataloguePageModels(models, page);

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={catalogueJsonLd(pageModels, { page, total: models.length })} />
      <SiteHeader modelCount={models.length} githubStars={githubStars} />
      <main id="top" tabIndex={-1}>
        <section
          id="models"
          data-catalogue-total={models.length}
          data-catalogue-offset={(page - 1) * CATALOGUE_PAGE_SIZE}
          className="container py-12"
          aria-labelledby="catalogue-title"
        >
          <nav aria-label="Breadcrumb" className="mb-8 flex gap-3 text-sm text-muted-foreground">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{cataloguePageTitle(page)}</span>
          </nav>
          <h1 id="catalogue-title" className="font-heading text-4xl font-extrabold">
            {cataloguePageTitle(page)}
          </h1>
          <p data-page-description className="mt-4 text-muted-foreground">
            {cataloguePageDescription(page, models.length)}
          </p>
          <div className="mt-8 grid gap-4">
            {pageModels.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        </section>
        <CataloguePagination page={page} total={models.length} />
      </main>
      <SiteFooter />
    </div>
  );
}
