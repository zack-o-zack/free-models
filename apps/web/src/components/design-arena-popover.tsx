"use client";

import { Medal, Swords, Target } from "lucide-react";
import { Fragment } from "react";

import { BenchmarkMetric } from "@/components/benchmark-metric";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatBenchmarkElo,
  formatBenchmarkRank,
  formatBenchmarkWinRate,
  formatDesignArenaCategory,
  formatDesignArenaName,
} from "@/lib/model-format";
import type { DesignArenaBenchmark } from "@/lib/model-types";

export function DesignArenaPopover({ benchmarks }: { benchmarks: DesignArenaBenchmark[] }) {
  if (benchmarks.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger
        aria-label="View Design Arena benchmarks"
        render={
          <Button
            className="rounded-full border-foreground/15 text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground dark:border-foreground/15 dark:hover:border-primary dark:hover:bg-primary dark:hover:text-primary-foreground"
            size="icon-xs"
            title="View Design Arena benchmarks"
            variant="outline"
          />
        }
      >
        <Swords />
        <span className="sr-only">View Design Arena benchmarks</span>
      </PopoverTrigger>
      <PopoverContent align="start">
        <div className="space-y-3">
          <div className="space-y-0.5">
            <PopoverTitle>Design Arena</PopoverTitle>
            <PopoverDescription>Elo, rank, and win rate by category.</PopoverDescription>
          </div>
          <DesignArenaTable benchmarks={benchmarks} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DesignArenaTable({ benchmarks }: { benchmarks: DesignArenaBenchmark[] }) {
  const groups = benchmarks.reduce<Map<string, DesignArenaBenchmark[]>>((result, benchmark) => {
    const group = result.get(benchmark.arena) ?? [];
    group.push(benchmark);
    result.set(benchmark.arena, group);
    return result;
  }, new Map());

  return (
    <div className="overflow-hidden rounded-[16px] border border-foreground/10">
      <Table className="min-w-[30rem] text-xs">
        <TableHeader className="bg-background/70">
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                <Swords className="size-3.5" /> Elo
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                <Medal className="size-3.5" /> Rank
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                <Target className="size-3.5" /> Win rate
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(groups.entries()).map(([arena, entries]) => (
            <Fragment key={arena}>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="pt-3 pb-1 text-[10px] tracking-[0.12em] text-muted-foreground uppercase"
                  colSpan={4}
                >
                  {formatDesignArenaName(arena)}
                </TableHead>
              </TableRow>
              {entries.map((entry) => {
                const category = formatDesignArenaCategory(entry.category);
                const prefix = `Design Arena · ${formatDesignArenaName(arena)} · ${category}`;

                return (
                  <TableRow key={`${arena}:${entry.category}`}>
                    <TableCell className="font-medium">{category}</TableCell>
                    <TableCell>
                      {entry.elo === null ? (
                        "—"
                      ) : (
                        <BenchmarkMetric
                          icon={Swords}
                          label={`${prefix} Elo`}
                          value={formatBenchmarkElo(entry.elo)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.rank === null ? (
                        "—"
                      ) : (
                        <BenchmarkMetric
                          icon={Medal}
                          label={`${prefix} rank`}
                          value={formatBenchmarkRank(entry.rank)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.winRate === null ? (
                        "—"
                      ) : (
                        <BenchmarkMetric
                          icon={Target}
                          label={`${prefix} win rate`}
                          value={formatBenchmarkWinRate(entry.winRate)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
