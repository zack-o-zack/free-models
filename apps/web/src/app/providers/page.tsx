import { CatalogueDirectoryPage } from "@/components/catalogue-entity-page";
import { getModels } from "@/lib/model-data";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-static";
export const metadata = pageMetadata(
  "Free AI Model Providers",
  "Browse API providers offering free AI models. Compare available models and find API documentation.",
  "/providers",
);

export default async function DirectoryPage() {
  const { models, githubStars } = await getModels();
  return <CatalogueDirectoryPage kind="providers" models={models} githubStars={githubStars} />;
}
