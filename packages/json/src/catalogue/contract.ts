import { deriveEmbeddingDimensions, deriveModelType } from "./derived.ts";
import type { JsonValue } from "./schema.ts";
import { MODEL_TOPIC_SLUGS } from "./topics.ts";

/** Model types whose task interface is defined by input and output modalities. */
export const MODALITY_MODEL_TYPES: ReadonlySet<string> = new Set([
  "chat",
  "decision",
  "embedding",
  "image",
  "moderation",
  "realtime",
  "reranking",
  "speech",
  "transcription",
  "video",
]);

type RenderedModel = { readonly id: string } & Readonly<Record<string, JsonValue>>;

/**
 * Lists every way the rendered models break the fields the catalogue promises per model type:
 * - a model whose output modalities map to a type has `model_type`;
 * - a modality-defined type has non-empty input and output modalities;
 * - an embedding model whose description states vector sizes has `embedding_dimensions`;
 * - `topics`, when present, is a non-empty list of known slugs.
 */
export function catalogueContractViolations(models: readonly RenderedModel[]): string[] {
  const violations: string[] = [];
  for (const model of models) {
    const modelType = typeof model.model_type === "string" ? model.model_type : undefined;
    const derivedType = deriveModelType(model);
    if (!modelType && derivedType) {
      violations.push(`${model.id} has ${derivedType} modalities but no model_type`);
    }

    if (modelType && MODALITY_MODEL_TYPES.has(modelType)) {
      for (const key of ["input_modalities", "output_modalities"]) {
        if (!nonEmptyStrings(objectField(model.architecture, key))) {
          violations.push(`${model.id} is ${modelType} but has no architecture.${key}`);
        }
      }
    }

    if (
      modelType === "embedding" &&
      model.embedding_dimensions === undefined &&
      deriveEmbeddingDimensions(model.description).length > 0
    ) {
      violations.push(`${model.id} states embedding dimensions but has no embedding_dimensions`);
    }

    if (model.topics !== undefined) {
      const topics = model.topics;
      if (!nonEmptyStrings(topics) || topics.some((topic) => !MODEL_TOPIC_SLUGS.has(topic))) {
        violations.push(`${model.id} has invalid topics`);
      }
    }
  }
  return violations;
}

function objectField(value: JsonValue | undefined, key: string): JsonValue | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value[key] : undefined;
}

function nonEmptyStrings(value: JsonValue | undefined): value is string[] {
  return (
    Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string")
  );
}
