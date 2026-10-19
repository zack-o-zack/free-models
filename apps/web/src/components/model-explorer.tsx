"use client";

import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  ChartColumn,
  Database,
  GitBranch,
  Image as ImageIcon,
  LayoutGrid,
  LayoutList,
  Mic,
  Search,
  SlidersHorizontal,
  TableProperties,
  TextIcon,
  Video,
} from "lucide-react";
import dynamic from "next/dynamic";
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
import type { EntityKind } from "@/lib/catalogue-entities";
import { getModelFilterOptions } from "@/lib/model-filter-options";
import {
  compareModels,
  defaultModelDirection,
  defaultModelSort,
  defaultSortDirection,
  type SortDirection,
  type SortOption,
} from "@/lib/model-sort";
import type { CatalogueModel } from "@/lib/model-types";
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
const outputIcons: Record<string, LucideIcon> = {
  decisions: GitBranch,
  text: TextIcon,
  image: ImageIcon,
  audio: AudioLines,
  speech: AudioLines,
  video: Video,
  transcript: Mic,
  transcription: Mic,
  embeddings: Database,
  rerank: SlidersHorizontal,
  scores: ChartColumn,
};

const sortLabels: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  context: "Largest context",
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
  const [output, setOutput] = useState<string>("all");
  const [selectedInputs, setSelectedInputs] = useState<string[]>([]);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const {
    inputs: inputOptions,
    outputs,
    contextSteps,
  } = useMemo(() => getModelFilterOptions(models), [models]);
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
    selectedPublishers.length +
    selectedProviders.length +
    (isContextFiltered ? 1 : 0);

  const totalCounts = useMemo(() => {
    return Object.fromEntries(
      [{ value: "all" }, ...outputs].map((tab) => [
        tab.value,
        tab.value === "all"
          ? models.length
          : models.filter((model) => model.outputModalities.includes(tab.value)).length,
      ]),
    ) as Record<string, number>;
  }, [models, outputs]);

  const outputTabs = useMemo(
    () => [
      { value: "all", label: "All" },
      ...[...outputs].sort(
        (left, right) =>
          totalCounts[right.value] - totalCounts[left.value] ||
          left.label.localeCompare(right.label),
      ),
    ],
    [outputs, totalCounts],
  );

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

      return (
        (normalizedQuery.length === 0 || searchable.includes(normalizedQuery)) &&
        selectedInputs.every((modality) => model.inputModalities.includes(modality)) &&
        (selectedPublishers.length === 0 || selectedPublishers.includes(model.id.split("/")[0])) &&
        (selectedProviders.length === 0 ||
          selectedProviders.some((provider) => model.providers.includes(provider))) &&
        matchesContext
      );
    });
  }, [
    contextRange,
    contextSteps,
    models,
    query,
    selectedInputs,
    selectedProviders,
    selectedPublishers,
  ]);

  const counts = useMemo(() => {
    return Object.fromEntries(
      [{ value: "all" }, ...outputs].map((tab) => [
        tab.value,
        tab.value === "all"
          ? filteredModels.length
          : filteredModels.filter((model) => model.outputModalities.includes(tab.value)).length,
      ]),
    ) as Record<string, number>;
  }, [filteredModels, outputs]);

  const visibleModels = useMemo(() => {
    return (
      output === "all"
        ? filteredModels
        : filteredModels.filter((model) => model.outputModalities.includes(output))
    ).sort((left, right) => compareModels(left, right, sort, direction));
  }, [direction, filteredModels, output, sort]);

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
    setContextRange(null);
  }

  const filterProps = {
    selectedInputs,
    selectedPublishers,
    selectedProviders,
    contextRange,
    contextSteps,
    inputOptions,
    publisherOptions,
    providerOptions,
    providerNames: liveProviderNames,
    providerDocs,
    activeFilterCount,
    onToggleInput: toggleInput,
    onTogglePublisher: togglePublisher,
    onToggleProvider: toggleProvider,
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
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold tracking-[0.14em] text-positive uppercase">
            Browse models
          </p>
          <h2 className="mt-3 font-heading text-4xl font-extrabold tracking-[-0.05em] [overflow-wrap:anywhere] sm:text-6xl">
            {collection
              ? `Models ${collection.kind === "providers" ? "on" : "by"} ${collection.name}.`
              : "Choose a model."}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Search by name or filter by what you need. Open a model to see its providers,
            benchmarks, and API details.
          </p>
        </div>

        <div
          className={`grid items-start gap-8 ${view === "list" ? "lg:grid-cols-[268px_minmax(0,1fr)]" : ""}`}
        >
          {view === "list" && (
            <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[24px] bg-background p-5 lg:block">
              {desktop && <ModelFilters {...filterProps} idPrefix="desktop" />}
            </aside>
          )}

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
                      Filter by input type, provider, and context size.
                    </SheetDescription>
                  </SheetHeader>
                  <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
                    {filtersOpen && <ModelFilters {...filterProps} idPrefix="mobile" />}
                  </ScrollArea>
                </SheetContent>
              </Sheet>
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
                          : `${sortLabels[sort]}: low to high`}
                  </span>
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

            <Tabs value={output} onValueChange={(value) => setOutput(String(value))}>
              <div className="mb-6 w-full overflow-x-auto pb-2 whitespace-nowrap">
                <TabsList
                  className="h-auto! min-w-max gap-1 rounded-[24px] bg-background p-1"
                  variant="default"
                >
                  {outputTabs.map(({ value, label }) => {
                    const Icon = value === "all" ? LayoutGrid : outputIcons[value];
                    return (
                      <TabsTrigger
                        className="h-10 flex-none rounded-[20px] px-4 text-muted-foreground shadow-none! hover:bg-card hover:text-foreground data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary-hover data-active:hover:text-primary-foreground dark:hover:bg-card dark:hover:text-foreground dark:data-active:bg-primary dark:data-active:text-primary-foreground dark:data-active:hover:bg-primary-hover dark:data-active:hover:text-primary-foreground"
                        key={value}
                        value={value}
                      >
                        {Icon && <Icon />}
                        {label}
                        <span className="text-xs text-current">{counts[value]}</span>
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
                      setOutput("all");
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
