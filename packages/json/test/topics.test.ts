import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  deriveEmbeddingDimensions,
  deriveModelType,
  withDerivedFields,
} from "../src/catalogue/derived.ts";
import { cataloguePaths } from "../src/catalogue/files.ts";
import { loadCatalogueState } from "../src/catalogue/state.ts";
import { assignModelTopics, MODEL_TOPICS } from "../src/catalogue/topics.ts";

const chat = (description: string, id = "acme/model") => ({
  id,
  name: "Model",
  description,
  model_type: "chat",
});

describe("model topics", () => {
  test("labels are the title-cased slug", () => {
    for (const { slug, label } of MODEL_TOPICS) {
      expect<string>(label).toBe(
        slug
          .split("_")
          .map((word) => `${word[0]?.toUpperCase()}${word.slice(1)}`)
          .join(" "),
      );
    }
  });

  test("tags explicit claims in taxonomy order", () => {
    expect(
      assignModelTopics(chat("Built for legal research papers, agentic coding and mathematics.")),
    ).toEqual(["programming", "agents", "math", "research", "legal"]);
    expect(assignModelTopics(chat("Multilingual translation model."))).toEqual(["translation"]);
    expect(assignModelTopics(chat("A general assistant.", "acme/coder-7b"))).toEqual([
      "programming",
    ]);
  });

  test("returns no topic without a clear claim", () => {
    expect(assignModelTopics(chat("A fast general-purpose assistant."))).toEqual([]);
    expect(assignModelTopics({ id: "acme/model", name: "Model" })).toEqual([]);
  });

  test("ignores link targets and URLs", () => {
    expect(
      assignModelTopics(
        chat("See the [policy](https://acme.test/legal/aup) and https://acme.test/legal/terms."),
      ),
    ).toEqual([]);
  });

  test("only applies rules to language models", () => {
    expect(
      assignModelTopics({
        id: "acme/code-embed",
        name: "Code Embed",
        description: "Embeddings for code retrieval.",
        model_type: "embedding",
      }),
    ).toEqual([]);
  });

  test("curated overrides replace the rule result", () => {
    const overrides = new Map([
      ["acme/model", ["legal", "programming"]],
      ["acme/empty", []],
    ]);
    expect(assignModelTopics(chat("Coding model."), overrides)).toEqual(["programming", "legal"]);
    expect(assignModelTopics(chat("Coding model.", "acme/empty"), overrides)).toEqual([]);
    expect(
      assignModelTopics({ id: "acme/model", name: "Model", model_type: "embedding" }, overrides),
    ).toEqual(["programming", "legal"]);
  });
});

describe("derived fields", () => {
  const withModalities = (input: string[], output: string[]) => ({
    architecture: { input_modalities: input, output_modalities: output },
  });

  test("derives model_type from output modalities", () => {
    expect(deriveModelType(withModalities(["text"], ["embeddings"]))).toBe("embedding");
    expect(deriveModelType(withModalities(["text"], ["rerank"]))).toBe("reranking");
    expect(deriveModelType(withModalities(["audio"], ["transcription"]))).toBe("transcription");
    expect(deriveModelType(withModalities(["text"], ["decisions"]))).toBe("decision");
    expect(deriveModelType(withModalities(["text"], ["scores"]))).toBe("moderation");
    expect(deriveModelType(withModalities(["audio", "text"], ["audio", "text"]))).toBe("realtime");
    expect(deriveModelType(withModalities(["text"], ["audio"]))).toBe("speech");
    expect(deriveModelType(withModalities(["text"], ["video"]))).toBe("video");
    expect(deriveModelType(withModalities(["text"], ["image", "text"]))).toBe("image");
    expect(deriveModelType(withModalities(["text", "image"], ["text"]))).toBe("chat");
    expect(deriveModelType(withModalities(["text"], []))).toBeUndefined();
    expect(deriveModelType({})).toBeUndefined();
  });

  test("reads explicit embedding dimensions", () => {
    expect(deriveEmbeddingDimensions("Outputs 1,024-dimensional vectors.")).toEqual([1024]);
    expect(deriveEmbeddingDimensions("A 768-dimensional model.")).toEqual([768]);
    expect(
      deriveEmbeddingDimensions("Flexible output supporting 256, 512, and 1024 dimensions."),
    ).toEqual([1024, 512, 256]);
    expect(deriveEmbeddingDimensions("Fast embeddings.")).toEqual([]);
    expect(deriveEmbeddingDimensions(undefined)).toEqual([]);
  });

  test("keeps source values and omits empty derived values", () => {
    expect(
      withDerivedFields({
        id: "acme/embed",
        name: "Embed",
        description: "A 768-dimensional model.",
        model_type: "embedding",
        embedding_dimensions: [384],
      }),
    ).toEqual({
      id: "acme/embed",
      name: "Embed",
      description: "A 768-dimensional model.",
      model_type: "embedding",
      embedding_dimensions: [384],
    });
    expect(
      withDerivedFields({
        id: "acme/embed",
        name: "Embed",
        description: "A 768-dimensional model.",
        ...withModalities(["text"], ["embeddings"]),
      }),
    ).toMatchObject({ model_type: "embedding", embedding_dimensions: [768] });
    const plain = withDerivedFields({ id: "acme/plain", name: "Plain" });
    expect(plain).toEqual({ id: "acme/plain", name: "Plain" });
  });

  test("derives topics after model_type", () => {
    expect(
      withDerivedFields({
        id: "acme/coder",
        name: "Coder",
        ...withModalities(["text"], ["text"]),
      }),
    ).toMatchObject({ model_type: "chat", topics: ["programming"] });
  });
});

describe("topic override file", () => {
  async function loadWithOverrides(overrides: unknown): Promise<void> {
    const workspace = await mkdtemp(join(tmpdir(), "catalogue-topics-"));
    try {
      await mkdir(join(workspace, "catalogue"), { recursive: true });
      await Bun.write(
        join(workspace, "catalogue/canonical-models.json"),
        JSON.stringify({ models: [{ id: "acme/model", name: "Model" }] }),
      );
      await Bun.write(join(workspace, "catalogue/topics.json"), JSON.stringify({ overrides }));
      await loadCatalogueState(cataloguePaths(workspace), []);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }

  test("accepts known models and topics", async () => {
    await expect(loadWithOverrides({ "acme/model": ["programming"] })).resolves.toBeUndefined();
  });

  test("rejects unknown models, unknown topics and repeats", async () => {
    await expect(loadWithOverrides({ "acme/missing": [] })).rejects.toThrow(
      "Topic overrides reference unknown canonical model acme/missing",
    );
    await expect(loadWithOverrides({ "acme/model": ["cooking"] })).rejects.toThrow(
      "Topic overrides for acme/model use unknown topic cooking",
    );
    await expect(loadWithOverrides({ "acme/model": ["math", "math"] })).rejects.toThrow(
      "Topic overrides for acme/model repeat a topic",
    );
  });
});
