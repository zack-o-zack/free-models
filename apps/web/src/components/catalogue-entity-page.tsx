import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Layers, Server } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { ModelExplorer } from "@/components/model-explorer";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { ProviderBadge } from "@/components/provider-badge";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  type CatalogueEntity,
  directoryContent,
  type EntityKind,
  entityBreadcrumbs,
  entityDescription,
  entityHref,
  entityLabel,
  getCatalogueEntities,
  getEntityDocs,
} from "@/lib/catalogue-entities";
import { getEntityHighlight } from "@/lib/entity-highlight";
import { formatBenchmarkScore, formatContext } from "@/lib/model-format";
import type { ModelSummary } from "@/lib/model-types";
import { entityJsonLd } from "@/lib/seo";

export function EntityCards({ entities, kind }: { entities: CatalogueEntity[]; kind: EntityKind }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {entities.map((entity) => (
        <Link
          key={entity.slug}
          href={entityHref(kind, entity.slug)}
          className="group flex min-w-0 flex-col gap-6 rounded-[24px] bg-card p-6 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <div className="flex min-w-0 items-start justify-between gap-4">
            <ProviderBadge
              plain
              size="xl"
              provider={entity.slug}
              publisher={kind === "publishers"}
              docs={
                entity.models.find((model) => model.providerDocs[entity.slug])?.providerDocs[
                  entity.slug
                ]
              }
              names={{ [entity.slug]: entity.name }}
            />
            <ArrowUpRight
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{entity.models.length}</span> free{" "}
            {entity.models.length === 1 ? "model" : "models"}
          </p>
        </Link>
      ))}
    </div>
  );
}

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
  const label = entityLabel(kind);
  const relatedKind = isProvider ? "publishers" : "providers";
  const related = getCatalogueEntities(entity.models, relatedKind);
  const highlight = getEntityHighlight(entity.models);
  const docs = isProvider ? getEntityDocs(entity) : [];
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
          <div className="grid items-center gap-10 pb-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
            <div className="min-w-0">
              <p
                data-page-title-context
                className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase"
              >
                {isProvider ? <Server className="size-4" /> : <BookOpen className="size-4" />}{" "}
                {label}
              </p>
              <h1 className="font-heading text-5xl leading-[0.98] font-black tracking-[-0.055em] [overflow-wrap:anywhere] sm:text-7xl xl:text-8xl">
                {entity.name}
              </h1>
              <p
                data-page-description
                className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground"
              >
                {entityDescription(entity, kind)}
              </p>
              <Button
                className="mt-8 h-12 gap-4 px-6"
                render={<a href="#models" />}
                nativeButton={false}
              >
                Explore {entity.models.length} {entity.models.length === 1 ? "model" : "models"}{" "}
                <ArrowDown aria-hidden="true" />
              </Button>
            </div>
            <div className="rounded-[24px] bg-card p-6 sm:p-8">
              <p className="text-sm font-semibold">At a glance</p>
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
              {highlight && (
                <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-background p-4">
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
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Based on models in this catalogue. Availability and free limits vary by model.
              </p>
            </div>
          </div>
          {docs.length > 0 && (
            <div className="mt-8 rounded-[24px] bg-card p-6">
              <h2 className="text-sm font-semibold">{entity.name} resources</h2>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {docs.map((doc) => (
                  <a
                    key={doc.url}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {doc.label} <ArrowUpRight aria-hidden="true" className="size-4" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
        <ModelExplorer models={explorerModels} collection={{ name: entity.name, kind }} />
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
        <EntityCards entities={entities} kind={kind} />
      </main>
      <SiteFooter />
    </div>
  );
}
