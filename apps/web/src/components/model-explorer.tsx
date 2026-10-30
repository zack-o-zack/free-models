"use client";

import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  ChartColumn,
  Database,
  GitBranch,
  Grid,
  ImageIcon,
  LayoutList,
  Mic,
  SlidersHorizontal,
  Table as TableIcon,
  Text as TextIcon,
  Video,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { ProviderFilterOption, PublisherFilterOption } from "@/components/model-filters";
import { ProgressiveModelList } from "@/components/progressive-model-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type SortDirection,
  type SortOption,
} from "@/lib/model-sort";
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
const outputIcons: Record<string, LucideIcon> = {
  decisions: GitBranch,
  text: TextIcon,
  image: ImageIcon,
  audio: AudioLines,
  speech: AudioLines,
  video: Video,
  transcript: Mic,
  transcription: Mic,
  embedding: Database,
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
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [zdrOnly, setZdrOnly] = useState(false);
  const {
    inputs: inputOptions,
    outputs,
    contextSteps,
    regions: regionOptions,
    zdrCount,
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
    selectedRegions.length +
    (zdrOnly ? 1 : 0) +
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
        matchesRegion
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
    selectedRegions,
    zdrOnly,
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

  function toggleRegion(region: string) {
    setSelectedRegions((current) =>
      current.includes(region) ? current.filter((value) => value !== region) : [...current, region],
    );
  }

  function toggleZdr() {
    setZdrOnly((current) => !current);
  }

  function clearFilters() {
    setSelectedInputs([]);
    setSelectedPublishers([]);
    setSelectedProviders([]);
    setSelectedRegions([]);
    setZdrOnly(false);
    setContextRange(null);
  }

  const filterProps = {
    selectedInputs,
    selectedPublishers,
    selectedProviders,
    selectedRegions,
    regionOptions,
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
    onToggleInput: toggleInput,
    onTogglePublisher: togglePublisher,
    onToggleProvider: toggleProvider,
    onToggleRegion: toggleRegion,
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
                <div className="w-full sm:w-64">
                  <Input
                    className="h-10"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name, ID, provider, publisher..."
                    value={query}
                  />
                </div>
                <Select
                  value={sort}
                  onValueChange={(val) => {
                    const nextSort = val as SortOption;
                    setSort(nextSort);
                    setDirection(
                      nextSort === "newest" ||
                        nextSort === "context" ||
                        nextSort === "intelligence" ||
                        nextSort === "coding" ||
                        nextSort === "agentic"
                        ? "descending"
                        : "ascending",
                    );
                  }}
                >
                  <SelectTrigger aria-label="Sort models by" className="h-10 w-full sm:w-44">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                      <SelectItem key={option} value={option}>
                        {sortLabels[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="hidden items-center gap-1 sm:flex">
                  <Button
                    aria-label="List view"
                    className="size-10"
                    onClick={() => setView("list")}
                    size="icon"
                    variant={view === "list" ? "secondary" : "ghost"}
                  >
                    <LayoutList className="size-4" />
                  </Button>
                  <Button
                    aria-label="Table view"
                    className="size-10"
                    onClick={() => setView("table")}
                    size="icon"
                    variant={view === "table" ? "secondary" : "ghost"}
                  >
                    <TableIcon className="size-4" />
                  </Button>
                </div>
                {!desktop && (
                  <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <SheetTrigger
                      render={
                        <Button
                          aria-label="Open filter settings"
                          className="relative h-10 gap-2 font-medium"
                          size="sm"
                          variant="outline"
                        >
                          <SlidersHorizontal /> Filters
                          {activeFilterCount > 0 && (
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                              {activeFilterCount}
                            </span>
                          )}
                        </Button>
                      }
                    />
                    <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                      <SheetHeader className="pb-4">
                        <SheetTitle>Filter models</SheetTitle>
                        <SheetDescription>
                          Filter by input type, data privacy, hosting region, provider, and context
                          size.
                        </SheetDescription>
                      </SheetHeader>
                      {filtersOpen && <ModelFilters {...filterProps} idPrefix="mobile" />}
                    </SheetContent>
                  </Sheet>
                )}
              </div>
            </div>

            <Tabs
              className="mb-8"
              onValueChange={setOutput}
              value={output}
              data-active-output={output}
            >
              <TabsList className="scrollbar-none -mx-4 flex h-auto max-w-[calc(100vw-2rem)] justify-start overflow-x-auto rounded-none border-b border-border/70 bg-transparent px-4 pb-0 pt-0 sm:mx-0 sm:max-w-none sm:px-0">
                {outputTabs.map((tab) => {
                  const Icon = outputIcons[tab.value] ?? Grid;
                  return (
                    <TabsTrigger
                      className="group relative flex shrink-0 items-center gap-2 rounded-none border-b-2 border-transparent px-3.5 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground data-active:border-primary data-active:bg-transparent data-active:text-foreground data-active:shadow-none"
                      key={tab.value}
                      value={tab.value}
                    >
                      {tab.value !== "all" && (
                        <Icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                      )}
                      <span>{tab.label}</span>
                      <span className="rounded-full bg-muted/70 px-1.5 py-0.5 font-code text-[11px] font-normal text-muted-foreground group-data-active:bg-primary/10 group-data-active:text-primary">
                        {counts[tab.value] ?? 0}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>

            {visibleModels.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-border p-12 text-center">
                <SlidersHorizontal className="mx-auto size-10 text-muted-foreground/60" />
                <h3 className="mt-4 font-heading text-lg font-bold">
                  No models match your filters
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a broader search or remove one of the active filters.
                </p>
                <Button
                  className="mt-6"
                  onClick={() => {
                    setQuery("");
                    setOutput("all");
                    clearFilters();
                  }}
                  variant="outline"
                >
                  Reset search and filters
                </Button>
              </div>
            ) : view === "table" ? (
              <ModelTable
                direction={direction}
                models={visibleModels}
                onSort={(column) => {
                  if (sort === column) {
                    setDirection((prev) => (prev === "ascending" ? "descending" : "ascending"));
                  } else {
                    setSort(column);
                    setDirection("descending");
                  }
                }}
                sort={sort}
              />
            ) : (
              <ProgressiveModelList models={visibleModels} />
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
