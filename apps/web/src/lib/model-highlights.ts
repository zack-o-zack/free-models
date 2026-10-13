import { formatContext } from "./model-format";
import type { ModelSummary } from "./model-types";

export interface ModelHighlight {
  label: string;
  detail: string;
}

export function getModelHighlights(model: ModelSummary, models: ModelSummary[]): ModelHighlight[] {
  const highlights: ModelHighlight[] = [];
  const rankings = (
    [
      { key: "codingScore", label: "coding" },
      { key: "intelligenceScore", label: "intelligence" },
      { key: "agenticScore", label: "agentic tasks" },
    ] as const
  ).flatMap(({ key, label }) => {
    const score = model[key];
    if (score === null || !Number.isFinite(score)) return [];
    const scores = models.flatMap((entry) => {
      const value = entry[key];
      return value !== null && Number.isFinite(value) ? [value] : [];
    });
    const rank = 1 + scores.filter((value) => value > score).length;
    const modelsAtOrAbove = scores.filter((value) => value >= score).length;
    if (scores.length < 10 || modelsAtOrAbove > Math.floor(scores.length / 10)) return [];
    const tied = scores.filter((value) => value === score).length > 1;
    return [
      {
        label: `${tied ? "Joint #" : "#"}${rank} for ${label}`,
        detail: `Among ${scores.length} free models with Artificial Analysis ${label} scores.`,
        relativeRank: rank / scores.length,
      },
    ];
  });

  const bestRanking = rankings.sort((a, b) => a.relativeRank - b.relativeRank)[0];
  if (bestRanking) highlights.push({ label: bestRanking.label, detail: bestRanking.detail });

  if (model.contextLength >= 1_000_000) {
    highlights.push({
      label: `${formatContext(model.contextLength)} context`,
      detail: `Accepts up to ${model.contextLength.toLocaleString("en-US")} tokens of context.`,
    });
  }

  for (const modality of ["video", "image", "audio"]) {
    if (model.outputModalities.includes(modality)) {
      highlights.push({
        label: `Generates ${modality === "image" ? "images" : modality}`,
        detail: `${modality[0].toUpperCase()}${modality.slice(1)} is a supported output format.`,
      });
    }
  }

  if (model.inputModalities.includes("video")) {
    highlights.push({ label: "Video understanding", detail: "Accepts video as input." });
  } else if (model.inputModalities.includes("audio")) {
    highlights.push({ label: "Audio understanding", detail: "Accepts audio as input." });
  }

  return highlights.slice(0, 3);
}
