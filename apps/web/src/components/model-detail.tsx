import type { LucideIcon } from "lucide-react";
import { BrainCircuit, ExternalLink, FileText, Gauge, Layers, Server } from "lucide-react";
import Link from "next/link";

import { CopyButton } from "@/components/copy-button";
import { LimitTerm } from "@/components/limit-term";
import { ModelBenchmarks } from "@/components/model-benchmarks";
import { ModelSectionNav } from "@/components/model-detail-navigation";
import { ModelFaq } from "@/components/model-faq";
import { ModelEssentials, ModelOverview } from "@/components/model-overview";
import { ProviderBadge } from "@/components/provider-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { entityHref, publisherSlug } from "@/lib/catalogue-entities";
import type { BenchmarkComparison } from "@/lib/model-benchmarks";
import { flattenConnectionEntries, formatConnectionKey, formatContext } from "@/lib/model-format";
import type { ModelHighlight } from "@/lib/model-highlights";
import { modelHref } from "@/lib/model-path";
import type { ModelConnection, ModelSummary } from "@/lib/model-types";
import { getProviderName } from "@/lib/provider-logos";

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Icon className="size-4.5" />
        </span>
        <h2 className="font-heading text-2xl font-extrabold tracking-[-0.035em] sm:text-3xl">
          {title}
        </h2>
      </div>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
        {description}
      </p>
    </div>
  );
}

