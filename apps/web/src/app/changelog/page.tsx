import { ChangelogFeed } from "@/components/changelog-feed";
import { JsonLd } from "@/components/json-ld";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getChangelog } from "@/lib/changelog-data";
import { getModels } from "@/lib/model-data";
import { changelogJsonLd, pageMetadata } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata = pageMetadata(
  "Free AI Models Changelog",
  "Track daily additions and removals of free AI models and zero-cost LLM APIs across all supported providers over the past 30 days.",
  "/changelog",
);

export default async function ChangelogPage() {
  const [{ models, githubStars }, changelog] = await Promise.all([getModels(), getChangelog()]);

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Changelog", href: "/changelog" },
  ];

  const activeProviderSlugs = Array.from(new Set(models.flatMap((m) => m.providers)));

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={changelogJsonLd()} />
      <SiteHeader modelCount={models.length} githubStars={githubStars} />

      <main id="top" tabIndex={-1}>
        {/* Sage Canvas Hero Band */}
        <section className="border-b border-border/70 bg-background py-8 sm:py-10">
          <div className="container max-w-4xl">
            <PageBreadcrumbs items={breadcrumbs} className="mb-4" />

            <div>
              <h1 className="font-heading text-3xl font-black tracking-tight sm:text-4xl text-foreground">
                Free AI Models Changelog
              </h1>
              <p data-page-description className="mt-2 text-sm text-muted-foreground sm:text-base">
                Track daily additions and removals of free AI models and zero-cost LLM APIs across
                all supported providers over the past 30 days.
              </p>
            </div>
          </div>
        </section>

        {/* Feed Section */}
        <section className="py-6 sm:py-8">
          <div className="container max-w-4xl">
            <ChangelogFeed
              entries={changelog.entries}
              activeModelIds={models.map((m) => m.id)}
              activeProviderSlugs={activeProviderSlugs}
            />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
