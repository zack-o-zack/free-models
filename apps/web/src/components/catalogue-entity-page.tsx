import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Layers, Server } from "lucide-react";
import Link from "next/link";
import { BrandImage } from "@/components/brand-image";
import { CatalogueDirectoryList } from "@/components/catalogue-directory-list";
import { EntityCards } from "@/components/entity-cards";
import { JsonLd } from "@/components/json-ld";
import { ModelExplorer } from "@/components/model-explorer";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  type CatalogueEntity,
  directoryContent,
  type EntityKind,
  entityBreadcrumbs,
  entityDescription,
  entityLabel,
  getCatalogueEntities,
  getEntityDocs,
} from "@/lib/catalogue-entities";
import { toCatalogueModel } from "@/lib/catalogue-model";
import { getEntityHighlight } from "@/lib/entity-highlight";
import { formatBenchmarkScore, formatContext } from "@/lib/model-format";
import type { ModelSummary } from "@/lib/model-types";
import { providerFaviconUrl, publisherFaviconUrl, publisherWebsites } from "@/lib/provider-logos";
import { entityJsonLd } from "@/lib/seo";

export { EntityCards };

function entityInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatHostname(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const compactResourceLabels: Record<string, string> = {
  Documentation: "Docs",
  "Model catalogue": "Models",
  "Pricing & free access": "Pricing",
  "Rate limits": "Limits",
};

export function CatalogueEntityPage({
  entity,
  kind,
  models,
  githubStars,
}: {
  entity: CatalogueEntity;
  kind: EntityKind;
  models: ModelSummary[];
  githubStars: number;
}) {
  const isProvider = kind === "providers";
  const logoUrl = isProvider
    ? (entity.models
        .map((model) => providerFaviconUrl(model.providerDocs[entity.slug]))
        .find((url): url is string => Boolean(url)) ?? publisherFaviconUrl(entity.slug))
    : publisherFaviconUrl(entity.slug);

  const label = entityLabel(kind);
  const relatedKind = isProvider ? "publishers" : "providers";
  const related = getCatalogueEntities(entity.models, relatedKind);
  const highlight = getEntityHighlight(entity.models);
  const docs = isProvider ? getEntityDocs(entity) : [];
  const websiteUrl = isProvider
    ? (docs.find((doc) => doc.label === "Documentation")?.url ?? docs[0]?.url ?? null)
    : (publisherWebsites[entity.slug.toLowerCase()] ?? null);
  const websiteHostname = formatHostname(websiteUrl);

  const explorerModels = isProvider
    ? entity.models.map((model) => ({
        ...model,
        providers: [entity.slug, ...model.providers.filter((provider) => provider !== entity.slug)],
      }))
    : entity.models;
  const reasoning = entity.models.filter((model) => model.supportsReasoning).length;
  const tools = entity.models.filter((model) => model.supportsTools).length;

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={entityJsonLd(entity, kind)} />
      <SiteHeader modelCount={models.length} githubStars={githubStars} />
      <main id="top" tabIndex={-1}>
        <section className="container py-8 sm:py-12">
          <PageBreadcrumbs items={entityBreadcrumbs(entity, kind)} className="mb-10" />
          <div className="grid items-start gap-10 pb-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
            <div className="min-w-0">
              <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
                <Avatar
                  aria-hidden="true"
                  className="mt-1 size-14 shrink-0 rounded-2xl bg-logo-surface ring-1 ring-border/80 shadow-xs sm:mt-0 sm:size-16 xl:size-20"
                >
                  {logoUrl && (
                    <BrandImage
                      src={logoUrl}
                      alt=""
                      loading="eager"
                      className="rounded-[inherit] object-contain p-2.5 sm:p-3"
                    />
                  )}
                  <AvatarFallback className="rounded-[inherit] bg-transparent font-heading text-xl font-black tracking-tight text-foreground sm:text-2xl">
                    {entityInitials(entity.name)}
                  </AvatarFallback>
                </Avatar>
                <h1 className="min-w-0 font-heading text-4xl leading-[1.02] font-black tracking-[-0.055em] [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl xl:text-7xl">
                  {entity.name}
                </h1>
              </div>
              <p
                data-page-description
                className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground"
              >
                {entityDescription(entity, kind)}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  className="h-15 shrink-0 gap-4 px-6"
                  render={<a href="#models" />}
                  nativeButton={false}
                >
                  Explore {entity.models.length} {entity.models.length === 1 ? "model" : "models"}{" "}
                  <ArrowDown aria-hidden="true" />
                </Button>
                {highlight && (
                  <div className="flex w-fit min-w-[17rem] max-w-sm flex-wrap items-baseline gap-x-4 gap-y-2 rounded-2xl bg-card px-6 py-4">
                    <span className="text-sm text-muted-foreground">{highlight.label}</span>
                    <span className="text-lg font-semibold">
                      {highlight.unit === "tokens"
                        ? `${formatContext(highlight.value)} tokens`
                        : highlight.unit === "models"
                          ? `${highlight.value} ${highlight.value === 1 ? "model" : "models"}`
                          : formatBenchmarkScore(highlight.value)}
                    </span>
                  </div>
                )}
              </div>
              {docs.length > 0 && (
                <nav
                  aria-label={`${entity.name} resources`}
                  className="mt-8 flex min-w-0 w-full max-w-[36rem] flex-wrap gap-x-5 gap-y-1"
                >
                  {docs.map((doc) => (
                    <a
                      key={doc.url}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {compactResourceLabels[doc.label] ?? doc.label}{" "}
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                    </a>
                  ))}
                </nav>
              )}
            </div>
            <aside
              aria-label={`${entity.name} overview`}
              className="overflow-hidden rounded-[24px] bg-card shadow-xs lg:col-start-2 lg:row-start-1"
            >
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border/70 pb-4">
                  <p
                    data-page-title-context
                    className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase"
                  >
                    {isProvider ? <Server className="size-4" /> : <BookOpen className="size-4" />}
                    <span>{label}</span>
                  </p>
                  {websiteUrl && websiteHostname && (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      <span>{websiteHostname}</span>
                      <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
                    </a>
                  )}
                </div>
                <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8">
                  {[
                    { label: "Free models", value: entity.models.length },
                    { label: isProvider ? "Publishers" : "API providers", value: related.length },
                    { label: "With reasoning", value: reasoning },
                    { label: "With tool calling", value: tools },
                  ].map((stat) => (
                    <div key={stat.label} className="flex flex-col-reverse gap-2">
                      <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                      <dd className="font-heading text-4xl font-black tracking-tight">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </aside>
          </div>
        </section>
        <ModelExplorer
          models={explorerModels.map(toCatalogueModel)}
          collection={{ name: entity.name, kind }}
        />
        {related.length > 0 && (
          <section className="container py-12 sm:py-16" aria-labelledby="related-heading">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Layers className="size-4" /> Keep exploring
                </p>
                <h2
                  id="related-heading"
                  className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl"
                >
                  {isProvider ? "Meet the publishers." : "Find a provider."}
                </h2>
                <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                  {isProvider
                    ? `The publishers behind models available through ${entity.name}.`
                    : `These providers offer free access to ${entity.name} models.`}
                </p>
              </div>
              <Link
                href={`/${relatedKind}`}
                className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold"
              >
                All {relatedKind} <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <EntityCards entities={related} kind={relatedKind} />
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export function CatalogueDirectoryPage({
  kind,
  models,
  githubStars,
}: {
  kind: EntityKind;
  models: ModelSummary[];
  githubStars: number;
}) {
  const entities = getCatalogueEntities(models, kind);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader modelCount={models.length} githubStars={githubStars} />
      <main id="top" tabIndex={-1} className="container py-12 sm:py-16">
        <p className="text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {entities.length} {kind}
        </p>
        <h1 className="mt-4 max-w-4xl font-heading text-5xl leading-none font-black tracking-[-0.055em] sm:text-7xl">
          {directoryContent[kind].title}
        </h1>
        <p
          data-page-description
          className="mt-6 mb-10 max-w-2xl text-lg leading-8 text-muted-foreground"
        >
          {directoryContent[kind].description}
        </p>
        <CatalogueDirectoryList entities={entities} kind={kind} />
      </main>
      <SiteFooter />
    </div>
  );
}
