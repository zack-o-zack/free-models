import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BrainCircuit,
  CalendarDays,
  Code2,
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
import {
  formatBenchmarkScore,
  formatConnectionKey,
  formatConnectionValue,
  formatContext,
} from "@/lib/model-format";
import { modelHref } from "@/lib/model-path";
import type { ModelConnection, ModelSummary } from "@/lib/model-types";
import { providerFaviconUrl } from "@/lib/provider-logos";

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
    : model.providers.map((provider) => ({ provider, modelId: model.id }));
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
                <ProviderBadge iconOnly key={provider} provider={provider} />
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
            <Card className="bg-background px-4 py-2 sm:px-6">
              <Accordion defaultValue={Array.from(connectionsByProvider.keys())} multiple>
                {Array.from(connectionsByProvider.entries()).map(([provider, connections]) => (
                  <AccordionItem key={provider} value={provider}>
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <ProviderBadge plain provider={provider} size="lg" />
                        {connections.length > 1 && (
                          <span className="text-xs text-muted-foreground">
                            ({connections.length} offerings)
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-3 pt-1">
                        {connections.map((connection) => (
                          <div
                            className="space-y-1.5 border-t pt-3 first:border-t-0 first:pt-0"
                            key={connection.modelId}
                          >
                            <div className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                              <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                                <span className="shrink-0 text-xs font-medium text-muted-foreground sm:w-36">
                                  Model ID
                                </span>
                                <code
                                  className="min-w-0 flex-1 truncate font-code text-xs sm:text-sm"
                                  title={connection.modelId}
                                >
                                  {connection.modelId}
                                </code>
                              </div>
                              <CopyButton
                                label={`Copy ${provider} model ID`}
                                value={connection.modelId}
                              />
                            </div>

                            {Object.entries(connection.connection ?? {}).map(([key, rawValue]) => {
                              const formattedKey = formatConnectionKey(key);
                              const formattedValue = formatConnectionValue(rawValue);
                              if (!formattedValue) return null;
                              return (
                                <div
                                  className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2"
                                  key={key}
                                >
                                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                                    <span className="shrink-0 text-xs font-medium text-muted-foreground sm:w-36">
                                      {formattedKey}
                                    </span>
                                    <code
                                      className="min-w-0 flex-1 truncate font-code text-xs sm:text-sm"
                                      title={formattedValue}
                                    >
                                      {formattedValue}
                                    </code>
                                  </div>
                                  <CopyButton
                                    label={`Copy ${provider} ${formattedKey}`}
                                    value={formattedValue}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
            <p className="px-1 text-xs text-muted-foreground">
              * Closest provider match, not an exact offering. Check provider docs for details.
            </p>
          </section>

          <section className="scroll-mt-32 space-y-5" id="benchmarks" tabIndex={-1}>
            <SectionHeading
              description="Independent benchmark results available for this model. Higher scores are better; rank values use a # prefix."
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
                  It is currently listed by {model.providers.join(", ")}. Use the connection ID in
                  the Providers section and confirm exact availability in the provider docs.
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
