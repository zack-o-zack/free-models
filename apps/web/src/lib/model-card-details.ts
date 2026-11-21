import type { CatalogueModel } from "@/lib/model-types";
import { modelHasZdr } from "@/lib/provider-compliance";

const OUTPUT_DETAIL_TYPES = new Set(["image", "speech", "realtime", "video"]);

export interface ModelCardDetails {
  readonly embeddingDimensions: string | null;
  readonly outputs: string | null;
  readonly zdr: boolean;
}

const titleCase = (value: string) =>
  value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function formatEmbeddingDimensions(dimensions: readonly number[]): string | null {
  const sizes = dimensions.filter((size) => Number.isSafeInteger(size) && size > 0);
  if (sizes.length === 0) return null;
  const format = new Intl.NumberFormat("en").format;
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  return min === max ? `${format(max)} dims` : `${format(min)}–${format(max)} dims`;
}

/** Picks the modality-specific facts a model card shows next to the shared metrics. */
export function getModelCardDetails(
  model: Pick<
    CatalogueModel,
    "id" | "modelType" | "embeddingDimensions" | "outputModalities" | "connections"
  >,
): ModelCardDetails {
  return {
    embeddingDimensions:
      model.modelType === "embedding" ? formatEmbeddingDimensions(model.embeddingDimensions) : null,
    outputs:
      model.modelType &&
      OUTPUT_DETAIL_TYPES.has(model.modelType) &&
      model.outputModalities.length > 0
        ? model.outputModalities.map(titleCase).join(", ")
        : null,
    zdr: modelHasZdr(model),
  };
}
