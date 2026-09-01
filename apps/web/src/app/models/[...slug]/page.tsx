import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ModelDetail } from "@/components/model-detail";
import { SiteHeader } from "@/components/site-header";
import { getModels } from "@/lib/model-data";
import { modelIdFromRouteSegments, modelRouteSegments } from "@/lib/model-path";

interface ModelPageProps {
  params: Promise<{ slug: string[] }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const models = await getModels();
  return models.map((model) => ({ slug: modelRouteSegments(model.id) }));
}

export async function generateMetadata({ params }: ModelPageProps): Promise<Metadata> {
  const modelId = modelIdFromRouteSegments((await params).slug);
  const model = (await getModels()).find((entry) => entry.id === modelId);

  if (!model) return { title: "Model not found" };

  return {
    title: `${model.name} · Free Models`,
    description: model.description,
  };
}

export default async function ModelPage({ params }: ModelPageProps) {
  const modelId = modelIdFromRouteSegments((await params).slug);
  const models = await getModels();
  const model = models.find((entry) => entry.id === modelId);

  if (!model) notFound();

  const publisherId = model.id.split("/")[0];
  const relatedModels = models
    .filter((entry) => entry.id !== model.id && entry.id.split("/")[0] === publisherId)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader modelCount={models.length} />
      <main>
        <ModelDetail model={model} relatedModels={relatedModels} />
      </main>
    </div>
  );
}
