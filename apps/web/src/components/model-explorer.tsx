"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  AudioLines,
  Bot,
  BrainCircuit,
  Code2,
  Database,
  EyeOff,
  Image as ImageIcon,
  LayoutGrid,
  LayoutList,
  Mic,
  Mic2,
  Search,
  SlidersHorizontal,
  TableProperties,
  TextIcon,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BenchmarkMetric } from "@/components/benchmark-metric";
import { DesignArenaPopover } from "@/components/design-arena-popover";
import { ModelCard } from "@/components/model-card";
import {
  CONTEXT_STEPS,
  ModelFilters,
  type ProviderFilterOption,
  type PublisherFilterOption,
} from "@/components/model-filters";
import { ProviderBadge } from "@/components/provider-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBenchmarkScore, formatContext } from "@/lib/model-format";
import { modelHref } from "@/lib/model-path";
import type { ModelSummary } from "@/lib/model-types";
import { getProviderName, providerFaviconUrl } from "@/lib/provider-logos";

type SortOption = "newest" | "oldest" | "context" | "name" | "intelligence" | "coding" | "agentic";
type ViewMode = "list" | "table";
type OutputFilter =
  | "all"
  | "text"
  | "image"
  | "audio"
  | "video"
  | "transcript"
  | "embeddings"
  | "rerank";

const outputTabs: Array<{
  value: OutputFilter;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "all", label: "All", icon: LayoutGrid },
  { value: "text", label: "Text", icon: TextIcon },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "audio", label: "Audio", icon: AudioLines },
  { value: "video", label: "Video", icon: Video },
  { value: "transcript", label: "Transcript", icon: Mic },
  { value: "embeddings", label: "Embeddings", icon: Database },
  { value: "rerank", label: "Rerank", icon: SlidersHorizontal },
];

function matchesOutputModality(outputModalities: string[], tabValue: OutputFilter): boolean {
  if (tabValue === "all") return true;
  if (tabValue === "audio") {
    return outputModalities.includes("audio") || outputModalities.includes("speech");
  }
  if (tabValue === "transcript") {
    return outputModalities.includes("transcript") || outputModalities.includes("transcription");
  }
  return outputModalities.includes(tabValue);
}

const sortLabels: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  context: "Largest context",
  name: "Name",
  intelligence: "Intelligence score",
  coding: "Coding score",
  agentic: "Agentic score",
};

