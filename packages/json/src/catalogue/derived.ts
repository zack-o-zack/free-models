import type { JsonValue } from "./schema.ts";
import { assignModelTopics } from "./topics.ts";

/**
 * Fields that render derives from the catalogue's own metadata, so each render keeps them
 * current for new and changed models. Source `model_type` and `embedding_dimensions` win over
 * derived values; `topics` is always recomputed from the rules and `catalogue/topics.json`.
 */
export function withDerivedFields<
  T extends { id: string; name: string } & Record<string, JsonValue>,
>(
  model: T,
  topicOverrides: ReadonlyMap<string, readonly string[]> = new Map(),
): T & Record<string, JsonValue> {
  const result: Record<string, JsonValue> = { ...model };

  const modelType =
    typeof model.model_type === "string" ? model.model_type : deriveModelType(model);
  if (modelType) {
    result.model_type = modelType;
  }

  if (result.model_type === "embedding" && model.embedding_dimensions === undefined) {
    const dimensions = deriveEmbeddingDimensions(model.description);
    if (dimensions.length > 0) {
      result.embedding_dimensions = dimensions;
    }
  }

  const topics = assignModelTopics(
    { id: model.id, name: model.name, description: model.description, model_type: modelType },
    topicOverrides,
  );
  delete result.topics;
  if (topics.length > 0) {
    result.topics = topics;
  }

  return result as T & Record<string, JsonValue>;
}

/** Maps normalized output modalities to the `model_type` vocabulary the sources already use. */
export function deriveModelType(model: Readonly<Record<string, JsonValue>>): string | undefined {
  const architecture = model.architecture;
  if (!architecture || typeof architecture !== "object" || Array.isArray(architecture)) {
    return undefined;
  }
  const modalities = (key: string) => {
    const value = architecture[key];
    return new Set(Array.isArray(value) ? value.filter((item) => typeof item === "string") : []);
  };
  const inputs = modalities("input_modalities");
  const outputs = modalities("output_modalities");

  if (outputs.has("embeddings")) return "embedding";
  if (outputs.has("rerank")) return "reranking";
  if (outputs.has("transcription")) return "transcription";
  if (outputs.has("decisions")) return "decision";
  if (outputs.has("scores")) return "moderation";
  if (outputs.has("audio")) {
    return outputs.has("text") && inputs.has("audio") ? "realtime" : "speech";
  }
  if (outputs.has("video")) return "video";
  if (outputs.has("image")) return "image";
  if (outputs.has("text")) return "chat";
  return undefined;
}

/** Reads explicit vector sizes such as "768-dimensional" or "supporting 1024, 512, and 256 dimensions". */
export function deriveEmbeddingDimensions(description: JsonValue | undefined): number[] {
  if (typeof description !== "string") {
    return [];
  }
  const sizes = new Set<number>();
  for (const match of description.matchAll(/\b(\d{1,2},?\d{3}|\d{3})-dimensional\b/g)) {
    sizes.add(Number(match[1]?.replace(",", "")));
  }
  const listed = /\bsupporting ((?:\d{3,4}, )+(?:and )?\d{3,4}) dimensions\b/.exec(description);
  for (const size of listed?.[1]?.match(/\d{3,4}/g) ?? []) {
    sizes.add(Number(size));
  }
  return [...sizes].filter((size) => Number.isSafeInteger(size) && size > 0).sort((a, b) => b - a);
}
