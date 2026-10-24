import type { Metadata } from "next";

import { CataloguePagination } from "@/components/catalogue-pagination";
import { HeroTypographicBroadsheet } from "@/components/hero/hero-typographic-broadsheet";
import { JsonLd } from "@/components/json-ld";
import { ModelExplorer } from "@/components/model-explorer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { toCatalogueModel } from "@/lib/catalogue-model";
import { cataloguePageModels } from "@/lib/catalogue-pagination";
import { getModels } from "@/lib/model-data";
import { homeDescription } from "@/lib/page-content";
import { catalogueJsonLd, homeTitle, pageMetadata, websiteJsonLd } from "@/lib/seo";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const { models } = await getModels();
  return pageMetadata(homeTitle, homeDescription(models), "/");
}

export default async function Home() {
  const { models, githubStars } = await getModels();
  const description = homeDescription(models);

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={websiteJsonLd(description)} />
      <JsonLd
        data={catalogueJsonLd(cataloguePageModels(models, 1), {
          total: models.length,
          description,
        })}
      />
      <SiteHeader modelCount={models.length} githubStars={githubStars} />

      <main id="top" tabIndex={-1}>
        <HeroTypographicBroadsheet
          models={models}
          githubStars={githubStars}
          description={description}
        />
        <ModelExplorer models={models.map(toCatalogueModel)} />
        <CataloguePagination page={1} total={models.length} />
      </main>
      <SiteFooter />
    </div>
  );
}
