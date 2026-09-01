"use client";

import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  Bot,
  BrainCircuit,
  Code2,
  Database,
  EyeOff,
  LayoutList,
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
import { CONTEXT_STEPS, ModelFilters, type ProviderFilterOption } from "@/components/model-filters";
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
import { providerFaviconUrl } from "@/lib/provider-logos";

type SortOption = "newest" | "oldest" | "context" | "name" | "intelligence" | "coding" | "agentic";
type ViewMode = "list" | "table";
type OutputFilter = "all" | "text" | "speech" | "embeddings" | "rerank";

const outputTabs: Array<{ value: OutputFilter; label: string; icon: LucideIcon | null }> = [
  { value: "all", label: "All", icon: null },
  { value: "text", label: "Text", icon: TextIcon },
  { value: "speech", label: "Speech", icon: AudioLines },
  { value: "embeddings", label: "Embeddings", icon: Database },
  { value: "rerank", label: "Rerank", icon: SlidersHorizontal },
];

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
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [contextRange, setContextRange] = useState<[number, number]>([0, CONTEXT_STEPS.length - 1]);

  const providerOptions = useMemo<ProviderFilterOption[]>(() => {
    const providers = new Set(models.flatMap((model) => model.providers));

    return Array.from(providers)
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ value, label: value }));
  }, [models]);

  const isContextFiltered = contextRange[0] > 0 || contextRange[1] < CONTEXT_STEPS.length - 1;
  const activeFilterCount =
    selectedInputs.length + selectedProviders.length + (isContextFiltered ? 1 : 0);

  const counts = useMemo(() => {
    return Object.fromEntries(
      outputTabs.map((tab) => [
        tab.value,
        tab.value === "all"
          ? models.length
          : models.filter((model) => model.outputModalities.includes(tab.value)).length,
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
          (output === "all" || model.outputModalities.includes(output)) &&
          selectedInputs.every((modality) => model.inputModalities.includes(modality)) &&
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
  }, [contextRange, models, output, query, selectedInputs, selectedProviders, sort]);

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

  function clearFilters() {
    setSelectedInputs([]);
    setSelectedProviders([]);
    setContextRange([0, CONTEXT_STEPS.length - 1]);
  }

  const filterProps = {
    selectedInputs,
    selectedProviders,
    contextRange,
    providerOptions,
    activeFilterCount,
    onToggleInput: toggleInput,
    onToggleProvider: toggleProvider,
    onContextRangeChange: setContextRange,
    onClear: clearFilters,
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-2xl space-y-2">
          <Badge variant="secondary">
            <CircleIcon /> Curated free catalogue
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Find a model for your next build
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            Compare free model offers across providers, modalities, context windows, and key
            capabilities.
          </p>
        </div>
        <div className="flex gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">
            <BrainCircuit /> {models.filter((model) => model.supportsReasoning).length} reasoning
          </Badge>
          <Badge variant="outline">
            <Video /> {models.filter((model) => model.inputModalities.includes("video")).length}{" "}
            video
          </Badge>
          <Badge className="hidden sm:inline-flex" variant="outline">
            <Mic2 /> {models.filter((model) => model.outputModalities.includes("speech")).length}{" "}
            speech
          </Badge>
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 lg:block">
          <ModelFilters {...filterProps} idPrefix="desktop" />
        </aside>

        <section className="min-w-0" id="models">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-semibold">Models</h2>
              <p className="text-sm text-muted-foreground">
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

          <div className="mb-4 grid gap-2 md:grid-cols-[minmax(220px,1fr)_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search models"
                className="pl-8"
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
            <div className="flex rounded-lg border p-0.5">
              <Button
                aria-label="List view"
                className={
                  view === "list"
                    ? "flex-1 bg-accent text-accent-foreground hover:bg-accent/80"
                    : "flex-1"
                }
                onClick={() => setView("list")}
                size="sm"
                variant="ghost"
              >
                <LayoutList /> <span className="md:hidden xl:inline">List</span>
              </Button>
              <Button
                aria-label="Table view"
                className={
                  view === "table"
                    ? "flex-1 bg-accent text-accent-foreground hover:bg-accent/80"
                    : "flex-1"
                }
                onClick={() => setView("table")}
                size="sm"
                variant="ghost"
              >
                <TableProperties /> <span className="md:hidden xl:inline">Table</span>
              </Button>
            </div>
          </div>

          <Tabs value={output} onValueChange={(value) => setOutput(value as OutputFilter)}>
            <div className="mb-5 w-full overflow-x-auto pb-2 whitespace-nowrap">
              <TabsList className="min-w-max" variant="line">
                {outputTabs.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger key={value} value={value}>
                    {Icon && <Icon />}
                    {label}
                    <span className="text-xs text-muted-foreground">{counts[value]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>

          {visibleModels.length === 0 ? (
            <Card className="border-dashed py-12 text-center">
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
            <div className="grid gap-3">
              {visibleModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          ) : (
            <Card className="py-0">
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
                              <ProviderBadge key={item} provider={item} />
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
  );
}

function CircleIcon() {
  return <span className="size-1.5 rounded-full bg-foreground" aria-hidden="true" />;
}
