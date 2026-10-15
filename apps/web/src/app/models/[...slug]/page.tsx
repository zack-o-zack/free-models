import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";

import { ModelDetail } from "@/components/model-detail";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBenchmarkComparisons } from "@/lib/model-benchmarks";
import { getModels } from "@/lib/model-data";
import { getModelHighlights } from "@/lib/model-highlights";
import { modelHref, modelIdFromRouteSegments, modelRouteSegments } from "@/lib/model-path";
import { modelDescription, modelJsonLd, pageMetadata } from "@/lib/seo";

interface ModelPageProps {
  params: Promise<{ slug: string[] }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const { models } = await getModels();
  return models.map((model) => ({ slug: modelRouteSegments(model.id) }));
}

export async function generateMetadata({ params }: ModelPageProps): Promise<Metadata> {
  const modelId = modelIdFromRouteSegments((await params).slug);
  const { models } = await getModels();
  const model = models.find((entry) => entry.id === modelId);

  if (!model) notFound();

  return pageMetadata(model.name, modelDescription(model), modelHref(model.id));
}

export default async function ModelPage({ params }: ModelPageProps) {
  const modelId = modelIdFromRouteSegments((await params).slug);
  const { models, githubStars } = await getModels();
  const model = models.find((entry) => entry.id === modelId);

  if (!model) notFound();

  const publisherId = model.id.split("/")[0];
  const relatedModels = models
    .filter((entry) => entry.id !== model.id && entry.id.split("/")[0] === publisherId)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={modelJsonLd(model)} />
      <SiteHeader modelCount={models.length} githubStars={githubStars} />
      <main id="top" tabIndex={-1}>
        <ModelDetail
          model={model}
          relatedModels={relatedModels}
          highlights={getModelHighlights(model, models)}
          benchmarkComparisons={getBenchmarkComparisons(model, models)}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
