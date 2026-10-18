import { CataloguePagination } from "@/components/catalogue-pagination";
import { HeroTypographicBroadsheet } from "@/components/hero/hero-typographic-broadsheet";
import { JsonLd } from "@/components/json-ld";
import { ModelExplorer } from "@/components/model-explorer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { toCatalogueModel } from "@/lib/catalogue-model";
import { cataloguePageModels } from "@/lib/catalogue-pagination";
import { siteConfig } from "@/lib/config";
import { getModels } from "@/lib/model-data";
import { catalogueJsonLd, homeTitle, pageMetadata, websiteJsonLd } from "@/lib/seo";

export const dynamic = "force-static";
export const metadata = pageMetadata(homeTitle, siteConfig.description, "/");

export default async function Home() {
  const { models, githubStars } = await getModels();

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={catalogueJsonLd(cataloguePageModels(models, 1), { total: models.length })} />
      <SiteHeader modelCount={models.length} githubStars={githubStars} />

      <main id="top" tabIndex={-1}>
        <HeroTypographicBroadsheet models={models} />
        <ModelExplorer models={models.map(toCatalogueModel)} />
        <CataloguePagination page={1} total={models.length} />
      </main>
      <SiteFooter />
    </div>
  );
}
