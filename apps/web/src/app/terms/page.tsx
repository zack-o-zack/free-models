import { ArrowLeft, FileText, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { getModels } from "@/lib/model-data";
import { pageMetadata } from "@/lib/seo";
import { termsData } from "@/lib/terms-data";

export const dynamic = "force-static";

const termsDescription =
  "Terms and conditions, trademark ownership notices, provider-dependent claims disclaimer, and limitation of liability for Free Models.";

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
        {/* Hero Band */}
        <section className="border-b border-border/70 bg-background py-8 sm:py-12">
          <div className="container max-w-4xl">
            <PageBreadcrumbs items={breadcrumbs} className="mb-4" />

            <div className="flex flex-col gap-3">
              <div className="inline-flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/20 text-foreground">
                  <ShieldAlert className="size-4" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Legal &amp; Disclaimer
                </span>
              </div>
              <h1 className="font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Terms &amp; Conditions
              </h1>
              <p
                data-page-description
                className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
              >
                {termsDescription}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                <span>Last updated: {termsData.lastUpdated}</span>
                <span>•</span>
                <span>Effective date: {termsData.effectiveDate}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Highlights Summary Cards */}
        <section className="border-b border-border/40 bg-muted/20 py-8">
          <div className="container max-w-4xl">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Key Policy Highlights
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {termsData.highlights.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-heading text-sm font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <Badge variant="outline" className="text-[10px]">
                      {item.badge}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Full Terms Content */}
        <section className="py-10 sm:py-14">
          <div className="container max-w-4xl">
            <div className="grid gap-10 md:grid-cols-[220px_minmax(0,1fr)]">
              {/* Table of contents sidebar */}
              <aside className="hidden md:block">
                <div className="sticky top-20 flex flex-col gap-1.5">
                  <span className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Contents
                  </span>
                  {termsData.sections.map((sec) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {sec.title}
                    </a>
                  ))}
                  <div className="mt-4 border-t border-border/60 pt-4">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="size-3.5" />
                      Back to catalogue
                    </Link>
                  </div>
                </div>
              </aside>

              {/* Sections */}
              <div className="space-y-10">
                {termsData.sections.map((sec) => (
                  <article
                    key={sec.id}
                    id={sec.id}
                    className="scroll-mt-24 space-y-3 rounded-2xl border border-border/60 bg-card p-6 shadow-xs sm:p-8"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      <h2 className="font-heading text-lg font-bold text-foreground sm:text-xl">
                        {sec.title}
                      </h2>
                    </div>
                    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                      {sec.content.map((paragraph) => (
                        <p key={`${sec.id}-${paragraph.slice(0, 32)}`}>{paragraph}</p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
