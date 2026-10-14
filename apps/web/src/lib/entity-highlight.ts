import type { ModelSummary } from "./model-types";

type EntityHighlight = { label: string; value: number; unit?: string };

export function getEntityHighlight(models: ModelSummary[]): EntityHighlight | null {
  for (const [key, label] of [
    ["intelligenceScore", "Highest Intelligence Index"],
    ["codingScore", "Highest Coding Index"],
    ["agenticScore", "Highest Agentic Index"],
  ] as const) {
    const scores = models
      .map((model) => model[key])
      .filter((score): score is number => typeof score === "number" && Number.isFinite(score));
    if (scores.length > 0) return { label, value: Math.max(...scores) };
  }

  const benchmarked = models.filter((model) =>
    model.designArena.some((benchmark) =>
      [benchmark.elo, benchmark.rank, benchmark.winRate].some(
        (score) => typeof score === "number" && Number.isFinite(score),
      ),
    ),
  ).length;
  if (benchmarked > 0) {
    return { label: "With Design Arena benchmarks", value: benchmarked, unit: "models" };
  }

  const media = new Set(["image", "audio", "video", "speech"]);
  const multimodal = models.filter((model) =>
    [...model.inputModalities, ...model.outputModalities].some((modality) => media.has(modality)),
  ).length;
  if (multimodal > 0)
    return { label: "Multimodal capabilities", value: multimodal, unit: "models" };

  const contexts = models
    .map((model) => model.contextLength)
    .filter((context) => Number.isFinite(context) && context > 0);
  return contexts.length > 0
    ? { label: "Largest context window", value: Math.max(...contexts), unit: "tokens" }
    : null;
}
