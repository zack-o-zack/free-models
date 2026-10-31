import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { catalogueContractViolations } from "../src/catalogue/contract.ts";
import { cataloguePaths } from "../src/catalogue/files.ts";
import { JsonCatalogueRenderer } from "../src/catalogue/render.ts";
import { catalogueSchema, topicOverridesSchema } from "../src/catalogue/schema.ts";
import { loadCatalogueState } from "../src/catalogue/state.ts";
import { providerRegistry } from "../src/providers/registry.ts";

const workspace = resolve(import.meta.dir, "..");
const architecture = (input: string[], output: string[]) => ({
  input_modalities: input,
  output_modalities: output,
});

describe("model type contract", () => {
  test("accepts models that keep their promised fields", () => {
    expect(
      catalogueContractViolations([
        {
          id: "acme/chat",
          model_type: "chat",
          architecture: architecture(["text"], ["text"]),
          topics: ["programming"],
        },
        {
          id: "acme/embed",
          model_type: "embedding",
          description: "A 768-dimensional model.",
          architecture: architecture(["text"], ["embeddings"]),
          embedding_dimensions: [768],
        },
        { id: "acme/search", model_type: "tool" },
        { id: "acme/unknown" },
      ]),
    ).toEqual([]);
  });

  test("flags qualifying modalities without model_type", () => {
    expect(
      catalogueContractViolations([
        { id: "acme/chat", architecture: architecture(["text"], ["text"]) },
      ]),
    ).toEqual(["acme/chat has chat modalities but no model_type"]);
  });

  test("flags a missing field promised for the model type", () => {
    expect(
      catalogueContractViolations([
        { id: "acme/stt", model_type: "transcription" },
        {
          id: "acme/embed",
          model_type: "embedding",
          description: "Outputs 1,024-dimensional vectors.",
          architecture: architecture(["text"], ["embeddings"]),
        },
        {
          id: "acme/chat",
          model_type: "chat",
          architecture: architecture(["text"], ["text"]),
          topics: ["cooking"],
        },
      ]),
    ).toEqual([
      "acme/stt is transcription but has no architecture.input_modalities",
      "acme/stt is transcription but has no architecture.output_modalities",
      "acme/embed states embedding dimensions but has no embedding_dimensions",
      "acme/chat has invalid topics",
    ]);
  });
});

describe("repository catalogue", () => {
  test("every topic override names a canonical model", async () => {
    const paths = cataloguePaths(workspace);
    const canonicalIds = new Set(
      ((await Bun.file(paths.canonicalModels).json()) as { models: { id: string }[] }).models.map(
        ({ id }) => id,
      ),
    );
    const { overrides } = topicOverridesSchema.parse(await Bun.file(paths.topics).json());
    expect(Object.keys(overrides).filter((id) => !canonicalIds.has(id))).toEqual([]);
  });

  test("rendered models keep the model type contract", async () => {
    const state = await loadCatalogueState(cataloguePaths(workspace), providerRegistry);
    const catalogue = catalogueSchema.parse(JSON.parse(new JsonCatalogueRenderer().render(state)));
    expect(catalogueContractViolations(catalogue.models)).toEqual([]);
  });
});
