"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  formatBenchmarkElo,
  formatBenchmarkWinRate,
  formatDesignArenaCategory,
} from "@/lib/model-format";
import type { DesignArenaBenchmark } from "@/lib/model-types";

type Metric = "elo" | "winRate";

const tooltipStyle = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
};

export function ModelArenaChart({ entries }: { entries: DesignArenaBenchmark[] }) {
  const [metric, setMetric] = useState<Metric>(
    entries.some((entry) => entry.elo !== null) ? "elo" : "winRate",
  );
  const values = entries.flatMap((entry) => {
    const value = entry[metric];
    return value !== null && Number.isFinite(value)
      ? [{ category: formatDesignArenaCategory(entry.category), value }]
      : [];
  });
  if (values.length === 0) return null;
  const maximum =
    metric === "winRate"
      ? 100
      : Math.max(200, Math.ceil(Math.max(...values.map((entry) => entry.value)) / 200) * 200);
  const format = (value: number) =>
    metric === "elo" ? formatBenchmarkElo(value) : formatBenchmarkWinRate(value);
  const metricLabel = metric === "elo" ? "Elo" : "Win rate";

  return (
    <div className="min-w-0 rounded-[24px] bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">Category performance</h4>
        <fieldset className="flex rounded-full bg-background p-1">
          <legend className="sr-only">Chart metric</legend>
          {(
            [
              { value: "elo", label: "Elo" },
              { value: "winRate", label: "Win rate" },
            ] as const
          ).map(({ value, label }) => (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              className={
                metric === value
                  ? "h-10 bg-primary px-4 text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  : "h-10 px-4"
              }
              aria-pressed={metric === value}
              disabled={!entries.some((entry) => entry[value] !== null)}
              onClick={() => setMetric(value)}
            >
              {label}
            </Button>
          ))}
        </fieldset>
      </div>
      {values.length >= 3 && (
        <div className="mt-4 hidden h-80 min-w-0 sm:block">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: 480, height: 320 }}
          >
            <RadarChart
              data={values}
              outerRadius="62%"
              accessibilityLayer
              aria-label={`Category ${metricLabel}; exact values are listed below`}
              title={`Category ${metricLabel}; exact values are listed below`}
            >
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <PolarRadiusAxis domain={[0, maximum]} tick={false} axisLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: "var(--popover-foreground)" }}
                formatter={(value) => [format(Number(value)), metricLabel]}
              />
              <Radar
                name={metricLabel}
                dataKey="value"
                stroke="var(--positive)"
                strokeWidth={2}
                fill="var(--primary)"
                fillOpacity={0.25}
                dot={{ r: 4, fill: "var(--positive)", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div
        className={`mt-5 min-w-0 ${values.length >= 3 ? "sm:hidden" : ""}`}
        style={{ height: Math.max(150, values.length * 64 + 30) }}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 260, height: 240 }}
        >
          <BarChart
            data={values}
            layout="vertical"
            margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
            accessibilityLayer
            aria-label={`Category ${metricLabel}; exact values are listed below`}
            title={`Category ${metricLabel}; exact values are listed below`}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              domain={[0, maximum]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickCount={3}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={85}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10, width: 80 }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: "var(--primary)", fillOpacity: 0.1 }}
              contentStyle={tooltipStyle}
              itemStyle={{ color: "var(--popover-foreground)" }}
              formatter={(value) => [format(Number(value)), metricLabel]}
            />
            <Bar
              dataKey="value"
              name={metricLabel}
              fill="var(--positive)"
              radius={[0, 5, 5, 0]}
              maxBarSize={14}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {metric === "elo"
          ? `Elo scale: 0–${maximum.toLocaleString("en-US")}. Higher is better.`
          : "Win rate: 0–100%. Higher is better."}
      </p>
    </div>
  );
}
