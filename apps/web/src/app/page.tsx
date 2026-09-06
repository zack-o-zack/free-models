import { ModelExplorer } from "@/components/model-explorer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getModels } from "@/lib/model-data";

export const dynamic = "force-static";

export default async function Home() {
  const models = await getModels();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader modelCount={models.length} />

      <main id="top">
        <ModelExplorer models={models} />
      </main>
      <SiteFooter />
    </div>
  );
}
