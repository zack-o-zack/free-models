"use client";

import { ArrowDownRight, ExternalLink, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatBenchmarkScore, formatContext } from "@/lib/model-format";
import { modelHref } from "@/lib/model-path";
import type { ModelSummary } from "@/lib/model-types";
import { getProviderName } from "@/lib/provider-logos";

export interface HeroProps {
  models: ModelSummary[];
}

type LeaderboardCategory = "coding" | "intelligence" | "context";

export function HeroBenchmarkRadar({ models }: HeroProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardCategory>("coding");

  const { topCoding, topIntelligence, topContext, stats } = useMemo(() => {
    const validCoding = [...models]
      .filter((m) => m.codingScore !== null && m.codingScore > 0)
      .sort((a, b) => (b.codingScore ?? 0) - (a.codingScore ?? 0))
      .slice(0, 4);

    const validIntelligence = [...models]
      .filter((m) => m.intelligenceScore !== null && m.intelligenceScore > 0)
      .sort((a, b) => (b.intelligenceScore ?? 0) - (a.intelligenceScore ?? 0))
      .slice(0, 4);

    const validContext = [...models]
      .filter((m) => m.contextLength > 0)
      .sort((a, b) => b.contextLength - a.contextLength)
      .slice(0, 4);

    const highestCoding = validCoding[0]?.codingScore ?? 0;
    const highestIntelligence = validIntelligence[0]?.intelligenceScore ?? 0;
    const maxContext = validContext[0]?.contextLength ?? 0;

    return {
      topCoding: validCoding,
      topIntelligence: validIntelligence,
      topContext: validContext,
      stats: {
        highestCoding,
        highestIntelligence,
        maxContext,
      },
    };
  }, [models]);

  const currentList =
    activeTab === "coding"
      ? topCoding
      : activeTab === "intelligence"
        ? topIntelligence
        : topContext;

  return (
    <section className="relative overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 right-10 size-96 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="container relative grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] lg:items-center lg:py-24">
        {/* Left Column: Provocative Benchmark Framing */}
        <div className="max-w-3xl">
          {/* Eyebrow status pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2ead4b]/25 bg-[#e2f6d5] px-3.5 py-1 text-xs font-semibold text-[#054d28] dark:border-[#9fe870]/30 dark:bg-[#192b15] dark:text-[#9fe870]">
            <Trophy className="size-3.5 text-positive" />
            <span>Artificial Analysis & Arena Benchmarked</span>
          </div>

          {/* Headline in Display Sans weight 900 */}
          <h1 className="mt-6 font-heading text-[clamp(2.75rem,6.5vw,5.5rem)] leading-[0.92] font-black tracking-[-0.06em] text-foreground">
            Don&apos;t guess the speed.
            <br />
            <span className="text-foreground">Benchmark the </span>
            <span className="text-positive">output.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Why burn cloud credits testing paid APIs when verified free models match or exceed
            commercial tiers on coding, reasoning, and context? Filter by real independent benchmark
            scores before shipping.
          </p>

          {/* 3 Quick Benchmark metric chips */}
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-lg">
            <div className="rounded-[20px] bg-card p-3.5 border border-foreground/5 shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Top Free Coding
              </span>
              <p className="mt-1 font-heading text-xl font-extrabold text-foreground">
                {stats.highestCoding > 0 ? formatBenchmarkScore(stats.highestCoding) : "78+"}{" "}
                <span className="text-xs font-medium text-positive">pts</span>
              </p>
            </div>

            <div className="rounded-[20px] bg-card p-3.5 border border-foreground/5 shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Top Intelligence
              </span>
              <p className="mt-1 font-heading text-xl font-extrabold text-foreground">
                {stats.highestIntelligence > 0
                  ? formatBenchmarkScore(stats.highestIntelligence)
                  : "65+"}{" "}
                <span className="text-xs font-medium text-positive">pts</span>
              </p>
            </div>

            <div className="rounded-[20px] bg-card p-3.5 border border-foreground/5 shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Context Ceiling
              </span>
              <p className="mt-1 font-heading text-xl font-extrabold text-foreground">
                {formatContext(stats.maxContext)}
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            <Button
              render={<a href="#models" />}
              nativeButton={false}
              size="lg"
              className="h-12 rounded-[24px] bg-primary px-7 text-base font-semibold text-[#163300] shadow-sm hover:bg-[#cdffad]"
            >
              Browse ranked models <ArrowDownRight className="size-4" />
            </Button>

            <span className="text-xs font-medium text-muted-foreground">
              {models.length} models verified · Zero monthly minimums
            </span>
          </div>
        </div>

        {/* Right Column: Live Interactive Leaderboard Snapshot */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-[24px] border border-foreground/8 bg-card p-6 shadow-sm sm:p-7">
            {/* Card Header & Tabs */}
            <div className="flex flex-col gap-4 border-b border-foreground/8 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold tracking-wider text-positive uppercase">
                  Live Free Leaderboard
                </p>
                <h2 className="mt-0.5 font-heading text-lg font-extrabold text-foreground">
                  Top Free Performers
                </h2>
              </div>

              {/* Interactive Tab Switcher */}
              <div className="flex rounded-full bg-background p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("coding")}
                  className={`rounded-full px-3 py-1.5 transition-all ${
                    activeTab === "coding"
                      ? "bg-primary text-[#163300] shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Coding
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("intelligence")}
                  className={`rounded-full px-3 py-1.5 transition-all ${
                    activeTab === "intelligence"
                      ? "bg-primary text-[#163300] shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Intelligence
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("context")}
                  className={`rounded-full px-3 py-1.5 transition-all ${
                    activeTab === "context"
                      ? "bg-primary text-[#163300] shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Context
                </button>
              </div>
            </div>

            {/* Leaderboard Model Rows */}
            <div className="mt-4 divide-y divide-foreground/5">
              {currentList.map((model, index) => {
                const score =
                  activeTab === "coding"
                    ? model.codingScore
                    : activeTab === "intelligence"
                      ? model.intelligenceScore
                      : null;

                const rankColor =
                  index === 0
                    ? "bg-primary text-[#163300] font-black"
                    : "bg-secondary text-secondary-foreground font-semibold";

                return (
                  <div
                    key={model.id}
                    className="flex items-center justify-between gap-3 py-3.5 transition-colors first:pt-1 last:pb-1"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${rankColor}`}
                      >
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={modelHref(model.id)}
                          className="block truncate font-heading text-sm font-bold text-foreground hover:text-primary"
                        >
                          {model.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {model.author} • {getProviderName(model.providers[0] ?? "")}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 text-right">
                      {activeTab === "context" ? (
                        <span className="rounded-full bg-background px-2.5 py-1 text-xs font-bold text-foreground">
                          {formatContext(model.contextLength)}
                        </span>
                      ) : score !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="hidden h-2 w-16 overflow-hidden rounded-full bg-muted sm:block">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(100, score)}%` }}
                            />
                          </div>
                          <span className="font-heading text-sm font-extrabold text-foreground">
                            {formatBenchmarkScore(score)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leaderboard Card Footer */}
            <div className="mt-5 border-t border-foreground/8 pt-4">
              <a
                href="#models"
                className="group flex items-center justify-between text-xs font-semibold text-foreground hover:text-positive"
              >
                <span>Compare all {models.length} indexed models</span>
                <ExternalLink className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
