import { Suspense } from "react";

import { JsonLd } from "@/components/json-ld";
import { ModelCompare } from "@/components/model-compare";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getModels } from "@/lib/model-data";
import { compareJsonLd, pageMetadata } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata = pageMetadata(
  "Compare free AI models",
  "Compare free AI models by context window, capabilities, reasoning, tool calling, providers, usage limits, and benchmark scores.",
  "/compare",
);

export default async function ComparePage() {
  const { models, githubStars } = await getModels();

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={compareJsonLd(models)} />
      <SiteHeader modelCount={models.length} githubStars={githubStars} />
      <main id="top" tabIndex={-1}>
        <Suspense fallback={<div className="container max-w-[1400px] py-8 sm:py-10" />}>
          <ModelCompare models={models} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