function initials(value: string): string {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function compareScores(left: number | null, right: number | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
}

export function ModelExplorer({ models }: { models: ModelSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [view, setView] = useState<ViewMode>("list");
  const [output, setOutput] = useState<OutputFilter>("all");
  const [selectedInputs, setSelectedInputs] = useState<string[]>([]);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [contextRange, setContextRange] = useState<[number, number]>([0, CONTEXT_STEPS.length - 1]);

  const liveProviderNames = useMemo(() => {
    const merged: Record<string, string> = {};
    for (const model of models) {
      Object.assign(merged, model.providerNames);
    }
    return merged;
  }, [models]);

  const providerOptions = useMemo<ProviderFilterOption[]>(() => {
    const providers = new Set(models.flatMap((model) => model.providers));

    return Array.from(providers)
      .map((value) => ({ value, label: getProviderName(value, liveProviderNames) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [models, liveProviderNames]);

  const publisherOptions = useMemo<PublisherFilterOption[]>(() => {
    const publishers = new Map<string, PublisherFilterOption>();

    for (const model of models) {
      const separatorIndex = model.id.indexOf("/");
      if (separatorIndex <= 0) continue;

      const value = model.id.slice(0, separatorIndex);
      publishers.set(value, {
        value,
        label: model.author,
      });
    }

    return Array.from(publishers.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [models]);

  const isContextFiltered = contextRange[0] > 0 || contextRange[1] < CONTEXT_STEPS.length - 1;
  const activeFilterCount =
    selectedInputs.length +
    selectedPublishers.length +
    selectedProviders.length +
    (isContextFiltered ? 1 : 0);

  const counts = useMemo(() => {
    return Object.fromEntries(
      outputTabs.map((tab) => [
        tab.value,
        tab.value === "all"
          ? models.length
          : models.filter((model) => matchesOutputModality(model.outputModalities, tab.value))
              .length,
      ]),
    ) as Record<OutputFilter, number>;
  }, [models]);

  const visibleModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const minContext = CONTEXT_STEPS[contextRange[0]];
    const maxContext = CONTEXT_STEPS[contextRange[1]];
    const isFiltered = contextRange[0] > 0 || contextRange[1] < CONTEXT_STEPS.length - 1;

    return models
      .filter((model) => {
        const searchable = [
          model.name,
          model.id,
          model.author,
          model.description,
          ...model.providers,
        ]
          .join(" ")
          .toLowerCase();

        const matchesContext =
          !isFiltered ||
          (model.contextLength >= minContext &&
            (contextRange[1] === CONTEXT_STEPS.length - 1 || model.contextLength <= maxContext));

        return (
          (normalizedQuery.length === 0 || searchable.includes(normalizedQuery)) &&
          (output === "all" || matchesOutputModality(model.outputModalities, output)) &&
          selectedInputs.every((modality) => model.inputModalities.includes(modality)) &&
          (selectedPublishers.length === 0 ||
            selectedPublishers.includes(model.id.split("/")[0])) &&
          (selectedProviders.length === 0 ||
            selectedProviders.some((provider) => model.providers.includes(provider))) &&
          matchesContext
        );
      })
      .sort((left, right) => {
        if (sort === "name") return left.name.localeCompare(right.name);
        if (sort === "context") return right.contextLength - left.contextLength;
        if (sort === "intelligence") {
          return compareScores(left.intelligenceScore, right.intelligenceScore);
        }
        if (sort === "coding") return compareScores(left.codingScore, right.codingScore);
        if (sort === "agentic") return compareScores(left.agenticScore, right.agenticScore);
        if (sort === "oldest") {
          return (
            (left.created ?? Number.MAX_SAFE_INTEGER) - (right.created ?? Number.MAX_SAFE_INTEGER)
          );
        }
        return (right.created ?? 0) - (left.created ?? 0);
      });
  }, [
    contextRange,
    models,
    output,
    query,
    selectedInputs,
    selectedProviders,
    selectedPublishers,
    sort,
  ]);

  function toggleInput(modality: string) {
    setSelectedInputs((current) =>
      current.includes(modality)
        ? current.filter((value) => value !== modality)
        : [...current, modality],
    );
  }

  function toggleProvider(provider: string) {
    setSelectedProviders((current) =>
      current.includes(provider)
        ? current.filter((value) => value !== provider)
        : [...current, provider],
    );
  }

  function togglePublisher(publisher: string) {
    setSelectedPublishers((current) =>
      current.includes(publisher)
        ? current.filter((value) => value !== publisher)
        : [...current, publisher],
    );
  }

  function clearFilters() {
    setSelectedInputs([]);
    setSelectedPublishers([]);
    setSelectedProviders([]);
    setContextRange([0, CONTEXT_STEPS.length - 1]);
  }

  const filterProps = {
    selectedInputs,
    selectedPublishers,
    selectedProviders,
    contextRange,
    publisherOptions,
    providerOptions,
    providerNames: liveProviderNames,
    activeFilterCount,
    onToggleInput: toggleInput,
    onTogglePublisher: togglePublisher,
    onToggleProvider: toggleProvider,
    onContextRangeChange: setContextRange,
    onClear: clearFilters,
  };

  return (
    <>
      <section className="overflow-hidden bg-background">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:items-center lg:py-24">
          <div className="max-w-4xl">
            <Badge className="h-8 px-3" variant="secondary">
              <CircleIcon /> Curated and updated regularly
            </Badge>
            <h1 className="mt-6 max-w-4xl font-heading text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.86] font-extrabold tracking-[-0.075em]">
              Build more.
              <br />
              Spend <span className="text-positive">less.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Compare genuinely free AI models across providers, modalities, context windows, and
              the capabilities that matter to your next build.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button render={<a href="#models" />} nativeButton={false} size="lg">
                Explore {models.length} models <ArrowDownRight />
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                No trials. No card required.
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-12 -right-12 size-40 rounded-full bg-primary opacity-70 blur-3xl" />
            <div className="relative overflow-hidden rounded-[32px] bg-foreground p-7 text-background sm:p-9">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold opacity-70">Catalogue snapshot</p>
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  LIVE
                </span>
              </div>
              <p className="mt-8 font-heading text-7xl font-extrabold tracking-[-0.07em] text-primary dark:text-primary-foreground sm:text-8xl">
                {models.length}
              </p>
              <p className="mt-1 text-lg font-semibold">free models and counting</p>
              <div className="mt-9 grid grid-cols-3 gap-2 border-t border-background/20 pt-6">
                <HeroStat
                  icon={BrainCircuit}
                  label="Reasoning"
                  value={models.filter((model) => model.supportsReasoning).length}
                />
                <HeroStat
                  icon={Video}
                  label="Video"
                  value={models.filter((model) => model.inputModalities.includes("video")).length}
                />
                <HeroStat
                  icon={Mic2}
                  label="Speech"
                  value={models.filter((model) => model.outputModalities.includes("speech")).length}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-t-[40px] bg-card text-card-foreground" id="models">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-bold tracking-[0.14em] text-positive uppercase">
              The catalogue
            </p>
            <h2 className="mt-3 font-heading text-4xl font-extrabold tracking-[-0.05em] sm:text-6xl">
              Find your next model.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              Filter the noise. Compare the technical details, then open any model for provider IDs
              and benchmarks.
            </p>
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-[268px_minmax(0,1fr)]">
            <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[24px] bg-background p-5 lg:block">
              <ModelFilters {...filterProps} idPrefix="desktop" />
            </aside>

            <section className="min-w-0">
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-heading text-2xl font-extrabold tracking-[-0.03em]">
                    All models
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {visibleModels.length} {visibleModels.length === 1 ? "result" : "results"}
                  </p>
                </div>
                <Sheet>
                  <SheetTrigger
                    render={
                      <Button className="lg:hidden" variant="outline">
                        <SlidersHorizontal /> Filters
                        {activeFilterCount > 0 && (
                          <Badge className="ml-1" variant="secondary">
                            {activeFilterCount}
                          </Badge>
                        )}
                      </Button>
                    }
                  />
                  <SheetContent side="left" className="w-[min(88vw,360px)]">
                    <SheetHeader>
                      <SheetTitle>Filter models</SheetTitle>
                      <SheetDescription>
                        Narrow the catalogue by technical requirements.
                      </SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
                      <ModelFilters {...filterProps} idPrefix="mobile" />
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Search models"
                    className="pl-11"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search models..."
                    value={query}
                  />
                </div>
                <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
                  <SelectTrigger className="w-full" aria-label="Sort models">
                    <span className="truncate">{sortLabels[sort]}</span>
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="context">Largest context</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="intelligence">Intelligence score</SelectItem>
                    <SelectItem value="coding">Coding score</SelectItem>
                    <SelectItem value="agentic">Agentic score</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1 rounded-full bg-background p-1">
                  <Button
                    aria-label="List view"
                    className={
                      view === "list"
                        ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground dark:hover:text-primary-foreground"
                        : ""
                    }
                    onClick={() => setView("list")}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <LayoutList />
                  </Button>
                  <Button
                    aria-label="Table view"
                    className={
                      view === "table"
                        ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground dark:hover:text-primary-foreground"
                        : ""
                    }
                    onClick={() => setView("table")}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <TableProperties />
                  </Button>
                </div>
              </div>

              <Tabs value={output} onValueChange={(value) => setOutput(value as OutputFilter)}>
                <div className="mb-6 w-full overflow-x-auto pb-2 whitespace-nowrap">
                  <TabsList
                    className="h-auto! min-w-max gap-1 rounded-[24px] bg-background p-1"
                    variant="default"
                  >
                    {outputTabs.map(({ value, label, icon: Icon }) => (
                      <TabsTrigger
                        className="h-10 flex-none rounded-[20px] px-4 shadow-none! hover:bg-card hover:text-foreground data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary-hover data-active:hover:text-primary-foreground dark:hover:bg-card dark:hover:text-foreground dark:data-active:bg-primary dark:data-active:text-primary-foreground dark:data-active:hover:bg-primary-hover dark:data-active:hover:text-primary-foreground"
                        key={value}
                        value={value}
                      >
                        {Icon && <Icon />}
                        {label}
                        <span className="text-xs text-current opacity-70">{counts[value]}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </Tabs>

              {visibleModels.length === 0 ? (
                <Card className="bg-background py-12 text-center">
                  <CardHeader>
                    <CardTitle>No matching models</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-muted-foreground">
                    <p>Try a broader search or remove one of the active filters.</p>
                    <Button onClick={clearFilters} variant="outline">
                      Clear filters
                    </Button>
                  </CardContent>
                </Card>
              ) : view === "list" ? (
                <div className="grid gap-4">
                  {visibleModels.map((model) => (
                    <ModelCard key={model.id} model={model} />
                  ))}
                </div>
              ) : (
                <Card className="bg-background py-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Context</TableHead>
                        <TableHead>Intelligence</TableHead>
                        <TableHead>Coding</TableHead>
                        <TableHead>Agentic</TableHead>
                        <TableHead>Design Arena</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleModels.map((model) => {
                        const providerLogoUrl = providerFaviconUrl(model.id.split("/")[0]);

                        return (
                          <TableRow key={model.id}>
                            <TableCell>
                              <div className="flex min-w-72 items-center gap-2.5">
                                {!model.isStealth && (
                                  <Avatar>
                                    {providerLogoUrl && (
                                      <AvatarImage
                                        alt={`${model.author} logo`}
                                        className="object-contain p-1"
                                        src={providerLogoUrl}
                                      />
                                    )}
                                    <AvatarFallback>{initials(model.author)}</AvatarFallback>
                                  </Avatar>
                                )}
                                <div className="min-w-0">
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <Link
                                      className="min-w-0 truncate font-medium underline-offset-4 hover:text-primary hover:underline"
                                      href={modelHref(model.id)}
                                    >
                                      {model.name}
                                    </Link>
                                    {model.isStealth && (
                                      <Badge className="shrink-0" variant="secondary">
                                        <EyeOff /> Stealth
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {model.providers.map((item) => (
                                  <ProviderBadge
                                    key={item}
                                    names={model.providerNames}
                                    provider={item}
                                  />
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {model.contextLength > 0 ? formatContext(model.contextLength) : null}
                            </TableCell>
                            <TableCell>
                              {model.intelligenceScore === null ? (
                                "—"
                              ) : (
                                <BenchmarkMetric
                                  icon={BrainCircuit}
                                  label="Artificial Analysis Intelligence Index"
                                  value={formatBenchmarkScore(model.intelligenceScore)}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {model.codingScore === null ? (
                                "—"
                              ) : (
                                <BenchmarkMetric
                                  icon={Code2}
                                  label="Artificial Analysis Coding Index"
                                  value={formatBenchmarkScore(model.codingScore)}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {model.agenticScore === null ? (
                                "—"
                              ) : (
                                <BenchmarkMetric
                                  icon={Bot}
                                  label="Artificial Analysis Agentic Index"
                                  value={formatBenchmarkScore(model.agenticScore)}
                                />
                              )}
                            </TableCell>
                            <TableCell className="min-w-80">
                              <DesignArenaPopover benchmarks={model.designArena} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </section>
          </div>
        </div>
      </section>
    </>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0">
      <Icon className="size-4 text-primary dark:text-primary-foreground" />
      <p className="mt-3 font-heading text-2xl font-extrabold tracking-[-0.04em]">{value}</p>
      <p className="mt-0.5 truncate text-xs opacity-60">{label}</p>
    </div>
  );
}

function CircleIcon() {
  return <span className="size-1.5 rounded-full bg-foreground" aria-hidden="true" />;
}
