"use client";

import {
  AudioLines,
  BookText,
  Check,
  ChevronDown,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  type LucideIcon,
  MoveHorizontal,
  Plus,
  Search,
  Type,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import { BrandImage } from "@/components/brand-image";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { ProviderBadge } from "@/components/provider-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type CompareRow,
  compareRows,
  createCompareSearch,
  DESIGN_ARENA_CATEGORIES,
  getBestIndexes,
  MAX_COMPARE_MODELS,
  parseCompareModelIds,
  parseHighlightBest,
} from "@/lib/model-compare";
import { formatBenchmarkScore, formatContext } from "@/lib/model-format";
import { modelHref } from "@/lib/model-path";
import type { ModelSummary } from "@/lib/model-types";
import { getProviderName, providerFaviconUrl, publisherFaviconUrl } from "@/lib/provider-logos";
import { cn } from "@/lib/utils";

const MODEL_COLORS = [
  "#3b82f6", // Blue
  "#f59e0b", // Amber / Orange
  "#10b981", // Emerald
  "#8b5cf6", // Purple
];

const faqs = [
  {
    id: "what-can-i-compare",
    question: "What can I compare?",
    answer:
      "You can compare available model capabilities, context windows, modalities, reasoning support, tool calling, providers, listed limits, and benchmark scores.",
  },
  {
    id: "are-these-models-free",
    question: "Are these models completely free?",
    answer:
      "The catalogue lists models available through free providers. Availability and usage limits can vary by provider. Check the provider details before relying on a model for ongoing use.",
  },
  {
    id: "what-does-context-window-mean",
    question: "What does context window mean?",
    answer:
      "The context window is the maximum amount of input and conversation history listed for a model. A larger context window does not automatically mean better output quality.",
  },
  {
    id: "what-does-best-mean",
    question: "What does “best” mean in the comparison?",
    answer:
      "The Highlight best option only identifies the highest or lowest numeric value for supported rows. It does not determine which model is best for every task.",
  },
  {
    id: "can-i-share-a-comparison",
    question: "Can I share a comparison?",
    answer:
      "Yes. Selected models are stored in the URL, so you can copy and share the comparison link.",
  },
];

