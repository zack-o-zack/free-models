import { CatalogueDirectoryPage } from "@/components/catalogue-entity-page";
import { directoryContent } from "@/lib/catalogue-entities";
import { getModels } from "@/lib/model-data";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-static";
export const metadata = pageMetadata(
  directoryContent.providers.title,
  directoryContent.providers.description,
  "/providers",
);

export default async function DirectoryPage() {
  const { models, githubStars } = await getModels();
  return <CatalogueDirectoryPage kind="providers" models={models} githubStars={githubStars} />;
}
