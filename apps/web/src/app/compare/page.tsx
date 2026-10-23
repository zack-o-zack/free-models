import type { Metadata } from "next";
import { Suspense } from "react";

import { JsonLd } from "@/components/json-ld";
import { ModelCompare } from "@/components/model-compare";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getModels } from "@/lib/model-data";
import { compareJsonLd, pageMetadata } from "@/lib/seo";

type ComparePageProps = {
  searchParams: Promise<{
    models?: string;
    highlight?: string;
  }>;
};

export async function generateMetadata({ searchParams }: ComparePageProps): Promise<Metadata> {
  const params = await searchParams;
  const hasSelection = Boolean(params.models);

  const base = pageMetadata(
    "Compare free AI models",
    "Compare free AI models by context window, capabilities, reasoning, tool calling, providers, usage limits, and benchmark scores.",
    "/compare",
  );

  if (!hasSelection) {
    return base;
  }

  return {
    ...base,
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function ComparePage() {
  const { models, githubStars } = await getModels();

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={compareJsonLd(models)} />
      <SiteHeader modelCount={models.length} githubStars={githubStars} />
      <main id="top" tabIndex={-1}>
        <Suspense fallback={<div className="container py-8 sm:py-10 max-w-[1400px]" />}>
          <ModelCompare models={models} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
