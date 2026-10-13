import { JsonLd } from "@/components/json-ld";
import { ModelExplorer } from "@/components/model-explorer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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
      <JsonLd data={catalogueJsonLd(models)} />
      <SiteHeader modelCount={models.length} githubStars={githubStars} />

      <main id="top" tabIndex={-1}>
        <ModelExplorer models={models} />
      </main>
      <SiteFooter />
    </div>
  );
}
