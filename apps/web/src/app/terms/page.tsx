import Link from "next/link";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getModels } from "@/lib/model-data";
import { pageMetadata } from "@/lib/seo";
import { termsData } from "@/lib/terms-data";

export const dynamic = "force-static";

const termsDescription =
  "The terms and conditions that apply to using Free Models, including trademark ownership and third-party liability notices.";

export const metadata = pageMetadata("Terms & Conditions", termsDescription, "/terms");

export default async function TermsPage() {
  const { models, githubStars } = await getModels();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Terms & Conditions", href: "/terms" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader modelCount={models.length} githubStars={githubStars} />

      <main id="top" tabIndex={-1}>
        <section className="border-b border-border/70 bg-background py-8 sm:py-12">
          <div className="container max-w-3xl">
            <PageBreadcrumbs items={breadcrumbs} className="mb-4" />
            <h1 className="font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Terms &amp; Conditions
            </h1>
            <p data-page-description className="mt-3 text-sm text-muted-foreground sm:text-base">
              Last updated: {termsData.lastUpdated}
            </p>
          </div>
        </section>

        <section className="py-10 sm:py-14">
          <div className="container max-w-3xl">
            <div className="space-y-8">
              {termsData.sections.map((sec) => (
                <section key={sec.id} id={sec.id} className="scroll-mt-24">
                  <h2 className="font-heading text-lg font-bold text-foreground sm:text-xl">
                    {sec.title}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {sec.content.map((paragraph) => (
                      <p key={`${sec.id}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <Link
              href="/"
              className="mt-10 inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to catalogue
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
