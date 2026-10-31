"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  AudioLines,
  Database,
  GitBranch,
  History,
  Image as ImageIcon,
  LayoutGrid,
  LayoutList,
  ListFilter,
  MessageSquareText,
  Mic,
  Radio,
  Search,
  Shapes,
  ShieldCheck,
  SlidersHorizontal,
  TableProperties,
  Video,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { ProviderFilterOption, PublisherFilterOption } from "@/components/model-filters";
import { ProgressiveModelList } from "@/components/progressive-model-list";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EntityKind } from "@/lib/catalogue-entities";
import {
  type BenchmarkRange,
  getActiveBenchmarkFilters,
  getBenchmarkFilterOptions,
  matchesBenchmarkFilters,
} from "@/lib/model-benchmark-filters";
import { getModelFilterOptions } from "@/lib/model-filter-options";
import {
  compareModels,
  defaultModelDirection,
  defaultModelSort,
  defaultSortDirection,
  type SortDirection,
  type SortOption,
} from "@/lib/model-sort";
import { getModelTypeTabs, modelTypeTab, OTHER_MODEL_TYPE } from "@/lib/model-type-tabs";
import type { CatalogueModel } from "@/lib/model-types";
import { getModelCountries, modelHasZdr } from "@/lib/provider-compliance";
import { getProviderName } from "@/lib/provider-logos";

const ModelFilters = dynamic(() =>
  import("@/components/model-filters").then((module) => module.ModelFilters),
);
const desktopQuery = "(min-width: 1024px)";
function subscribeDesktop(callback: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverDesktopSnapshot = () => false;

const ModelTable = dynamic(() =>
  import("@/components/model-table").then((module) => module.ModelTable),
);

type ViewMode = "list" | "table";
const modelTypeIcons: Record<string, LucideIcon> = {
  chat: MessageSquareText,
  decision: GitBranch,
  embedding: Database,
  image: ImageIcon,
  moderation: ShieldCheck,
  realtime: Radio,
  reranking: ListFilter,
  speech: AudioLines,
  transcription: Mic,
  video: Video,
  [OTHER_MODEL_TYPE]: Shapes,
};

const sortLabels: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  context: "Largest context",
  price: "Lowest list price",
  name: "Name",
  intelligence: "Intelligence score",
  coding: "Coding score",
  agentic: "Agentic score",
};

