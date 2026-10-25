import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { JsonLd } from "@/components/json-ld";
import { ModelCompare } from "@/components/model-compare";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  compareHref,
  parseCompareModelIds,
  parseCompareRouteSegments,
  parseHighlightBest,
} from "@/lib/model-compare";
import { getModels } from "@/lib/model-data";
import { compareJsonLd, pageMetadata } from "@/lib/seo";

type ComparePageProps = {
  params: Promise<{
    slug?: string[];
  }>;
  searchParams: Promise<{
    models?: string;
    highlight?: string;
  }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: ComparePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const search = await searchParams;
  const slug = resolvedParams?.slug;

  const modelIds =
    slug && slug.length > 0
      ? parseCompareRouteSegments(slug)
      : search.models
        ? parseCompareModelIds(`?models=${search.models}`)
        : [];

  const { models } = await getModels();
  const selectedModels = modelIds
    .map((id) => models.find((m) => m.id === id))
    .filter((m): m is (typeof models)[number] => Boolean(m));

  const hasSelection = selectedModels.length > 0;

  if (!hasSelection) {
    return pageMetadata(
      "Compare free AI models",
      "Compare free AI models by context window, capabilities, reasoning, tool calling, providers, usage limits, and benchmark scores.",
      "/compare",
    );
  }

  const names = selectedModels.map((m) => m.name).join(" vs ");
  const title = `Compare ${names} | Free AI Models`;
  const description = `Side-by-side comparison of ${names}: context window, intelligence, coding, agentic benchmark scores, features, and free provider limits.`;
  const canonical = compareHref(modelIds);

  const base = pageMetadata(title, description, canonical);

  return {
    ...base,
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function ComparePage({ params, searchParams }: ComparePageProps) {
  const resolvedParams = await params;
  const search = await searchParams;
  const slug = resolvedParams?.slug;

  // Backwards compatibility: redirect `/compare?models=...` to path param URL
  if ((!slug || slug.length === 0) && search.models) {
    const legacyIds = parseCompareModelIds(`?models=${search.models}`);
    if (legacyIds.length > 0) {
      redirect(compareHref(legacyIds, parseHighlightBest(`?highlight=${search.highlight}`)));
    }
  }

  const initialModelIds = slug && slug.length > 0 ? parseCompareRouteSegments(slug) : [];
  const { models, githubStars } = await getModels();

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={compareJsonLd(models)} />
      <SiteHeader modelCount={models.length} githubStars={githubStars} />
      <main id="top" tabIndex={-1}>
        <Suspense fallback={<div className="container max-w-[1400px] py-8 sm:py-10" />}>
          <ModelCompare models={models} initialModelIds={initialModelIds} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
