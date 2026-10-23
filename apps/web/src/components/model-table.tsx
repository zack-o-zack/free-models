"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, EyeOff, MoveHorizontal } from "lucide-react";
import Link from "next/link";
import { BrandImage } from "@/components/brand-image";
import { DesignArenaPopover } from "@/components/design-arena-popover";
import { ProviderBadge } from "@/components/provider-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { entityHref } from "@/lib/catalogue-entities";
import { formatBenchmarkScore, formatContext } from "@/lib/model-format";
import { modelHref } from "@/lib/model-path";
import type { SortDirection, SortOption } from "@/lib/model-sort";
import type { CatalogueModel } from "@/lib/model-types";
import { publisherFaviconUrl } from "@/lib/provider-logos";
import { cn } from "@/lib/utils";

function NotListed() {
  return (
    <span className="font-normal text-muted-foreground">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Not listed</span>
    </span>
  );
}

function Providers({ model }: { model: CatalogueModel }) {
  if (model.providers.length === 0) return <NotListed />;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <Link
        href={entityHref("providers", model.providers[0])}
        className="underline-offset-4 hover:underline"
      >
        <ProviderBadge
          plain
          docs={model.providerDocs[model.providers[0]]}
          provider={model.providers[0]}
          names={model.providerNames}
        />
      </Link>
      {model.providers.length > 1 && (
        <Popover>
          <PopoverTrigger
            aria-label={`View all ${model.providers.length} free providers for ${model.name}`}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            +{model.providers.length - 1}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
            <PopoverTitle>Free providers for {model.name}</PopoverTitle>
            <ul className="mt-3 space-y-3">
              {model.providers.map((provider) => (
                <li key={provider}>
                  <Link
                    href={entityHref("providers", provider)}
                    className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                  >
                    <ProviderBadge
                      plain
                      size="lg"
                      docs={model.providerDocs[provider]}
                      provider={provider}
                      names={model.providerNames}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function SortHeading({
  label,
  value,
  numeric = false,
  sort,
  direction,
  onSort,
}: {
  label: string;
  value: SortOption;
  numeric?: boolean;
  sort: SortOption;
  direction: SortDirection;
  onSort: (sort: SortOption) => void;
}) {
  const active = sort === value;
  const Icon = active ? (direction === "ascending" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead
      scope="col"
      aria-sort={active ? direction : "none"}
      className={cn("px-3", value === "name" && "sticky left-0 z-30 bg-muted pl-4 sm:pl-5")}
    >
      <button
        type="button"
        onClick={() => onSort(value)}
        className={cn(
          "flex min-h-12 w-full items-center gap-1.5 rounded-sm text-xs font-semibold hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
          numeric && "justify-end",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      </button>
    </TableHead>
  );
}

export function ModelTable({
  models,
  sort,
  direction,
  onSort,
}: {
  models: CatalogueModel[];
  sort: SortOption;
  direction: SortDirection;
  onSort: (sort: SortOption) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-border">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b bg-muted/50 px-4 py-3 text-xs text-muted-foreground sm:px-5">
        <p className="flex items-center gap-1.5 lg:hidden">
          <MoveHorizontal aria-hidden="true" className="size-3.5" /> Scroll to compare
        </p>
        <p className="ml-auto">Scores: Artificial Analysis</p>
      </div>
      <section
        aria-label="Model comparison"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The scroll region needs keyboard access to off-screen columns.
        tabIndex={0}
        className="relative isolate max-h-[70vh] overflow-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            Compare free models by provider, context window in tokens, and benchmark scores.
          </caption>
          <colgroup>
            <col className="w-[180px] sm:w-[28%]" />
            <col className="w-[180px] sm:w-[19%]" />
            <col className="w-[115px] sm:w-[12%]" />
            <col className="w-[115px] sm:w-[12%]" />
            <col className="w-[95px] sm:w-[9%]" />
            <col className="w-[95px] sm:w-[9%]" />
            <col className="w-[120px] sm:w-[11%]" />
          </colgroup>
          <TableHeader className="sticky top-0 z-20 bg-muted [&_th]:border-b">
            <TableRow className="hover:bg-transparent">
              <SortHeading
                sort={sort}
                direction={direction}
                onSort={onSort}
                label="Model"
                value="name"
              />
              <TableHead scope="col" className="px-3 text-xs font-semibold text-muted-foreground">
                Free providers
              </TableHead>
              <SortHeading
                sort={sort}
                direction={direction}
                onSort={onSort}
                label="Context"
                value="context"
                numeric
              />
              <SortHeading
                sort={sort}
                direction={direction}
                onSort={onSort}
                label="Intelligence"
                value="intelligence"
                numeric
              />
              <SortHeading
                sort={sort}
                direction={direction}
                onSort={onSort}
                label="Coding"
                value="coding"
                numeric
              />
              <SortHeading
                sort={sort}
                direction={direction}
                onSort={onSort}
                label="Agentic"
                value="agentic"
                numeric
              />
              <TableHead
                scope="col"
                className="px-3 text-center text-xs font-semibold text-muted-foreground"
              >
                Design Arena
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((model) => (
              <TableRow
                key={model.id}
                className="group bg-card even:bg-muted hover:bg-muted focus-within:bg-muted [&>td]:border-b [&>td]:border-border/60 last:[&>td]:border-b-0"
              >
                <TableCell className="sticky left-0 z-10 bg-card px-4 py-3 whitespace-normal group-even:bg-muted group-hover:bg-muted group-focus-within:bg-muted sm:px-5">
                  <Link
                    href={modelHref(model.id)}
                    prefetch={false}
                    className="flex min-h-11 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                  >
                    <Avatar
                      aria-hidden="true"
                      className="hidden size-8 shrink-0 rounded-[8px] sm:flex"
                    >
                      {!model.isStealth && (
                        <BrandImage
                          alt=""
                          src={publisherFaviconUrl(model.id.split("/")[0]) ?? undefined}
                          className="object-contain p-0.5"
                        />
                      )}
                      <AvatarFallback className="bg-background text-[10px]">
                        {model.isStealth ? (
                          <EyeOff className="size-4" />
                        ) : (
                          model.author.slice(0, 2).toUpperCase()
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <span className="block font-semibold leading-5 break-words underline-offset-4 hover:underline">
                        {model.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {model.isStealth ? "Stealth model" : model.author}
                      </span>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="px-3 py-3 whitespace-normal">
                  <Providers model={model} />
                </TableCell>
                <TableCell className="px-3 py-3 text-right tabular-nums">
                  {model.contextLength > 0 ? (
                    <span
                      title={`${model.contextLength.toLocaleString("en")} tokens`}
                      className="font-medium"
                    >
                      {formatContext(model.contextLength)}
                      <span className="sr-only"> tokens</span>
                    </span>
                  ) : (
                    <NotListed />
                  )}
                </TableCell>
                {[model.intelligenceScore, model.codingScore, model.agenticScore].map(
                  (score, index) => (
                    <TableCell
                      key={["intelligence", "coding", "agentic"][index]}
                      className="px-3 py-3 text-right font-medium tabular-nums"
                    >
                      {score === null ? <NotListed /> : formatBenchmarkScore(score)}
                    </TableCell>
                  ),
                )}
                <TableCell className="px-3 py-3 text-center">
                  <div className="flex justify-center [&_button]:size-9">
                    {model.designArena.length > 0 ? (
                      <DesignArenaPopover benchmarks={model.designArena} />
                    ) : (
                      <NotListed />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </section>
    </div>
  );
}
