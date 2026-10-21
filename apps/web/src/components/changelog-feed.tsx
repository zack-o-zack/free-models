import { ArrowUpRight, GitCommit } from "lucide-react";
import Link from "next/link";
import { BrandImage } from "@/components/brand-image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ChangelogEntry } from "@/lib/changelog-data";
import { modelHref } from "@/lib/model-path";
import { publisherFaviconUrl } from "@/lib/provider-logos";

interface ChangelogFeedProps {
  readonly entries: readonly ChangelogEntry[];
  readonly activeModelIds: readonly string[];
}

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

export function ChangelogFeed({ entries, activeModelIds }: ChangelogFeedProps) {
  const activeSet = new Set(activeModelIds);

  const groupedByDate = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const list = groupedByDate.get(entry.date) ?? [];
    list.push(entry);
    groupedByDate.set(entry.date, list);
  }
  const dateGroups = [...groupedByDate.entries()].sort(([dateA], [dateB]) =>
    dateB.localeCompare(dateA),
  );

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No model additions or removals recorded in the past 30 days.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {dateGroups.map(([date, dayEntries]) => {
        const addedCount = dayEntries.filter((e) => e.type === "added").length;
        const removedCount = dayEntries.filter((e) => e.type === "removed").length;

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

            {/* Git Log Row List - Clean, no background card */}
            <div className="divide-y divide-border/40 border-y border-border/40">
              {dayEntries.map((entry) => {
                const isAdded = entry.type === "added";
                const logoUrl = publisherFaviconUrl(entry.provider);
                const isLiveInCatalogue = entry.canonicalId && activeSet.has(entry.canonicalId);
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
                      {/* Subtle text label: small uppercase NEW / DEL */}
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
  );
}