function useCompareState(models: ModelSummary[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.toString();

  const requestedIds = useMemo(() => parseCompareModelIds(search), [search]);

  const selectedModels = useMemo(() => {
    const byId = new Map(models.map((model) => [model.id, model]));

    return requestedIds
      .map((id) => byId.get(id))
      .filter((model): model is ModelSummary => Boolean(model));
  }, [models, requestedIds]);

  const highlightBest = useMemo(() => parseHighlightBest(search), [search]);

  function replaceState(ids: string[], highlight = highlightBest) {
    const nextSearch = createCompareSearch(search, ids, highlight);
    router.replace(`${pathname}${nextSearch}`, { scroll: false });
  }

  return {
    requestedIds,
    selectedModels,
    highlightBest,
    setModels(ids: string[]) {
      replaceState(ids.slice(0, MAX_COMPARE_MODELS));
    },
    addModel(id: string) {
      if (requestedIds.includes(id) || requestedIds.length >= MAX_COMPARE_MODELS) {
        return;
      }

      replaceState([...requestedIds, id]);
    },
    removeModel(id: string) {
      replaceState(requestedIds.filter((current) => current !== id));
    },
    replaceModel(oldId: string, newId: string) {
      if (oldId === newId || requestedIds.includes(newId)) {
        return;
      }
      replaceState(requestedIds.map((current) => (current === oldId ? newId : current)));
    },
    setHighlightBest(value: boolean) {
      replaceState(requestedIds, value);
    },
  };
}

function ModelPicker({
  models,
  selectedIds,
  onSelect,
  title = "Add a model",
}: {
  models: ModelSummary[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  title?: string;
}) {
  const [query, setQuery] = useState("");

  const filteredModels = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return models
      .filter((model) => !selectedIds.includes(model.id))
      .filter((model) => {
        if (!normalized) return true;

        return [
          model.name,
          model.id,
          model.author,
          ...model.providers.map((provider) => getProviderName(provider, model.providerNames)),
        ].some((value) => value.toLowerCase().includes(normalized));
      })
      .slice(0, 100);
  }, [models, query, selectedIds]);

  return (
    <PopoverContent align="end" className="w-[min(420px,calc(100vw-2rem))] p-4">
      <PopoverTitle>{title}</PopoverTitle>

      <div className="relative mt-3">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search models by name or provider"
          aria-label="Search models"
          className="pl-9"
        />
      </div>

      <div className="mt-3 max-h-80 overflow-y-auto">
        {filteredModels.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No models found.</p>
        ) : (
          <ul className="space-y-1">
            {filteredModels.map((model) => (
              <li key={model.id}>
                <button
                  type="button"
                  onClick={() => onSelect(model.id)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Avatar aria-hidden="true" className="size-8 shrink-0">
                    <AvatarFallback className="text-[10px] font-bold">
                      {model.author.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{model.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {model.author} · {model.providers.length}{" "}
                      {model.providers.length === 1 ? "provider" : "providers"}
                    </span>
                  </span>

                  <Plus aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PopoverContent>
  );
}

function getCleanModelName(model: ModelSummary): string {
  if (model.author && model.name.toLowerCase().startsWith(`${model.author.toLowerCase()}: `)) {
    return model.name.slice(model.author.length + 2).trim();
  }
  return model.name.replace(/^[^:]+:\s*/, "").trim();
}

function CompareModelHeader({
  model,
  allModels,
  selectedIds,
  onRemove,
  onReplace,
}: {
  model: ModelSummary;
  allModels: ModelSummary[];
  selectedIds: string[];
  onRemove: (id: string) => void;
  onReplace: (oldId: string, newId: string) => void;
}) {
  const [changeOpen, setChangeOpen] = useState(false);
  const publisherLogo = publisherFaviconUrl(model.id.split("/")[0]);
  const cleanName = getCleanModelName(model);

  return (
    <div className="w-full rounded-2xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-2xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Avatar
              aria-hidden="true"
              className="size-6 shrink-0 rounded-md bg-card ring-1 ring-border"
            >
              {publisherLogo ? (
                <BrandImage
                  alt={`${model.author} logo`}
                  className="object-contain p-0.5"
                  src={publisherLogo}
                />
              ) : (
                <AvatarFallback className="text-[9px] font-bold">
                  {model.author.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>

            <Popover open={changeOpen} onOpenChange={setChangeOpen}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    aria-label={`Change model ${cleanName}`}
                    className="group inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm text-left font-heading text-sm font-bold leading-tight tracking-[-0.02em] transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                  />
                }
              >
                <span className="truncate" title={model.name}>
                  {cleanName}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                />
              </PopoverTrigger>
              <ModelPicker
                models={allModels}
                selectedIds={selectedIds.filter((id) => id !== model.id)}
                onSelect={(newId) => {
                  onReplace(model.id, newId);
                  setChangeOpen(false);
                }}
                title="Change model"
              />
            </Popover>
          </div>

          <p className="mt-1 pl-8 text-xs text-muted-foreground truncate" title={model.author}>
            {model.author}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Link
            href={modelHref(model.id)}
            prefetch={false}
            target="_blank"
            rel="noreferrer"
            aria-label={`View ${model.name} details (opens in new tab)`}
            title="View model details (opens in new tab)"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </Link>

          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={`Remove ${model.name} from comparison`}
            onClick={() => onRemove(model.id)}
            className="size-6 text-muted-foreground hover:text-foreground"
          >
            <X aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
        <span className="text-[11px] font-medium text-muted-foreground">Providers</span>
        {model.providers.length > 0 ? (
          <div className="flex items-center -space-x-1.5">
            {model.providers.map((provider) => {
              const label = getProviderName(provider, model.providerNames);
              const iconUrl = providerFaviconUrl(model.providerDocs[provider]);
              return (
                <Tooltip key={provider}>
                  <TooltipTrigger
                    aria-label={label}
                    className="inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Avatar className="size-5.5 bg-card ring-2 ring-card shadow-2xs">
                      {iconUrl ? (
                        <BrandImage src={iconUrl} alt="" className="object-contain p-0.5" />
                      ) : null}
                      <AvatarFallback className="text-[7px] font-bold">
                        {label.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
      </div>
    </div>
  );
}

function EmptyModelSlot({
  allModels,
  selectedIds,
  onSelect,
}: {
  allModels: ModelSummary[];
  selectedIds: string[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="group flex h-28 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-card/40 text-sm font-medium text-muted-foreground transition-all hover:border-foreground/30 hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
        }
      >
        <Plus
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform group-hover:scale-110"
        />
        <span>Select a model</span>
      </PopoverTrigger>
      <ModelPicker
        models={allModels}
        selectedIds={selectedIds}
        onSelect={(id) => {
          onSelect(id);
          setOpen(false);
        }}
        title="Select a model"
      />
    </Popover>
  );
}

function CompareEmptyState({
  allModels,
  onSelectModel,
  onCompareModels,
}: {
  allModels: ModelSummary[];
  onSelectModel: (id: string) => void;
  onCompareModels: (ids: string[]) => void;
}) {
  const topCodingModels = useMemo(() => {
    return [...allModels]
      .filter((m) => typeof m.codingScore === "number" && m.codingScore > 0)
      .sort((a, b) => (b.codingScore ?? 0) - (a.codingScore ?? 0))
      .slice(0, 4);
  }, [allModels]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <EmptyModelSlot allModels={allModels} selectedIds={[]} onSelect={onSelectModel} />
        <EmptyModelSlot allModels={allModels} selectedIds={[]} onSelect={onSelectModel} />
      </div>

      {topCodingModels.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => onCompareModels(topCodingModels.map((m) => m.id))}
            className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-foreground/30 hover:bg-muted/30 hover:shadow-xs focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
          >
            <div>
              <div className="flex items-center -space-x-1.5">
                {topCodingModels.map((model) => {
                  const publisherLogo = publisherFaviconUrl(model.id.split("/")[0]);
                  return (
                    <Avatar
                      key={model.id}
                      className="size-6 bg-card ring-2 ring-card shadow-xs"
                      aria-hidden="true"
                    >
                      {publisherLogo ? (
                        <BrandImage src={publisherLogo} alt="" className="object-contain p-0.5" />
                      ) : (
                        <AvatarFallback className="text-[8px] font-bold">
                          {model.author.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  );
                })}
              </div>

              <h2 className="mt-3 font-heading text-sm font-bold text-foreground sm:text-base">
                Best for code
              </h2>
              <p className="mt-1 text-xs leading-normal text-muted-foreground">
                Top scores on the Artificial Analysis Coding Index.
              </p>
            </div>

            <p className="mt-4 truncate text-xs text-muted-foreground/80">
              {topCodingModels.map((m) => m.name).join(" · ")}
            </p>
          </button>
        </div>
      )}
    </div>
  );
}

function OneModelNotice({ onAddModel }: { onAddModel: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-secondary bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
      <span>Add one more model to start comparing side by side.</span>
      <Button type="button" size="sm" onClick={onAddModel} className="gap-1.5">
        <Plus aria-hidden="true" className="size-3.5" />
        Add model
      </Button>
    </div>
  );
}

function NotListed() {
  return (
    <span className="font-normal text-muted-foreground">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Not listed</span>
    </span>
  );
}

const modalityIcons: Record<string, LucideIcon> = {
  text: Type,
  image: ImageIcon,
  audio: AudioLines,
  video: Video,
  file: FileText,
  pdf: FileText,
  document: BookText,
  embedding: Database,
  embeddings: Database,
};

function formatModalityList(values: string[]): React.ReactNode {
  if (!values || values.length === 0) return <NotListed />;

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => {
        const Icon = modalityIcons[value.toLowerCase()];
        return (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
          >
            {Icon && <Icon className="size-3.5" aria-hidden="true" />}
            <span className="capitalize">{value.replaceAll("_", " ")}</span>
          </span>
        );
      })}
    </div>
  );
}

function formatLimitList(model: ModelSummary): React.ReactNode {
  const allLimits = model.connections.flatMap((connection) =>
    connection.limits.map((term) => ({
      provider: connection.provider,
      term,
    })),
  );

  if (allLimits.length === 0) return <NotListed />;

  return (
    <ul className="space-y-2">
      {allLimits.slice(0, 5).map(({ provider, term }) => (
        <li key={`${provider}-${term}`} className="text-xs leading-5">
          <span className="font-semibold">{getProviderName(provider, model.providerNames)}:</span>{" "}
          {term}
        </li>
      ))}
      {allLimits.length > 5 && (
        <li className="text-xs text-muted-foreground">
          +{allLimits.length - 5} more listed limits
        </li>
      )}
    </ul>
  );
}

function CompareValue({
  model,
  row,
  value,
}: {
  model: ModelSummary;
  row: CompareRow;
  value: unknown;
}) {
  switch (row.kind) {
    case "number": {
      const number = typeof value === "number" ? value : 0;
      return number > 0 ? (
        <span className="font-medium tabular-nums">
          {formatContext(number)}
          <span className="sr-only"> tokens</span>
        </span>
      ) : (
        <NotListed />
      );
    }

    case "score":
      return typeof value === "number" ? (
        <span className="font-medium tabular-nums">{formatBenchmarkScore(value)}</span>
      ) : (
        <NotListed />
      );

    case "boolean":
      return typeof value === "boolean" ? (
        value ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-positive">
            <Check className="size-4 stroke-[2.5]" aria-hidden="true" />
            <span>Yes</span>
          </span>
        ) : (
          <span className="font-normal text-muted-foreground">No</span>
        )
      ) : (
        <NotListed />
      );

    case "modalities":
      return Array.isArray(value) ? formatModalityList(value) : <NotListed />;

    case "provider-count": {
      const count = typeof value === "number" ? value : 0;
      return count > 0 ? (
        <span className="font-medium">
          {count} {count === 1 ? "provider" : "providers"}
        </span>
      ) : (
        <NotListed />
      );
    }

    case "providers":
      return model.providers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {model.providers.map((provider) => (
            <ProviderBadge
              key={provider}
              plain
              provider={provider}
              names={model.providerNames}
              docs={model.providerDocs[provider]}
            />
          ))}
        </div>
      ) : (
        <NotListed />
      );

    case "free-limit":
      return formatLimitList(model);

    case "text":
      return typeof value === "string" && value.length > 0 ? value : <NotListed />;

    default:
      return <NotListed />;
  }
}

function CompareTableRow({
  row,
  models,
  highlightBest,
}: {
  row: CompareRow;
  models: ModelSummary[];
  highlightBest: boolean;
}) {
  const bestIndexes = highlightBest ? getBestIndexes(models, row) : new Set<number>();

  return (
    <tr className="group bg-card transition-colors hover:bg-muted/60">
      <th
        scope="row"
        className="sticky left-0 z-10 border-b border-border/60 bg-card px-4 py-4 text-left align-middle font-medium transition-colors group-hover:bg-muted/60 sm:px-5"
      >
        <span className="block">{row.label}</span>
        {row.description && (
          <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
            {row.description}
          </span>
        )}
      </th>

      {models.map((model, index) => {
        const value = row.getValue(model);
        const isBest = bestIndexes.has(index);

        return (
          <td
            key={model.id}
            className={cn(
              "border-b border-border/60 px-4 py-4 align-middle transition-colors sm:px-5",
              isBest && "bg-positive/10 font-medium text-foreground",
            )}
          >
            {isBest && <span className="sr-only">Best listed value. </span>}

            <CompareValue model={model} row={row} value={value} />
          </td>
        );
      })}
    </tr>
  );
}

function DesignArenaSectionRows({
  models,
  highlightBest,
  arenaView,
  onToggleView,
}: {
  models: ModelSummary[];
  highlightBest: boolean;
  arenaView: "table" | "graph";
  onToggleView: (view: "table" | "graph") => void;
}) {
  const modelsWithBenchmarks = useMemo(
    () => models.filter((m) => m.designArena && m.designArena.length > 0),
    [models],
  );

  const maxElos = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const cat of DESIGN_ARENA_CATEGORIES) {
      const elos = models.map((m) => {
        const entry = m.designArena?.find(
          (b) =>
            b.category.toLowerCase().replace(/[-_ ]/g, "") ===
            cat.key.toLowerCase().replace(/[-_ ]/g, ""),
        );
        return entry && entry.elo !== null && Number.isFinite(entry.elo) ? entry.elo : null;
      });
      const valid = elos.filter((v): v is number => v !== null);
      map[cat.key] = valid.length > 0 ? Math.max(...valid) : null;
    }
    return map;
  }, [models]);

  const radarData = useMemo(() => {
    return DESIGN_ARENA_CATEGORIES.map(({ key, label }) => {
      const row: Record<string, string | number> = { category: label };
      modelsWithBenchmarks.forEach((model) => {
        const entry = model.designArena?.find(
          (b) =>
            b.category.toLowerCase().replace(/[-_ ]/g, "") ===
            key.toLowerCase().replace(/[-_ ]/g, ""),
        );
        if (entry && entry.winRate !== null && Number.isFinite(entry.winRate)) {
          const normalized = entry.winRate > 1 ? entry.winRate / 100 : entry.winRate;
          row[model.id] = Number(normalized.toFixed(2));
        } else {
          row[model.id] = 0;
        }
      });
      return row;
    });
  }, [modelsWithBenchmarks]);

  return (
    <>
      <tr>
        <th
          scope="colgroup"
          colSpan={models.length + 1}
          className="border-b bg-card px-4 py-3 text-left sm:px-5"
        >
          <div className="flex items-center gap-3">
            <span className="font-heading text-base font-extrabold tracking-[-0.025em] text-foreground sm:text-lg">
              Design Arena
            </span>
            <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5 text-xs">
              <button
                type="button"
                aria-pressed={arenaView === "table"}
                onClick={() => onToggleView("table")}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors",
                  arenaView === "table"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Table
              </button>
              <button
                type="button"
                aria-pressed={arenaView === "graph"}
                onClick={() => onToggleView("graph")}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors",
                  arenaView === "graph"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Graph
              </button>
            </div>
          </div>
        </th>
      </tr>

      {arenaView === "table" &&
        DESIGN_ARENA_CATEGORIES.map((cat, catIndex) => (
          <tr key={cat.key} className="group bg-card transition-colors hover:bg-muted/60">
            <th
              scope="row"
              className="sticky left-0 z-10 border-b border-border/60 bg-card px-4 py-3.5 text-left align-middle font-medium transition-colors group-hover:bg-muted/60 sm:px-5"
            >
              <span className="text-sm text-foreground">{cat.label}</span>
            </th>

            {models.map((model) => {
              const hasBenchmarks = model.designArena && model.designArena.length > 0;

              if (!hasBenchmarks) {
                if (catIndex === 0) {
                  return (
                    <td
                      key={model.id}
                      rowSpan={DESIGN_ARENA_CATEGORIES.length}
                      className="border-b border-border/60 bg-card/20 p-4 align-middle text-center sm:px-5"
                    >
                      <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-foreground/[0.02] p-6 text-center">
                        <div
                          className="mb-1 flex items-end justify-center gap-1 text-muted-foreground/40"
                          aria-hidden="true"
                        >
                          <span className="h-4 w-1.5 rounded-xs bg-muted-foreground/30" />
                          <span className="h-7 w-1.5 rounded-xs bg-muted-foreground/30" />
                          <span className="h-5 w-1.5 rounded-xs bg-muted-foreground/30" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          No benchmarks available
                        </p>
                      </div>
                    </td>
                  );
                }
                return null;
              }

              const entry = model.designArena.find(
                (b) =>
                  b.category.toLowerCase().replace(/[-_ ]/g, "") ===
                  cat.key.toLowerCase().replace(/[-_ ]/g, ""),
              );

              const isBest =
                highlightBest &&
                entry &&
                entry.elo !== null &&
                maxElos[cat.key] !== null &&
                entry.elo === maxElos[cat.key];

              return (
                <td
                  key={model.id}
                  className={cn(
                    "border-b border-border/60 px-4 py-3.5 align-middle transition-colors sm:px-5",
                    isBest && "bg-positive/10 font-medium text-foreground",
                  )}
                >
                  {isBest && <span className="sr-only">Best listed value. </span>}
                  {entry ? (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {entry.elo !== null ? Math.round(entry.elo) : "—"}
                      </span>
                      {entry.winRate !== null && (
                        <span className="text-xs font-semibold tabular-nums text-positive">
                          {Math.round(entry.winRate)}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="font-normal text-muted-foreground">—</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}

      {arenaView === "graph" && (
        <tr>
          <td
            colSpan={models.length + 1}
            className="border-b border-border/60 bg-card/30 p-4 sm:p-8"
          >
            {modelsWithBenchmarks.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-foreground/[0.02] p-8 text-center text-muted-foreground">
                <div
                  className="mb-1 flex items-end justify-center gap-1 text-muted-foreground/40"
                  aria-hidden="true"
                >
                  <span className="h-4 w-1.5 rounded-xs bg-muted-foreground/30" />
                  <span className="h-7 w-1.5 rounded-xs bg-muted-foreground/30" />
                  <span className="h-5 w-1.5 rounded-xs bg-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-foreground">No benchmarks available</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="h-[380px] w-full max-w-[680px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="68%">
                      <PolarGrid stroke="var(--border)" strokeOpacity={0.7} />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 500 }}
                      />
                      <PolarRadiusAxis
                        domain={[0, 1]}
                        ticks={[0.0, 0.3, 0.5, 0.8, 1.0]}
                        axisLine={false}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      />
                      {modelsWithBenchmarks.map((model, idx) => {
                        const color = MODEL_COLORS[idx % MODEL_COLORS.length];
                        return (
                          <Radar
                            key={model.id}
                            name={model.name}
                            dataKey={model.id}
                            stroke={color}
                            strokeWidth={2}
                            fill={color}
                            fillOpacity={0.15}
                          />
                        );
                      })}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-medium">
                  {modelsWithBenchmarks.map((model, idx) => {
                    const color = MODEL_COLORS[idx % MODEL_COLORS.length];
                    return (
                      <div key={model.id} className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        <span className="text-foreground">{model.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function CompareTable({
  models,
  allModels,
  selectedIds,
  highlightBest,
  onRemove,
  onReplace,
}: {
  models: ModelSummary[];
  allModels: ModelSummary[];
  selectedIds: string[];
  highlightBest: boolean;
  onRemove: (id: string) => void;
  onReplace: (oldId: string, newId: string) => void;
}) {
  const sections = [
    ["overview", "Overview"],
    ["features", "Features"],
    ["access", "Free access"],
    ["benchmarks", "Benchmarks"],
  ] as const;

  const [arenaView, setArenaView] = useState<"table" | "graph">("table");
  const colMinWidth = 280;
  const metricColWidth = 180;
  const minTableWidth = Math.max(760, metricColWidth + models.length * colMinWidth);

  return (
    <div className="overflow-hidden rounded-[24px] border border-border">
      <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-3 text-xs text-muted-foreground sm:px-5">
        <MoveHorizontal aria-hidden="true" className="size-3.5" />
        <span>Scroll horizontally to compare all models</span>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:inline-block">
          Scores: Artificial Analysis & Design Arena
        </span>
      </div>

      <section
        aria-label="Selected model comparison"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The scroll region needs keyboard access to off-screen columns.
        tabIndex={0}
        className="relative isolate overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <table
          style={{ minWidth: `${minTableWidth}px` }}
          className="w-full table-fixed border-separate border-spacing-0 text-sm"
        >
          <caption className="sr-only">Side-by-side comparison of selected free AI models.</caption>

          <colgroup>
            <col style={{ width: `${metricColWidth}px` }} className="w-[180px]" />
            {models.map((model) => (
              <col key={model.id} style={{ minWidth: `${colMinWidth}px` }} />
            ))}
          </colgroup>

          <thead className="sticky top-0 z-20 bg-muted">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-30 border-b bg-muted px-4 py-3 text-left text-xs font-semibold text-muted-foreground sm:px-5"
              >
                Metric
              </th>

              {models.map((model) => (
                <th
                  scope="col"
                  key={model.id}
                  className="border-b px-2 py-2.5 text-left align-top sm:px-3"
                >
                  <CompareModelHeader
                    model={model}
                    allModels={allModels}
                    selectedIds={selectedIds}
                    onRemove={onRemove}
                    onReplace={onReplace}
                  />
                </th>
              ))}
            </tr>
          </thead>

          {sections.map(([section, title]) => {
            const rows = compareRows.filter((row) => row.section === section);

            return (
              <tbody key={section}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={models.length + 1}
                    className="border-b bg-background px-4 py-4 text-left font-heading text-lg font-extrabold tracking-[-0.025em] sm:px-5"
                  >
                    {title}
                  </th>
                </tr>

                {rows.map((row) => (
                  <CompareTableRow
                    key={row.id}
                    row={row}
                    models={models}
                    highlightBest={highlightBest}
                  />
                ))}

                {section === "benchmarks" && (
                  <DesignArenaSectionRows
                    models={models}
                    highlightBest={highlightBest}
                    arenaView={arenaView}
                    onToggleView={setArenaView}
                  />
                )}
              </tbody>
            );
          })}
        </table>
      </section>
    </div>
  );
}

export function ModelCompare({ models }: { models: ModelSummary[] }) {
  const {
    requestedIds,
    selectedModels,
    highlightBest,
    setModels,
    addModel,
    removeModel,
    replaceModel,
    setHighlightBest,
  } = useCompareState(models);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const unknownIds = requestedIds.filter((id) => !models.some((model) => model.id === id));

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const comparisonTitle =
    selectedModels.length >= 2
      ? selectedModels.map((m) => m.name).join(" vs ")
      : "Compare free AI models";

  const comparisonDescription =
    selectedModels.length >= 2
      ? `Compare ${selectedModels
          .map((m) => `${m.name} from ${m.author}`)
          .join(
            ", ",
          )} on key metrics including benchmarks, context length, and other model features.`
      : "Compare free AI models by context window, capabilities, reasoning, tool calling, providers, usage limits, and benchmark scores.";

  const breadcrumbItems = [
    { name: "Home", href: "/" },
    { name: "Compare", href: "/compare" },
    ...(selectedModels.length >= 2 ? [{ name: comparisonTitle, href: "" }] : []),
  ];

  return (
    <div className="container py-8 sm:py-10 max-w-[1400px]">
      <PageBreadcrumbs items={breadcrumbItems} className="mb-6" />

      <header className="max-w-3xl">
        <h1 className="font-heading text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl">
          {comparisonTitle}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          {comparisonDescription}
        </p>
      </header>

      {unknownIds.length > 0 && (
        <p className="mt-6 rounded-xl border border-secondary bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
          Some requested models could not be found: {unknownIds.join(", ")}
        </p>
      )}

      {/* Toolbar Controls */}
      {selectedModels.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Switch
              id="compare-highlight-best"
              checked={highlightBest}
              onCheckedChange={setHighlightBest}
            />
            <label
              htmlFor="compare-highlight-best"
              className="cursor-pointer select-none text-sm font-medium"
            >
              Highlight best
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={copyLink} className="gap-2">
              {copied ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Copy aria-hidden="true" className="size-4" />
              )}
              <span>{copied ? "Copied" : "Share comparison"}</span>
            </Button>

            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    className="gap-2"
                    disabled={selectedModels.length >= MAX_COMPARE_MODELS}
                  />
                }
              >
                <Plus aria-hidden="true" className="size-4" />
                <span>Add model</span>
              </PopoverTrigger>
              <ModelPicker
                models={models}
                selectedIds={requestedIds}
                onSelect={(id) => {
                  addModel(id);
                  setPickerOpen(false);
                }}
                title="Add model to comparison"
              />
            </Popover>
          </div>
        </div>
      )}

      <div className={cn(selectedModels.length > 0 ? "mt-6" : "mt-8")}>
        {selectedModels.length === 0 ? (
          <CompareEmptyState
            allModels={models}
            onSelectModel={addModel}
            onCompareModels={setModels}
          />
        ) : selectedModels.length === 1 ? (
          <div className="space-y-6">
            <OneModelNotice onAddModel={() => setPickerOpen(true)} />
            <CompareTable
              models={selectedModels}
              allModels={models}
              selectedIds={requestedIds}
              highlightBest={highlightBest}
              onRemove={removeModel}
              onReplace={replaceModel}
            />
          </div>
        ) : (
          <CompareTable
            models={selectedModels}
            allModels={models}
            selectedIds={requestedIds}
            highlightBest={highlightBest}
            onRemove={removeModel}
            onReplace={replaceModel}
          />
        )}
      </div>

      {/* Frequently Asked Questions */}
      <section aria-labelledby="compare-faq-heading" className="mt-16 max-w-3xl">
        <h2
          id="compare-faq-heading"
          className="font-heading text-2xl font-extrabold tracking-[-0.035em]"
        >
          Frequently asked questions
        </h2>

        <Accordion
          keepMounted
          className="mt-6 rounded-[24px] border border-border bg-card px-5 sm:px-8"
        >
          {faqs.map(({ id, question, answer }) => (
            <AccordionItem key={id} value={id}>
              <AccordionTrigger className="py-5 font-heading text-base font-bold leading-snug hover:no-underline sm:text-lg">
                {question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-[15px] leading-7 text-muted-foreground sm:text-base">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
