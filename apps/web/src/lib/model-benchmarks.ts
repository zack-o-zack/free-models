import type { ModelSummary } from "./model-types";

export interface BenchmarkComparison {
  label: string;
  score: number;
  percentile: number | null;
  peerCount: number;
  bins: { start: number; count: number }[];
  minimum: number;
  maximum: number;
}

export function getBenchmarkComparisons(
  model: ModelSummary,
  models: ModelSummary[],
): BenchmarkComparison[] {
  return (
    [
      { key: "intelligenceScore", label: "Intelligence Index" },
      { key: "codingScore", label: "Coding Index" },
      { key: "agenticScore", label: "Agentic Index" },
    ] as const
  ).flatMap(({ key, label }) => {
    const score = model[key];
    if (score === null || !Number.isFinite(score)) return [];
    const peers = models.flatMap((entry) => {
      const value = entry[key];
      return entry.id !== model.id && value !== null && Number.isFinite(value) ? [value] : [];
    });
    const minimum = Math.min(0, Math.floor(Math.min(score, ...peers) / 10) * 10);
    const maximum = Math.max(minimum + 10, Math.ceil(Math.max(score, ...peers) / 10) * 10);
    const bins = Array<number>(20).fill(0);
    for (const value of peers) {
      const index = Math.min(
        bins.length - 1,
        Math.floor(((value - minimum) / (maximum - minimum)) * bins.length),
      );
      bins[index] += 1;
    }
    return [
      {
        label,
        score,
        bins: bins.map((count, index) => ({
          start: minimum + (index * (maximum - minimum)) / bins.length,
          count,
        })),
        minimum,
        maximum,
        peerCount: peers.length,
        percentile:
          peers.length > 0
            ? Math.floor((peers.filter((value) => value < score).length / peers.length) * 100)
            : null,
      },
    ];
  });
}
