import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BrainCircuit,
  CalendarDays,
  Code2,
  ExternalLink,
  EyeOff,
  FileText,
  Gauge,
  Layers,
  Server,
  Sparkles,
  Swords,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ModalityMetric } from "@/components/benchmark-metric";
import { CopyButton } from "@/components/copy-button";
import { DesignArenaTable } from "@/components/design-arena-popover";
import { ExpandableModelDescription } from "@/components/expandable-model-description";
import { LimitTerm } from "@/components/limit-term";
import { ModelSectionNav, StickyModelHeader } from "@/components/model-detail-navigation";
import { ProviderBadge } from "@/components/provider-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { flattenConnectionEntries, formatBenchmarkScore, formatContext } from "@/lib/model-format";
import { modelHref } from "@/lib/model-path";
import type { ModelConnection, ModelSummary } from "@/lib/model-types";
import { getProviderName, providerFaviconUrl } from "@/lib/provider-logos";

const MAX_SUMMARY_PROVIDERS = 4;

function initials(value: string): string {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp * 1000));
}

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

function SummaryItem({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1 rounded-2xl bg-background/10 px-6 py-4">
      <p className="flex items-center gap-1.5 text-xs text-background/60">
        <Icon className="size-3.5" /> {label}
      </p>
      <div className="flex min-h-6 items-center font-heading text-base font-extrabold text-background">
        {children}
      </div>
    </div>
  );
}

function BenchmarkCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <Card className="bg-background" size="sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-3xl tabular-nums">{formatBenchmarkScore(value)}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function ModelDetail({
  model,
  relatedModels,
}: {
  model: ModelSummary;
  relatedModels: ModelSummary[];
}) {
  const modelLogoUrl = providerFaviconUrl(model.id.split("/")[0]);
  const modelNameSize =
    model.name.length > 44
      ? "text-[1.75rem] leading-[1.02] sm:text-5xl lg:text-[3.5rem]"
      : model.name.length > 30
        ? "text-3xl leading-none sm:text-5xl lg:text-6xl"
        : "text-4xl leading-none sm:text-6xl lg:text-7xl";
  const providerConnections = model.connections.length
    ? model.connections
    : model.providers.map((provider) => ({ provider, modelId: model.id, limits: [] as string[] }));
  const summaryProviders = model.providers.slice(0, MAX_SUMMARY_PROVIDERS);
  const additionalSummaryProviders = model.providers.length - summaryProviders.length;
  const connectionsByProvider = providerConnections.reduce<Map<string, ModelConnection[]>>(
    (groups, connection) => {
      const group = groups.get(connection.provider) ?? [];
      group.push(connection);
      groups.set(connection.provider, group);
      return groups;
    },
    new Map(),
  );
  const artificialAnalysisBenchmarks = [
    model.intelligenceScore,
    model.codingScore,
    model.agenticScore,
  ].filter((score) => score !== null).length;
  const hasBenchmarks = artificialAnalysisBenchmarks > 0 || model.designArena.length > 0;

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">
      <nav
        className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link className="hover:text-primary" href="/#models">
          Models
        </Link>
        <span aria-hidden="true">/</span>
        <span>{model.author}</span>
      </nav>

      <section
        className="overflow-hidden rounded-[32px] bg-foreground p-6 text-background sm:p-10 lg:p-12"
        id="model-hero"
      >
        <div className="flex min-w-0 items-start gap-4">
          {!model.isStealth && (
            <Avatar className="size-14 bg-white ring-4 ring-background/10 sm:size-16">
              {modelLogoUrl && (
                <AvatarImage
                  alt={`${model.author} logo`}
                  className="object-contain p-2.5"
                  src={modelLogoUrl}
                />
              )}
              <AvatarFallback className="bg-white font-heading text-lg font-bold text-black">
                {initials(model.author)}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={`font-heading font-extrabold tracking-[-0.055em] ${modelNameSize}`}>
                {model.name}
              </h1>
              {model.isStealth && (
                <Badge variant="secondary">
                  <EyeOff /> Stealth
                </Badge>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-1 text-sm text-background/60">
              <code className="truncate font-code text-xs sm:text-sm">{model.id}</code>
              <CopyButton label="Copy model ID" value={model.id} />
            </div>
          </div>
        </div>

        <ExpandableModelDescription description={model.description} key={model.id} />

        <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem icon={Server} label="Free providers">
            <div className="flex max-w-full items-center gap-1">
              {summaryProviders.map((provider) => (
                <ProviderBadge
                  iconOnly
                  key={provider}
                  names={model.providerNames}
                  provider={provider}
                />
              ))}
              {additionalSummaryProviders > 0 && (
                <span className="inline-flex h-5 items-center rounded-full bg-background/15 px-2 font-sans text-[11px] font-bold text-background">
                  +{additionalSummaryProviders} more
                </span>
              )}
            </div>
          </SummaryItem>
          {model.contextLength > 0 && (
            <SummaryItem icon={Gauge} label="Context window">
              {formatContext(model.contextLength)} tokens
            </SummaryItem>
          )}
          {model.created !== null && (
            <SummaryItem icon={CalendarDays} label="Released">
              {formatDate(model.created)}
            </SummaryItem>
          )}
          {(model.inputModalities.length > 0 || model.outputModalities.length > 0) && (
            <SummaryItem icon={Layers} label="Modalities">
              <ModalityMetric
                input={model.inputModalities}
                output={model.outputModalities}
                tone="hero"
              />
            </SummaryItem>
          )}
        </div>
      </section>

      <StickyModelHeader
        author={model.author}
        isStealth={model.isStealth}
        logoUrl={modelLogoUrl}
        name={model.name}
      />

      <div className="mt-8 grid items-start gap-10 rounded-[40px] bg-card px-5 py-10 sm:px-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:px-10 lg:py-14">
        <aside className="sticky top-36 hidden rounded-[24px] bg-background p-3 lg:block">
          <ModelSectionNav />
        </aside>

        <div className="min-w-0 space-y-14">
          <section className="scroll-mt-32 space-y-5" id="providers" tabIndex={-1}>
            <SectionHeading
              description={`Available through ${model.providers.length} free ${model.providers.length === 1 ? "provider" : "providers"}. Use the provider-specific model ID and connection details when connecting.`}
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
                if (docs?.rateLimit) docEntries.push({ label: "Rate limits", url: docs.rateLimit });

                return (
                  <div className="space-y-3" key={provider}>
                    <div className="flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3">
                        <ProviderBadge
                          plain
                          names={model.providerNames}
                          provider={provider}
                          size="xl"
                        />
                        {connections.length > 1 && (
                          <span className="rounded-full bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground">
                            {connections.length} offerings
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
                              <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                Connection Details
                              </h5>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-card p-4 shadow-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-muted-foreground">
                                      model_id
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
                                  flattenConnectionEntries(connection.connection).map((entry) => {
                                    return (
                                      <div
                                        className="flex min-w-0 flex-col gap-1 rounded-xl bg-card p-4 shadow-sm"
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
                                  })}
                              </div>
                            </div>
                            {connection.limits.length > 0 && (
                              <div className="space-y-3">
                                <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                  Rate Limits
                                </h5>
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
              * Closest provider match, not an exact offering. Check provider docs for details.
            </p>
          </section>

          <section className="scroll-mt-32 space-y-5" id="benchmarks" tabIndex={-1}>
            <SectionHeading
              description="Independent benchmark results available for this model."
              icon={BrainCircuit}
              title="Benchmarks"
            />
            {hasBenchmarks ? (
              <div className="space-y-5">
                {artificialAnalysisBenchmarks > 0 && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {model.intelligenceScore !== null && (
                      <BenchmarkCard
                        icon={BrainCircuit}
                        label="Intelligence Index"
                        value={model.intelligenceScore}
                      />
                    )}
                    {model.codingScore !== null && (
                      <BenchmarkCard icon={Code2} label="Coding Index" value={model.codingScore} />
                    )}
                    {model.agenticScore !== null && (
                      <BenchmarkCard icon={Bot} label="Agentic Index" value={model.agenticScore} />
                    )}
                  </div>
                )}
                {model.designArena.length > 0 && (
                  <Card className="bg-background">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Swords className="size-4" /> Design Arena
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <DesignArenaTable benchmarks={model.designArena} />
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-background">
                <CardContent className="text-muted-foreground">
                  No benchmark results are available for this model yet.
                </CardContent>
              </Card>
            )}
          </section>

          <section className="scroll-mt-32 space-y-5" id="faq" tabIndex={-1}>
            <SectionHeading
              description="Quick answers based on the current catalogue entry."
              icon={FileText}
              title="Frequently asked questions"
            />
            <Accordion className="rounded-[24px] bg-background px-6 sm:px-8">
              <AccordionItem value="what-is-it">
                <AccordionTrigger className="py-5 font-heading text-base font-bold leading-snug hover:no-underline sm:text-lg">
                  What is {model.name}?
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[15px] leading-7 text-muted-foreground sm:text-base">
                  {model.description}
                </AccordionContent>
              </AccordionItem>
              {model.contextLength > 0 && (
                <AccordionItem value="context">
                  <AccordionTrigger className="py-5 font-heading text-base font-bold leading-snug hover:no-underline sm:text-lg">
                    What is the context window?
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-[15px] leading-7 text-muted-foreground sm:text-base">
                    {model.name} has a {formatContext(model.contextLength)} token context window.
                  </AccordionContent>
                </AccordionItem>
              )}
              <AccordionItem value="providers">
                <AccordionTrigger className="py-5 font-heading text-base font-bold leading-snug hover:no-underline sm:text-lg">
                  Where can I use this model for free?
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[15px] leading-7 text-muted-foreground sm:text-base">
                  It is currently listed by{" "}
                  {model.providers
                    .map((provider) => getProviderName(provider, model.providerNames))
                    .join(", ")}
                  . Use the connection ID in the Providers section and confirm exact availability in
                  the provider docs.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="benchmarks">
                <AccordionTrigger className="py-5 font-heading text-base font-bold leading-snug hover:no-underline sm:text-lg">
                  Are benchmark results available?
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[15px] leading-7 text-muted-foreground sm:text-base">
                  {hasBenchmarks
                    ? `${artificialAnalysisBenchmarks} Artificial Analysis scores and ${model.designArena.length} Design Arena results are listed above.`
                    : "No benchmark results are included in the catalogue for this model yet."}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          <section className="scroll-mt-32 space-y-5" id="related" tabIndex={-1}>
            <SectionHeading
              description={`Other free models from ${model.author} in this catalogue.`}
              icon={Sparkles}
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
                No other models from this publisher are in the catalogue.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
