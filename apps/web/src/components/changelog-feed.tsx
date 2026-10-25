import { ArrowUpRight, EyeOff, GitCommit } from "lucide-react";
import Link from "next/link";
import { BrandImage } from "@/components/brand-image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ChangelogEntry } from "@/lib/changelog-data";
import { modelHref } from "@/lib/model-path";
import { providerLogoUrl, publisherFaviconUrl } from "@/lib/provider-logos";

interface ChangelogFeedProps {
  readonly entries: readonly ChangelogEntry[];
  readonly activeModelIds: readonly string[];
  readonly activeProviderSlugs?: readonly string[];
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

function initials(name?: string): string {
  if (!name) return "";
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getModelPublisher(canonicalId?: string | null): string | null {
  if (!canonicalId || canonicalId.startsWith("stealth:")) return null;
  const separator = canonicalId.indexOf("/");
  return separator > 0 ? canonicalId.slice(0, separator) : null;
}

export function ChangelogFeed({
  entries,
  activeModelIds,
  activeProviderSlugs,
}: ChangelogFeedProps) {
  const activeSet = new Set(activeModelIds);
  const activeProviderSet = new Set(activeProviderSlugs ?? []);

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
            <div className="flex items-center justify-between pb-1 text-xs text-muted-foreground px-1">
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

            {/* Git Log Row Table */}
            <div className="border-y border-border/40 overflow-hidden">
              <Table className="table-fixed w-full">
                <colgroup>
                  <col className="w-[88px]" />
                  <col className="w-[160px] sm:w-[200px]" />
                  <col />
                  <col className="w-[85px]" />
                </colgroup>
                <TableHeader className="sr-only">
                  <TableRow>
                    <TableHead>Change type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayEntries.map((entry) => {
                    const isAdded = entry.type === "added";
                    const isProvider = entry.category === "provider";
                    const logoUrl = providerLogoUrl(entry.provider);
                    const modelPublisher = !isProvider
                      ? getModelPublisher(entry.canonicalId)
                      : null;
                    const modelLogoUrl = modelPublisher
                      ? publisherFaviconUrl(modelPublisher)
                      : null;
                    const isStealth = entry.canonicalId?.startsWith("stealth:") ?? false;
                    const isLiveInCatalogue = entry.canonicalId && activeSet.has(entry.canonicalId);
                    const isLiveProvider =
                      activeProviderSet.size === 0 || activeProviderSet.has(entry.provider);
                    const actionLabel = isProvider
                      ? isAdded
                        ? "Provider added on"
                        : "Provider removed on"
                      : isAdded
                        ? "Added on"
                        : "Removed on";
                    const hoverText = `${actionLabel} ${formatTooltipDate(entry.timestamp)} UTC`;
                    const prefix = isProvider
                      ? isAdded
                        ? "+PROVIDER"
                        : "-PROVIDER"
                      : isAdded
                        ? "+NEW"
                        : "-DEL";

                    const rowBg = isProvider
                      ? isAdded
                        ? "bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] hover:bg-emerald-500/[0.12] dark:hover:bg-emerald-500/[0.16]"
                        : "bg-red-500/[0.08] dark:bg-red-500/[0.12] hover:bg-red-500/[0.12] dark:hover:bg-red-500/[0.16]"
                      : "hover:bg-muted/30";

                    return (
                      <TableRow
                        key={entry.id}
                        title={hoverText}
                        className={`border-b border-border/40 transition-colors ${rowBg}`}
                      >
                        {/* Status Label */}
                        <TableCell className="py-2 pl-2 pr-1 font-mono text-[10px] font-bold tracking-wider align-middle">
                          <span
                            className={
                              isAdded
                                ? "text-[#216e32] dark:text-[#9fe870]"
                                : "text-[#d03238] dark:text-red-400"
                            }
                          >
                            {prefix}
                          </span>
                        </TableCell>

                        {/* Provider Logo & Name */}
                        <TableCell className="py-2 px-2 align-middle">
                          {isLiveProvider ? (
                            <Link
                              href={`/providers/${entry.provider}`}
                              className="inline-flex items-center gap-1.5 max-w-full text-xs font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                            >
                              <Avatar className="size-4 shrink-0 rounded-[4px] border border-border/50">
                                {logoUrl && (
                                  <BrandImage alt="" className="object-contain" src={logoUrl} />
                                )}
                                <AvatarFallback className="text-[8px] font-bold">
                                  {initials(entry.providerName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{entry.providerName}</span>
                            </Link>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 max-w-full text-xs font-semibold text-foreground">
                              <Avatar className="size-4 shrink-0 rounded-[4px] border border-border/50">
                                {logoUrl && (
                                  <BrandImage alt="" className="object-contain" src={logoUrl} />
                                )}
                                <AvatarFallback className="text-[8px] font-bold">
                                  {initials(entry.providerName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{entry.providerName}</span>
                            </div>
                          )}
                        </TableCell>

                        {/* Model / Provider Display Name */}
                        <TableCell className="py-2 px-2 align-middle min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!isProvider && (
                              <Avatar className="size-4 shrink-0 rounded-[4px] border border-border/50">
                                {modelLogoUrl && (
                                  <BrandImage
                                    alt=""
                                    className="object-contain"
                                    src={modelLogoUrl}
                                  />
                                )}
                                <AvatarFallback className="text-[8px] font-bold">
                                  {isStealth ? (
                                    <EyeOff className="size-2.5" />
                                  ) : (
                                    initials(entry.modelName)
                                  )}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <span className="font-medium text-xs text-foreground truncate">
                              {entry.modelName}
                            </span>

                            {isProvider && entry.details && (
                              <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                                ({entry.details})
                              </span>
                            )}

                            {/* Top-right arrow icon linking to catalogue */}
                            {isProvider
                              ? isLiveProvider && (
                                  <Link
                                    href={`/providers/${entry.provider}`}
                                    className="inline-flex items-center text-muted-foreground hover:text-foreground shrink-0 focus-visible:outline-2 focus-visible:outline-ring"
                                    aria-label={`View ${entry.providerName} details in catalogue`}
                                  >
                                    <ArrowUpRight className="size-3.5" />
                                  </Link>
                                )
                              : isLiveInCatalogue &&
                                entry.canonicalId && (
                                  <Link
                                    href={modelHref(entry.canonicalId)}
                                    className="inline-flex items-center text-muted-foreground hover:text-foreground shrink-0 focus-visible:outline-2 focus-visible:outline-ring"
                                    aria-label={`View ${entry.modelName} details in catalogue`}
                                  >
                                    <ArrowUpRight className="size-3.5" />
                                  </Link>
                                )}
                          </div>
                        </TableCell>

                        {/* Timestamp */}
                        <TableCell className="py-2 pl-1 pr-2 text-right align-middle font-mono text-[11px] text-muted-foreground">
                          <time dateTime={entry.timestamp}>{formatTime(entry.timestamp)}</time>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
