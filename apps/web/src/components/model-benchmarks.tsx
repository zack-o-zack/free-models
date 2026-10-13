"use client";

import { BrainCircuit, ExternalLink, Swords } from "lucide-react";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ModelArenaChart } from "@/components/model-arena-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BenchmarkComparison } from "@/lib/model-benchmarks";
import {
  formatBenchmarkElo,
  formatBenchmarkRank,
  formatBenchmarkScore,
  formatBenchmarkWinRate,
  formatDesignArenaCategory,
  formatDesignArenaName,
} from "@/lib/model-format";
import type { DesignArenaBenchmark } from "@/lib/model-types";

function ScoreCard({ comparison }: { comparison: BenchmarkComparison }) {
  const { score, label, bins, minimum, maximum, percentile, peerCount } = comparison;
  const binWidth = (maximum - minimum) / bins.length;
  const distribution = bins.map((bin, index) => ({
    ...bin,
    midpoint: bin.start + binWidth / 2,
    range: `${formatBenchmarkScore(bin.start)} to ${index === bins.length - 1 ? "" : "under "}${formatBenchmarkScore(bin.start + binWidth)}`,
  }));
  return (
    <article className="min-w-0 rounded-[24px] bg-card p-5 text-center">
      <p className="font-heading text-4xl font-black tracking-[-0.05em] tabular-nums">
        {formatBenchmarkScore(score)}
      </p>
      <h3 className="mt-3 text-sm font-semibold">{label}</h3>
      {peerCount > 0 && (
        <div className="mt-6 h-28 min-w-0 text-left">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: 200, height: 112 }}
          >
            <BarChart
              data={distribution}
              margin={{ top: 8, right: 6, left: 6, bottom: 0 }}
              accessibilityLayer
              aria-label={`${label}: ${formatBenchmarkScore(score)}; distribution of ${peerCount} other free models`}
              title={`${label}: ${formatBenchmarkScore(score)}; distribution of ${peerCount} other free models`}
            >
              <XAxis
                type="number"
                dataKey="midpoint"
                domain={[minimum, maximum]}
                ticks={[minimum, maximum]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                height={22}
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "var(--primary)", fillOpacity: 0.15 }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="max-w-48 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
                      <p className="font-semibold">Score {payload[0].payload.range}</p>
                      <p className="mt-1">
                        {payload[0].value} {payload[0].value === 1 ? "model" : "models"}
                      </p>
                    </div>
                  ) : null
                }
              />
              <Bar
                dataKey="count"
                name="Models"
                fill="var(--muted-foreground)"
                fillOpacity={0.25}
                activeBar={{ fill: "var(--positive)", fillOpacity: 0.8 }}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
              <ReferenceLine x={score} stroke="var(--positive)" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-4 rounded-xl bg-secondary px-2 py-2 text-xs leading-5 text-secondary-foreground">
        {percentile === null ? (
          "No other scored models to compare"
        ) : (
          <>
            Above <strong>{percentile}%</strong> of {peerCount} other free models
          </>
        )}
      </p>
    </article>
  );
}

function ArenaCards({ entries }: { entries: DesignArenaBenchmark[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <article key={entry.category} className="rounded-[24px] bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-sm font-semibold">{formatDesignArenaCategory(entry.category)}</h4>
            {entry.rank !== null && (
              <span className="shrink-0 rounded-lg bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                {formatBenchmarkRank(entry.rank)}
              </span>
            )}
          </div>
          <p className="mt-5 font-heading text-3xl font-extrabold tracking-tight tabular-nums">
            {entry.elo === null ? "—" : formatBenchmarkElo(entry.elo)}{" "}
            <span className="font-sans text-xs font-normal tracking-normal text-muted-foreground">
              Elo
            </span>
          </p>
          {entry.winRate !== null ? (
            <>
              <div
                className="mt-4 h-1.5 overflow-hidden rounded-full bg-background"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(0, Math.min(100, entry.winRate))}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatBenchmarkWinRate(entry.winRate)} win rate
              </p>
            </>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">Win rate not listed</p>
          )}
        </article>
      ))}
    </div>
  );
}

export function ModelBenchmarks({
  comparisons,
  designArena,
}: {
  comparisons: BenchmarkComparison[];
  designArena: DesignArenaBenchmark[];
}) {
  const arenas = [...new Set(designArena.map((entry) => entry.arena))];
  if (comparisons.length === 0 && designArena.length === 0) {
    return (
      <p className="rounded-[24px] bg-background p-6 text-sm text-muted-foreground">
        No benchmark results are available for this model yet.
      </p>
    );
  }

  return (
    <Tabs
      defaultValue={comparisons.length > 0 ? "analysis" : "arena"}
      className="gap-6 rounded-[24px] bg-background p-4 sm:p-6"
    >
      <TabsList
        aria-label="Benchmark source"
        className="h-auto! w-full rounded-full p-1 sm:ml-auto sm:w-fit"
      >
        <TabsTrigger
          value="analysis"
          disabled={comparisons.length === 0}
          className="min-h-11 rounded-full px-3 text-xs data-active:text-primary-foreground! sm:px-4 sm:text-sm"
        >
          <BrainCircuit className="hidden sm:block" /> Artificial Analysis
        </TabsTrigger>
        <TabsTrigger
          value="arena"
          disabled={designArena.length === 0}
          className="min-h-11 rounded-full px-3 text-xs data-active:text-primary-foreground! sm:px-4 sm:text-sm"
        >
          <Swords className="hidden sm:block" /> Design Arena
        </TabsTrigger>
      </TabsList>
      <TabsContent value="analysis" className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {comparisons.map((comparison) => (
            <ScoreCard key={comparison.label} comparison={comparison} />
          ))}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Bars show scores from other free models on this site. The marker shows this model’s score.
          Comparisons include only models with a score for that index.
        </p>
        <a
          href="https://artificialanalysis.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Scores from Artificial Analysis <ExternalLink className="size-3.5" />
        </a>
      </TabsContent>
      <TabsContent value="arena" className="space-y-5">
        <Tabs defaultValue={arenas[0]} className="gap-5">
          <TabsList aria-label="Design Arena group" variant="line" className="h-auto! flex-wrap">
            {arenas.map((arena) => (
              <TabsTrigger
                key={arena}
                value={arena}
                className="min-h-11 px-3 data-active:text-secondary-foreground!"
              >
                {formatDesignArenaName(arena)} arena
              </TabsTrigger>
            ))}
          </TabsList>
          {arenas.map((arena) => {
            const entries = designArena.filter((entry) => entry.arena === arena);
            return (
              <TabsContent key={arena} value={arena} className="space-y-4">
                <ModelArenaChart entries={entries} />
                <ArenaCards entries={entries} />
              </TabsContent>
            );
          })}
        </Tabs>
        <a
          href="https://www.designarena.ai/about"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Scores from Design Arena <ExternalLink className="size-3.5" />
        </a>
      </TabsContent>
    </Tabs>
  );
}
