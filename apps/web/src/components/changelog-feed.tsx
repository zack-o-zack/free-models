"use client";

import { ArrowUpRight, GitCommit, Layers, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BrandImage } from "@/components/brand-image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ChangelogEntry } from "@/lib/changelog-data";
import { modelHref } from "@/lib/model-path";
import { publisherFaviconUrl } from "@/lib/provider-logos";

interface ChangelogFeedProps {
  readonly entries: readonly ChangelogEntry[];
  readonly activeModelIds: readonly string[];
  readonly activeProviderSlugs?: readonly string[];
}

type FilterCategory = "all" | "providers" | "models";

function formatDateHeading(dateString: string): string {
  try {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatTooltipDate(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return timestamp;
  }
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return `${date.toLocaleTimeString("en-US", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })} UTC`;
  } catch {
    return "";
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ChangelogFeed({
  entries,
  activeModelIds,
  activeProviderSlugs,
}: ChangelogFeedProps) {
  const [filter, setFilter] = useState<FilterCategory>("all");
  const activeSet = new Set(activeModelIds);
  const activeProviderSet = new Set(activeProviderSlugs ?? []);

  const providerEntriesCount = entries.filter((e) => e.category === "provider").length;
  const modelEntriesCount = entries.filter((e) => e.category !== "provider").length;

  const filteredEntries = entries.filter((entry) => {
    if (filter === "providers") return entry.category === "provider";
    if (filter === "models") return entry.category !== "provider";
    return true;
  });

  const groupedByDate = new Map<string, ChangelogEntry[]>();
  for (const entry of filteredEntries) {
    const list = groupedByDate.get(entry.date) ?? [];
    list.push(entry);
    groupedByDate.set(entry.date, list);
  }
  const dateGroups = [...groupedByDate.entries()].sort(([dateA], [dateB]) =>
    dateB.localeCompare(dateA),
  );

  return (
    <div className="space-y-6">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="inline-flex items-center gap-1.5 p-1 rounded-lg bg-muted/50 border border-border/50 text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              filter === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Changes ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("providers")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors inline-flex items-center gap-1.5 ${
              filter === "providers"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="size-3.5" aria-hidden="true" />
            <span>Providers ({providerEntriesCount})</span>
            {providerEntriesCount > 0 && (
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilter("models")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors inline-flex items-center gap-1.5 ${
              filter === "models"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Models ({modelEntriesCount})</span>
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"} over
          the past 30 days
        </p>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === "providers"
              ? "No provider additions or removals recorded in the past 30 days."
              : filter === "models"
                ? "No model additions or removals recorded in the past 30 days."
                : "No model or provider changes recorded in the past 30 days."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {dateGroups.map(([date, dayEntries]) => {
            const addedCount = dayEntries.filter((e) => e.type === "added").length;
            const removedCount = dayEntries.filter((e) => e.type === "removed").length;
            const providerChanges = dayEntries.filter((e) => e.category === "provider");

            return (
              <section key={date} aria-labelledby={`date-heading-${date}`} className="space-y-1.5">
                {/* Date Group Header */}
                <div className="flex items-center justify-between pb-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 font-medium">
                    <GitCommit className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    <h2 id={`date-heading-${date}`} className="font-semibold text-foreground">
                      Changes on {formatDateHeading(date)}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    {providerChanges.length > 0 && (
                      <span className="font-sans font-semibold text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {providerChanges.length}{" "}
                        {providerChanges.length === 1 ? "provider" : "providers"}
                      </span>
                    )}
                    {addedCount > 0 && (
                      <span className="text-[#216e32] dark:text-[#9fe870]">+{addedCount}</span>
                    )}
                    {removedCount > 0 && (
                      <span className="text-[#d03238] dark:text-red-400">-{removedCount}</span>
                    )}
                    <span>
                      ({dayEntries.length} {dayEntries.length === 1 ? "change" : "changes"})
                    </span>
                  </div>
                </div>

                {/* Git Log Row List */}
                <div className="divide-y divide-border/40 border-y border-border/40">
                  {dayEntries.map((entry) => {
                    const isAdded = entry.type === "added";
                    const isProvider = entry.category === "provider";
                    const logoUrl = publisherFaviconUrl(entry.provider);

                    if (isProvider) {
                      const isLiveProvider =
                        activeProviderSet.size === 0 || activeProviderSet.has(entry.provider);
                      const actionLabel = isAdded ? "Provider added on" : "Provider removed on";
                      const hoverText = `${actionLabel} ${formatTooltipDate(entry.timestamp)} UTC`;

                      return (
                        <div
                          key={entry.id}
                          title={hoverText}
                          className={`flex items-center justify-between gap-3 py-2 px-1 my-0.5 rounded-sm transition-colors ${
                            isAdded
                              ? "bg-[#216e32]/[0.06] dark:bg-[#9fe870]/[0.09] border-l-2 border-[#216e32] dark:border-[#9fe870]"
                              : "bg-[#d03238]/[0.06] dark:bg-red-400/[0.09] border-l-2 border-[#d03238] dark:border-red-400"
                          }`}
                        >
                          {/* Left: Indicator, Provider Logo & Name, Description */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className={`font-mono text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                                isAdded
                                  ? "bg-[#216e32]/15 text-[#216e32] dark:bg-[#9fe870]/20 dark:text-[#9fe870] border border-[#216e32]/25 dark:border-[#9fe870]/30"
                                  : "bg-[#d03238]/15 text-[#d03238] dark:bg-red-400/20 dark:text-red-400 border border-[#d03238]/25 dark:border-red-400/30"
                              }`}
                            >
                              {isAdded ? "NEW PROVIDER" : "DEL PROVIDER"}
                            </span>

                            {/* Provider Logo & Name */}
                            {isLiveProvider ? (
                              <Link
                                href={`/providers/${entry.provider}`}
                                className="inline-flex items-center gap-1.5 shrink-0 text-xs font-bold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                              >
                                <Avatar className="size-4 rounded-sm border border-border/50">
                                  {logoUrl && (
                                    <BrandImage alt="" className="object-contain" src={logoUrl} />
                                  )}
                                  <AvatarFallback className="text-[8px] font-bold">
                                    {initials(entry.providerName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                                  {entry.providerName}
                                </span>
                              </Link>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 shrink-0 text-xs font-bold text-foreground">
                                <Avatar className="size-4 rounded-sm border border-border/50">
                                  {logoUrl && (
                                    <BrandImage alt="" className="object-contain" src={logoUrl} />
                                  )}
                                  <AvatarFallback className="text-[8px] font-bold">
                                    {initials(entry.providerName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                                  {entry.providerName}
                                </span>
                              </div>
                            )}

                            {/* Event Description */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                              <span className="font-semibold text-xs text-foreground truncate">
                                {isAdded
                                  ? "Provider integrated into catalogue"
                                  : "Provider removed from catalogue"}
                              </span>
                              {entry.details && (
                                <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                                  ({entry.details})
                                </span>
                              )}
                              {isLiveProvider && (
                                <Link
                                  href={`/providers/${entry.provider}`}
                                  className="inline-flex items-center text-muted-foreground hover:text-foreground shrink-0 focus-visible:outline-2 focus-visible:outline-ring"
                                  aria-label={`View ${entry.providerName} models in catalogue`}
                                >
                                  <ArrowUpRight className="size-3.5" />
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Right: Timestamp */}
                          <div className="flex items-center shrink-0 text-[11px] text-muted-foreground">
                            <time dateTime={entry.timestamp} className="font-mono text-[11px]">
                              {formatTime(entry.timestamp)}
                            </time>
                          </div>
                        </div>
                      );
                    }

                    // Model change row
                    const isLiveInCatalogue = entry.canonicalId && activeSet.has(entry.canonicalId);
                    const isLiveProvider =
                      activeProviderSet.size === 0 || activeProviderSet.has(entry.provider);
                    const actionLabel = isAdded ? "Added on" : "Removed on";
                    const hoverText = `${actionLabel} ${formatTooltipDate(entry.timestamp)} UTC`;

                    return (
                      <div
                        key={entry.id}
                        title={hoverText}
                        className="flex items-center justify-between gap-3 py-2 px-1 hover:bg-muted/30 transition-colors"
                      >
                        {/* Left: Indicator, Provider, Model info */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`font-mono text-[10px] font-bold tracking-wider w-7 shrink-0 ${
                              isAdded
                                ? "text-[#216e32] dark:text-[#9fe870]"
                                : "text-[#d03238] dark:text-red-400"
                            }`}
                          >
                            {isAdded ? "NEW" : "DEL"}
                          </span>

                          {/* Provider Logo & Name */}
                          {isLiveProvider ? (
                            <Link
                              href={`/providers/${entry.provider}`}
                              className="inline-flex items-center gap-1.5 shrink-0 text-xs font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                            >
                              <Avatar className="size-4 rounded-sm border border-border/50">
                                {logoUrl && (
                                  <BrandImage alt="" className="object-contain" src={logoUrl} />
                                )}
                                <AvatarFallback className="text-[8px] font-bold">
                                  {initials(entry.providerName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[120px] sm:max-w-[160px]">
                                {entry.providerName}
                              </span>
                            </Link>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 shrink-0 text-xs font-semibold text-foreground">
                              <Avatar className="size-4 rounded-sm border border-border/50">
                                {logoUrl && (
                                  <BrandImage alt="" className="object-contain" src={logoUrl} />
                                )}
                                <AvatarFallback className="text-[8px] font-bold">
                                  {initials(entry.providerName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[120px] sm:max-w-[160px]">
                                {entry.providerName}
                              </span>
                            </div>
                          )}

                          {/* Model Display Name */}
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                            <span className="font-medium text-xs text-foreground truncate">
                              {entry.modelName}
                            </span>

                            {/* Top-right arrow icon linking to catalogue */}
                            {isLiveInCatalogue && entry.canonicalId && (
                              <Link
                                href={modelHref(entry.canonicalId)}
                                className="inline-flex items-center text-muted-foreground hover:text-foreground shrink-0 focus-visible:outline-2 focus-visible:outline-ring"
                                aria-label={`View ${entry.modelName} details in catalogue`}
                              >
                                <ArrowUpRight className="size-3.5" />
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Right: Timestamp */}
                        <div className="flex items-center shrink-0 text-[11px] text-muted-foreground">
                          <time dateTime={entry.timestamp} className="font-mono text-[11px]">
                            {formatTime(entry.timestamp)}
                          </time>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
