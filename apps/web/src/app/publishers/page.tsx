import { CatalogueDirectoryPage } from "@/components/catalogue-entity-page";
import { getModels } from "@/lib/model-data";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-static";
export const metadata = pageMetadata(
  "Free AI Model Publishers",
  "Explore AI model publishers, their free models, and the API providers offering access.",
  "/publishers",
);

export default async function DirectoryPage() {
  const { models, githubStars } = await getModels();
  return <CatalogueDirectoryPage kind="publishers" models={models} githubStars={githubStars} />;
}
