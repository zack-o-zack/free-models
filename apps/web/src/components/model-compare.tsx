"use client";

import {
  AudioLines,
  BookText,
  Check,
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

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { ProviderBadge } from "@/components/provider-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  type CompareRow,
  compareRows,
  createCompareSearch,
  getBestIndexes,
  MAX_COMPARE_MODELS,
  parseCompareModelIds,
  parseHighlightBest,
} from "@/lib/model-compare";
import { formatBenchmarkScore, formatContext } from "@/lib/model-format";
import { modelHref } from "@/lib/model-path";
import type { ModelSummary } from "@/lib/model-types";
import { getProviderName } from "@/lib/provider-logos";
import { cn } from "@/lib/utils";

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
    addModel(id: string) {
      if (requestedIds.includes(id) || requestedIds.length >= MAX_COMPARE_MODELS) {
        return;
      }

      replaceState([...requestedIds, id]);
    },
    removeModel(id: string) {
      replaceState(requestedIds.filter((current) => current !== id));
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
}: {
  models: ModelSummary[];
  selectedIds: string[];
  onSelect: (id: string) => void;
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
      <PopoverTitle>Add a model</PopoverTitle>

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

function CompareModelHeader({
  model,
  onRemove,
}: {
  model: ModelSummary;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="min-w-[230px] rounded-[20px] bg-card p-4 sm:min-w-0 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Avatar aria-hidden="true" className="size-7 shrink-0">
              <AvatarFallback className="text-[10px] font-bold">
                {model.author.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Link
              href={modelHref(model.id)}
              prefetch={false}
              className="block truncate rounded-sm font-heading text-base font-extrabold leading-tight tracking-[-0.025em] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {model.name}
            </Link>
          </div>

          <p className="mt-1.5 text-xs text-muted-foreground">{model.author}</p>
        </div>

        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={`Remove ${model.name} from comparison`}
          onClick={() => onRemove(model.id)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <div className="mt-3">
        {model.providers[0] ? (
          <ProviderBadge
            plain
            size="lg"
            provider={model.providers[0]}
            names={model.providerNames}
            docs={model.providerDocs[model.providers[0]]}
          />
        ) : (
          <span className="text-xs text-muted-foreground">Provider not listed</span>
        )}
      </div>

      <Link
        href={modelHref(model.id)}
        prefetch={false}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        View model details
        <ExternalLink aria-hidden="true" className="size-3.5" />
      </Link>
    </div>
  );
}

function CompareEmptyState({ onAddModel }: { onAddModel: () => void }) {
  return (
    <section className="rounded-[24px] border border-border bg-card p-8 text-center sm:p-12">
      <h2 className="font-heading text-2xl font-extrabold tracking-[-0.035em]">
        Compare models side by side
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
        Select at least two free models to compare context windows, capabilities, providers, limits,
        and benchmark scores.
      </p>
      <Button type="button" className="mt-6 gap-2" onClick={onAddModel}>
        <Plus aria-hidden="true" className="size-4" />
        Add model
      </Button>
    </section>
  );
}

function OneModelNotice() {
  return (
    <p className="rounded-xl border border-secondary bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
      Add one more model to start comparing.
    </p>
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
  const limits = model.connections.flatMap((connection) =>
    connection.limits.map((term) => ({
      provider: connection.provider,
      term,
    })),
  );

  if (limits.length === 0) return <NotListed />;

  return (
    <ul className="space-y-2">
      {limits.slice(0, 5).map(({ provider, term }) => (
        <li key={`${provider}-${term}`} className="text-xs leading-5">
          <span className="font-semibold">{getProviderName(provider, model.providerNames)}:</span>{" "}
          {term}
        </li>
      ))}
      {limits.length > 5 && (
        <li className="text-xs text-muted-foreground">+{limits.length - 5} more listed limits</li>
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
        <div className="space-y-2">
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

function CompareTable({
  models,
  highlightBest,
  onRemove,
}: {
  models: ModelSummary[];
  highlightBest: boolean;
  onRemove: (id: string) => void;
}) {
  const sections = [
    ["overview", "Overview"],
    ["benchmarks", "Benchmarks"],
    ["access", "Free access"],
  ] as const;

  return (
    <div className="overflow-hidden rounded-[24px] border border-border">
      <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-3 text-xs text-muted-foreground sm:px-5">
        <MoveHorizontal aria-hidden="true" className="size-3.5 lg:hidden" />
        <span className="lg:hidden">Scroll to compare</span>
        <span className="hidden ml-auto text-xs text-muted-foreground sm:inline-block">
          Scores: Artificial Analysis
        </span>
      </div>

      <section
        aria-label="Selected model comparison"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The scroll region needs keyboard access to off-screen columns.
        tabIndex={0}
        className="relative isolate overflow-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0 text-sm">
          <caption className="sr-only">Side-by-side comparison of selected free AI models.</caption>

          <colgroup>
            <col className="w-[180px] sm:w-[24%]" />
            {models.map((model) => (
              <col key={model.id} className="w-[240px] sm:w-auto" />
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
                  className="border-b px-3 py-3 text-left align-top sm:px-4"
                >
                  <CompareModelHeader model={model} onRemove={onRemove} />
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
              </tbody>
            );
          })}
        </table>
      </section>
    </div>
  );
}

export function ModelCompare({ models }: { models: ModelSummary[] }) {
  const { requestedIds, selectedModels, highlightBest, addModel, removeModel, setHighlightBest } =
    useCompareState(models);

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
    <div className="container py-8 sm:py-10 lg:max-w-[1280px]">
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
          Some models in this comparison are no longer available and were skipped.
        </p>
      )}

      <div className="mt-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-h-11 items-center gap-3">
            <Switch
              id="compare-highlight-best"
              checked={highlightBest}
              onCheckedChange={(checked) => setHighlightBest(Boolean(checked))}
            />
            <label
              htmlFor="compare-highlight-best"
              className="cursor-pointer text-sm font-medium select-none"
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
              {copied ? "Copied" : "Copy link"}
            </Button>

            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    disabled={selectedModels.length >= MAX_COMPARE_MODELS}
                    className="gap-2"
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Add model
                  </Button>
                }
              />
              <ModelPicker
                models={models}
                selectedIds={selectedModels.map((model) => model.id)}
                onSelect={(id) => {
                  addModel(id);
                  setPickerOpen(false);
                }}
              />
            </Popover>
          </div>
        </div>

        {selectedModels.length === 0 ? (
          <CompareEmptyState onAddModel={() => setPickerOpen(true)} />
        ) : (
          <>
            {selectedModels.length === 1 && <OneModelNotice />}

            <CompareTable
              models={selectedModels}
              highlightBest={highlightBest}
              onRemove={removeModel}
            />
          </>
        )}
      </div>

      {/* How to use this comparison */}
      <section aria-labelledby="compare-how-it-works-heading" className="mt-16 max-w-3xl">
        <h2
          id="compare-how-it-works-heading"
          className="font-heading text-2xl font-extrabold tracking-[-0.035em]"
        >
          How to use this comparison
        </h2>

        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          <li className="rounded-[20px] border border-border bg-card p-5">
            <span className="text-sm font-semibold text-muted-foreground">1</span>
            <h3 className="mt-3 font-semibold">Choose models</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Add up to four models from the catalogue.
            </p>
          </li>

          <li className="rounded-[20px] border border-border bg-card p-5">
            <span className="text-sm font-semibold text-muted-foreground">2</span>
            <h3 className="mt-3 font-semibold">Review the differences</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Compare capabilities, context, providers, limits, and available scores.
            </p>
          </li>

          <li className="rounded-[20px] border border-border bg-card p-5">
            <span className="text-sm font-semibold text-muted-foreground">3</span>
            <h3 className="mt-3 font-semibold">Share your shortlist</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Copy the URL to share the same comparison with someone else.
            </p>
          </li>
        </ol>
      </section>

      {/* Frequently Asked Questions */}
      <section aria-labelledby="compare-faq-heading" className="mt-16 max-w-3xl">
        <h2
          id="compare-faq-heading"
          className="font-heading text-2xl font-extrabold tracking-[-0.035em]"
        >
          Frequently asked questions
        </h2>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold">What can I compare?</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              You can compare available model capabilities, context windows, modalities, reasoning
              support, tool calling, providers, listed limits, and benchmark scores.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold">Are these models completely free?</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The catalogue lists models available through free providers. Availability and usage
              limits can vary by provider. Check the provider details before relying on a model for
              ongoing use.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold">What does context window mean?</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The context window is the maximum amount of input and conversation history listed for
              a model. A larger context window does not automatically mean better output quality.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold">What does “best” mean in the comparison?</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The Highlight best option only identifies the highest or lowest numeric value for
              supported rows. It does not determine which model is best for every task.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold">Can I share a comparison?</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Yes. Selected models are stored in the URL, so you can copy and share the comparison
              link.
            </p>
          </div>
        </div>
      </section>

      {/* Browse all models CTA */}
      <section className="mt-16 max-w-3xl rounded-[24px] border border-border bg-card p-8 sm:p-10">
        <h2 className="font-heading text-2xl font-extrabold tracking-[-0.035em]">
          Browse all models
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Explore hundreds of free AI models across top providers in our complete catalogue.
        </p>
        <div className="mt-6">
          <Button render={<Link href="/#models" />} nativeButton={false} className="gap-2">
            Browse all models
          </Button>
        </div>
      </section>
    </div>
  );
}