export function ModelDetail({
  model,
  relatedModels,
  highlights,
  benchmarkComparisons,
}: {
  model: ModelSummary;
  relatedModels: ModelSummary[];
  highlights: ModelHighlight[];
  benchmarkComparisons: BenchmarkComparison[];
}) {
  const publisher = publisherSlug(model);
  const providerConnections = model.connections.length
    ? model.connections
    : model.providers.map((provider) => ({ provider, modelId: model.id, limits: [] as string[] }));
  const connectionsByProvider = providerConnections.reduce<Map<string, ModelConnection[]>>(
    (groups, connection) => {
      const group = groups.get(connection.provider) ?? [];
      group.push(connection);
      groups.set(connection.provider, group);
      return groups;
    },
    new Map(),
  );

  return (
    <div className="container py-8 sm:py-10 lg:max-w-[1280px]">
      <nav
        className="mb-6 flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link
          className="rounded-lg underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          href="/#models"
        >
          Models
        </Link>
        <span aria-hidden="true">/</span>
        {publisher && (
          <>
            <Link
              className="underline-offset-4 hover:underline"
              href={entityHref("publishers", publisher)}
            >
              {model.author}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span aria-current="page" className="break-words">
          {model.name}
        </span>
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <ModelOverview model={model} highlights={highlights} />
        <aside
          aria-label="Model details"
          className="min-w-0 space-y-3 lg:sticky lg:top-30 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100svh-9rem)] lg:overflow-y-auto lg:rounded-[24px]"
        >
          <ModelEssentials model={model} />
          <ModelSectionNav layout="sidebar" />
        </aside>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <ModelSectionNav />
          <div className="mt-3 rounded-[24px] bg-card px-5 py-8 sm:px-8 lg:mt-0">
            <div className="min-w-0 space-y-14">
              <section className="scroll-mt-20 space-y-5" id="providers" tabIndex={-1}>
                <SectionHeading
                  description={`Available through ${model.providers.length} free ${model.providers.length === 1 ? "provider" : "providers"}. Use the model ID and API settings below to connect.`}
                  icon={Server}
                  title="Providers"
                />
                <div className="space-y-6">
                  {Array.from(connectionsByProvider.entries()).map(([provider, connections]) => {
                    const docs = model.providerDocs[provider];
                    const docEntries: { label: string; url: string }[] = [];
                    if (docs?.overview) docEntries.push({ label: "Overview", url: docs.overview });
                    if (docs?.models) docEntries.push({ label: "Models", url: docs.models });
                    if (docs?.pricing) docEntries.push({ label: "Pricing", url: docs.pricing });
                    if (docs?.rateLimit)
                      docEntries.push({ label: "Rate limits", url: docs.rateLimit });

                    return (
                      <div
                        className="scroll-mt-20 space-y-3"
                        id={`provider-${provider}`}
                        tabIndex={-1}
                        key={provider}
                      >
                        <div className="flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-3">
                            <h3 className="sr-only">
                              {getProviderName(provider, model.providerNames)}
                            </h3>
                            <Link
                              href={entityHref("providers", provider)}
                              className="rounded-lg underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                            >
                              <ProviderBadge
                                plain
                                names={model.providerNames}
                                docs={model.providerDocs[provider]}
                                provider={provider}
                                size="xl"
                              />
                            </Link>
                            {connections.length > 1 && (
                              <span className="rounded-full bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground">
                                {connections.length} options
                              </span>
                            )}
                          </div>
                          {docEntries.length > 0 && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                              {docEntries.map((entry) => (
                                <a
                                  className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
                                  href={entry.url}
                                  key={entry.label}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  {entry.label}
                                  <ExternalLink className="size-3.5" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <Card className="flex flex-col overflow-hidden bg-background py-2 px-1">
                          <div className="space-y-8 p-3">
                            {connections.map((connection, idx) => (
                              <div className="space-y-3" key={connection.modelId}>
                                {connections.length > 1 && (
                                  <h4 className="flex min-w-0 items-baseline gap-2 font-heading text-sm font-bold text-foreground">
                                    <span className="shrink-0">Option {idx + 1}:</span>
                                    <code
                                      className="min-w-0 truncate font-code text-xs font-normal text-muted-foreground"
                                      title={connection.modelId}
                                    >
                                      {connection.modelId}
                                    </code>
                                  </h4>
                                )}

                                <div className="space-y-3">
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                    Connection Details
                                  </p>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-card p-4">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-muted-foreground">
                                          {formatConnectionKey("model_id")}
                                        </span>
                                        <CopyButton
                                          label={`Copy ${provider} model ID`}
                                          value={connection.modelId}
                                        />
                                      </div>
                                      <div className="relative">
                                        <code
                                          className="block overflow-x-auto whitespace-nowrap pb-1 pr-8 font-code text-xs text-foreground sm:text-sm"
                                          title={connection.modelId}
                                        >
                                          {connection.modelId}
                                        </code>
                                        <div className="pointer-events-none absolute bottom-1 right-0 top-0 w-8 bg-gradient-to-l from-card to-transparent" />
                                      </div>
                                    </div>

                                    {connection.connection &&
                                      flattenConnectionEntries(connection.connection).map(
                                        (entry) => {
                                          return (
                                            <div
                                              className="flex min-w-0 flex-col gap-1 rounded-xl bg-card p-4"
                                              key={`${connection.modelId}-${entry.key}-${entry.value}`}
                                            >
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-semibold text-muted-foreground">
                                                  {entry.key}
                                                </span>
                                                <CopyButton
                                                  label={`Copy ${provider} ${entry.key}`}
                                                  value={entry.value}
                                                />
                                              </div>
                                              <div className="relative">
                                                <code
                                                  className="block overflow-x-auto whitespace-nowrap pb-1 pr-8 font-code text-xs text-foreground sm:text-sm"
                                                  title={entry.value}
                                                >
                                                  {entry.value}
                                                </code>
                                                <div className="pointer-events-none absolute bottom-1 right-0 top-0 w-8 bg-gradient-to-l from-card to-transparent" />
                                              </div>
                                            </div>
                                          );
                                        },
                                      )}
                                  </div>
                                </div>
                                {connection.limits.length > 0 && (
                                  <div className="space-y-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                      Rate Limits
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                      {connection.limits.map((term) => (
                                        <LimitTerm key={term} term={term} />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
                <p className="px-1 text-xs text-muted-foreground">
                  * The provider match may differ from this model. Check its docs for details.
                </p>
              </section>

              <section className="scroll-mt-20 space-y-5" id="benchmarks" tabIndex={-1}>
                <SectionHeading
                  description="Compare scores and explore results by category."
                  icon={BrainCircuit}
                  title="Benchmarks"
                />
                <ModelBenchmarks
                  key={model.id}
                  comparisons={benchmarkComparisons}
                  designArena={model.designArena}
                />
              </section>

              <section className="scroll-mt-20 space-y-5" id="faq" tabIndex={-1}>
                <SectionHeading
                  description="Free access, setup, and what to expect."
                  icon={FileText}
                  title="Frequently asked questions"
                />
                <ModelFaq model={model} />
              </section>

              <section className="scroll-mt-20 space-y-5" id="related" tabIndex={-1}>
                <SectionHeading
                  description={`Explore other free models from ${model.author}.`}
                  icon={Layers}
                  title={`More from ${model.author}`}
                />
                {relatedModels.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {relatedModels.map((relatedModel) => (
                      <Link href={modelHref(relatedModel.id)} key={relatedModel.id}>
                        <Card
                          className="h-full bg-background transition-all hover:-translate-y-0.5 hover:bg-secondary"
                          size="sm"
                        >
                          <CardHeader>
                            <CardTitle>{relatedModel.name}</CardTitle>
                            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                              {relatedModel.description}
                            </p>
                          </CardHeader>
                          <CardContent className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Server className="size-3.5" /> {relatedModel.providers.length}
                            </span>
                            {relatedModel.contextLength > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Gauge className="size-3.5" />{" "}
                                {formatContext(relatedModel.contextLength)}
                              </span>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No other models from this developer are available here yet.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