export function ModelExplorer({
  models,
  collection,
}: {
  models: CatalogueModel[];
  collection?: { name: string; kind: EntityKind };
}) {
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, serverDesktopSnapshot);
  const [sort, setSort] = useState<SortOption>(defaultModelSort);
  const [direction, setDirection] = useState<SortDirection>(defaultModelDirection);
  const [view, setView] = useState<ViewMode>("list");
  const [modelType, setModelType] = useState<string>("all");
  const [selectedInputs, setSelectedInputs] = useState<string[]>([]);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [benchmarkRanges, setBenchmarkRanges] = useState<Partial<Record<string, BenchmarkRange>>>(
    {},
  );
  const [zdrOnly, setZdrOnly] = useState(false);
  const {
    inputs: inputOptions,
    contextSteps,
    regions: regionOptions,
    topics: topicOptions,
    zdrCount,
  } = useMemo(() => getModelFilterOptions(models), [models]);
  const benchmarkOptions = useMemo(() => getBenchmarkFilterOptions(models), [models]);
  const activeBenchmarks = useMemo(
    () =>
      getActiveBenchmarkFilters(
        [...benchmarkOptions.artificialAnalysis, ...benchmarkOptions.designArena],
        benchmarkRanges,
      ),
    [benchmarkOptions, benchmarkRanges],
  );
  const [selectedContextRange, setContextRange] = useState<[number, number] | null>(null);
  const contextRange = useMemo<[number, number]>(
    () =>
      selectedContextRange
        ? [
            Math.min(selectedContextRange[0], contextSteps.length - 1),
            Math.min(selectedContextRange[1], contextSteps.length - 1),
          ]
        : [0, contextSteps.length - 1],
    [selectedContextRange, contextSteps.length],
  );

  const providerDocs = useMemo(
    () => Object.assign({}, ...models.map((model) => model.providerDocs)),
    [models],
  );
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

  const isContextFiltered = contextRange[0] > 0 || contextRange[1] < contextSteps.length - 1;
  const activeFilterCount =
    selectedInputs.length +
    selectedTopics.length +
    activeBenchmarks.length +
    selectedPublishers.length +
    selectedProviders.length +
    selectedRegions.length +
    (zdrOnly ? 1 : 0) +
    (isContextFiltered ? 1 : 0);

  const typeTabs = useMemo(() => getModelTypeTabs(models), [models]);

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const minContext = contextSteps[contextRange[0]];
    const maxContext = contextSteps[contextRange[1]];
    const isFiltered = contextRange[0] > 0 || contextRange[1] < contextSteps.length - 1;

    return models.filter((model) => {
      const searchable = [model.name, model.id, model.author, model.description, ...model.providers]
        .join(" ")
        .toLowerCase();

      const matchesContext =
        !isFiltered ||
        (model.contextLength >= minContext &&
          (contextRange[1] === contextSteps.length - 1 || model.contextLength <= maxContext));

      const matchesZdr = !zdrOnly || modelHasZdr(model, selectedProviders);

      const matchesRegion =
        selectedRegions.length === 0 ||
        getModelCountries(model, selectedProviders).some((country) =>
          selectedRegions.includes(country),
        );

      return (
        (normalizedQuery.length === 0 || searchable.includes(normalizedQuery)) &&
        selectedInputs.every((modality) => model.inputModalities.includes(modality)) &&
        (selectedPublishers.length === 0 || selectedPublishers.includes(model.id.split("/")[0])) &&
        (selectedProviders.length === 0 ||
          selectedProviders.some((provider) => model.providers.includes(provider))) &&
        matchesContext &&
        matchesZdr &&
        matchesRegion &&
        (selectedTopics.length === 0 ||
          selectedTopics.some((topic) => model.topics.includes(topic))) &&
        matchesBenchmarkFilters(model, activeBenchmarks)
      );
    });
  }, [
    activeBenchmarks,
    contextRange,
    contextSteps,
    models,
    query,
    selectedInputs,
    selectedProviders,
    selectedPublishers,
    selectedRegions,
    selectedTopics,
    zdrOnly,
  ]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: filteredModels.length };
    for (const model of filteredModels) {
      const tab = modelTypeTab(model, typeTabs);
      result[tab] = (result[tab] ?? 0) + 1;
    }
    return result;
  }, [filteredModels, typeTabs]);

  const visibleModels = useMemo(() => {
    return (
      modelType === "all"
        ? filteredModels
        : filteredModels.filter((model) => modelTypeTab(model, typeTabs) === modelType)
    ).sort((left, right) => compareModels(left, right, sort, direction));
  }, [direction, filteredModels, modelType, sort, typeTabs]);

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

  function toggleRegion(region: string) {
    setSelectedRegions((current) =>
      current.includes(region) ? current.filter((value) => value !== region) : [...current, region],
    );
  }

  function toggleTopic(topic: string) {
    setSelectedTopics((current) =>
      current.includes(topic) ? current.filter((value) => value !== topic) : [...current, topic],
    );
  }

  function setBenchmarkRange(id: string, range: BenchmarkRange) {
    setBenchmarkRanges((current) => ({ ...current, [id]: range }));
  }

  function toggleZdr() {
    setZdrOnly((current) => !current);
  }

  function clearFilters() {
    setSelectedInputs([]);
    setSelectedPublishers([]);
    setSelectedProviders([]);
    setSelectedRegions([]);
    setSelectedTopics([]);
    setBenchmarkRanges({});
    setZdrOnly(false);
    setContextRange(null);
  }

  const filterProps = {
    artificialAnalysisOptions: benchmarkOptions.artificialAnalysis,
    designArenaOptions: benchmarkOptions.designArena,
    benchmarkRanges,
    selectedInputs,
    selectedPublishers,
    selectedProviders,
    selectedRegions,
    selectedTopics,
    regionOptions,
    topicOptions,
    zdrOnly,
    zdrCount,
    contextRange,
    contextSteps,
    inputOptions,
    publisherOptions,
    providerOptions,
    providerNames: liveProviderNames,
    providerDocs,
    activeFilterCount,
    onBenchmarkRangeChange: setBenchmarkRange,
    onToggleInput: toggleInput,
    onTogglePublisher: togglePublisher,
    onToggleProvider: toggleProvider,
    onToggleRegion: toggleRegion,
    onToggleTopic: toggleTopic,
    onToggleZdr: toggleZdr,
    onContextRangeChange: setContextRange,
    onClear: clearFilters,
  };

  return (
    <section
      className="rounded-t-[40px] bg-card text-card-foreground"
      id="models"
      data-catalogue-total={models.length}
    >
      <div className="container py-14 sm:py-20">
        <div
          className={`grid items-start gap-8 ${view === "list" ? "lg:grid-cols-[268px_minmax(0,1fr)]" : ""}`}
        >
          {view === "list" && (
            <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[24px] bg-background p-5 lg:block">
              {desktop && <ModelFilters {...filterProps} idPrefix="desktop" />}
            </aside>
          )}

          <section className="min-w-0">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-2xl font-extrabold tracking-[-0.03em]">
                  {collection ? `${collection.name} models` : "All models"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {visibleModels.length} {visibleModels.length === 1 ? "result" : "results"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Button
                  render={<Link href="/compare" />}
                  nativeButton={false}
                  variant="outline"
                  className="gap-2"
                >
                  <ArrowLeftRight aria-hidden="true" className="size-4" />
                  <span>Compare</span>
                </Button>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        render={<Link href="/changelog" />}
                        nativeButton={false}
                        variant="outline"
                        size="icon"
                        aria-label="Changelog"
                      />
                    }
                  >
                    <History aria-hidden="true" className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>Changelog</TooltipContent>
                </Tooltip>
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger
                    render={
                      <Button className={view === "list" ? "lg:hidden" : ""} variant="outline">
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
                        Filter by topic, input type, data privacy, hosting region, provider, and
                        context size.
                      </SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
                      {filtersOpen && <ModelFilters {...filterProps} idPrefix="mobile" />}
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3 md:grid-cols-[minmax(220px,1fr)_190px_auto]">
              <div className="relative col-span-2 md:col-span-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search models"
                  className="pl-11"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search models..."
                  value={query}
                />
              </div>
              <Select
                value={sort}
                onValueChange={(value) => {
                  const next = value as SortOption;
                  setSort(next);
                  setDirection(defaultSortDirection(next));
                }}
              >
                <SelectTrigger className="w-full" aria-label="Sort models">
                  <span className="truncate">
                    {direction === defaultSortDirection(sort)
                      ? sortLabels[sort]
                      : sort === "name"
                        ? "Name: Z–A"
                        : sort === "context"
                          ? "Smallest context"
                          : sort === "price"
                            ? "Highest list price"
                            : `${sortLabels[sort]}: low to high`}
                  </span>
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="context">Largest context</SelectItem>
                  <SelectItem value="price">Lowest list price</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="intelligence">Intelligence score</SelectItem>
                  <SelectItem value="coding">Coding score</SelectItem>
                  <SelectItem value="agentic">Agentic score</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 rounded-full bg-background p-1">
                <Button
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  className={
                    view === "list"
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground dark:hover:text-primary-foreground"
                      : ""
                  }
                  onClick={() => setView("list")}
                  size="icon"
                  variant="ghost"
                >
                  <LayoutList />
                </Button>
                <Button
                  aria-label="Table view"
                  aria-pressed={view === "table"}
                  className={
                    view === "table"
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground dark:hover:text-primary-foreground"
                      : ""
                  }
                  onClick={() => setView("table")}
                  size="icon"
                  variant="ghost"
                >
                  <TableProperties />
                </Button>
              </div>
            </div>

            <Tabs value={modelType} onValueChange={(value) => setModelType(String(value))}>
              <div className="mb-6 w-full overflow-x-auto pb-2 whitespace-nowrap">
                <TabsList
                  className="h-auto! min-w-max gap-1 rounded-[24px] bg-background p-1"
                  variant="default"
                >
                  {[{ value: "all", label: "All" }, ...typeTabs].map(({ value, label }) => {
                    const Icon = value === "all" ? LayoutGrid : modelTypeIcons[value];
                    return (
                      <TabsTrigger
                        className="h-10 flex-none rounded-[20px] px-4 text-muted-foreground shadow-none! hover:bg-card hover:text-foreground data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary-hover data-active:hover:text-primary-foreground dark:hover:bg-card dark:hover:text-foreground dark:data-active:bg-primary dark:data-active:text-primary-foreground dark:data-active:hover:bg-primary-hover dark:data-active:hover:text-primary-foreground"
                        key={value}
                        value={value}
                      >
                        {Icon && <Icon />}
                        {label}
                        <span className="text-xs text-current">{counts[value] ?? 0}</span>
                      </TabsTrigger>
                    );
                  })}
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
                  <Button
                    onClick={() => {
                      clearFilters();
                      setQuery("");
                      setModelType("all");
                    }}
                    variant="outline"
                  >
                    Reset search and filters
                  </Button>
                </CardContent>
              </Card>
            ) : view === "list" ? (
              <ProgressiveModelList models={visibleModels} />
            ) : (
              <ModelTable
                models={visibleModels}
                sort={sort}
                direction={direction}
                onSort={(next) => {
                  setDirection(
                    next === sort
                      ? direction === "ascending"
                        ? "descending"
                        : "ascending"
                      : defaultSortDirection(next),
                  );
                  setSort(next);
                }}
              />
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
