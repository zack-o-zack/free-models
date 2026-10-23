import { describe, expect, test } from "bun:test";
import {
  canonicalModelWithGeneratedFields,
  normalizeCanonicalMetadata,
  normalizeCanonicalModelName,
} from "../src/catalogue/canonical.ts";

describe("canonical model names", () => {
  test("remove free access qualifiers from trailing name suffixes", () => {
    const cases = [
      ["Alpha (free)", "Alpha"],
      ["Alpha Free", "Alpha"],
      ["Alpha-free", "Alpha"],
      ["Alpha:free", "Alpha"],
      ["Alpha: free", "Alpha"],
      ["Alpha Free (free)", "Alpha"],
    ] as const;

    for (const [name, expected] of cases) {
      expect(normalizeCanonicalModelName(name)).toBe(expected);
    }
  });

  test("normalizes the reviewed identity while protecting it from generated fields", () => {
    expect(
      canonicalModelWithGeneratedFields(
        { id: "acme/alpha", name: "Alpha (free)" },
        { name: "Provider Alpha (free)", description: "Generated metadata" },
      ),
    ).toEqual({
      id: "acme/alpha",
      name: "Alpha",
      description: "Generated metadata",
    });
  });

  test("normalizes embedding output modalities to embeddings", () => {
    expect(
      normalizeCanonicalMetadata({
        architecture: {
          input_modalities: ["text"],
          output_modalities: ["embedding"],
        },
      }),
    ).toEqual({
      architecture: {
        input_modalities: ["text"],
        output_modalities: ["embeddings"],
      },
    });

    expect(
      canonicalModelWithGeneratedFields(
        { id: "baai/bge-small-en-v1.5", name: "BGE Small" },
        {
          architecture: {
            input_modalities: ["text"],
            output_modalities: ["embedding"],
          },
        },
      ),
    ).toEqual({
      id: "baai/bge-small-en-v1.5",
      name: "BGE Small",
      architecture: {
        input_modalities: ["text"],
        output_modalities: ["embeddings"],
      },
    });
  });

  test("normalizes speech output and input modalities to audio", () => {
    expect(
      normalizeCanonicalMetadata({
        architecture: {
          input_modalities: ["text", "speech"],
          output_modalities: ["speech"],
        },
      }),
    ).toEqual({
      architecture: {
        input_modalities: ["text", "audio"],
        output_modalities: ["audio"],
      },
    });

    expect(
      normalizeCanonicalMetadata({
        architecture: {
          input_modalities: ["text"],
          output_modalities: ["audio", "speech"],
        },
      }),
    ).toEqual({
      architecture: {
        input_modalities: ["text"],
        output_modalities: ["audio"],
      },
    });

    expect(
      canonicalModelWithGeneratedFields(
        { id: "hexgrad/kokoro-82m", name: "Kokoro 82M" },
        {
          architecture: {
            input_modalities: ["text"],
            output_modalities: ["speech"],
          },
        },
      ),
    ).toEqual({
      id: "hexgrad/kokoro-82m",
      name: "Kokoro 82M",
      architecture: {
        input_modalities: ["text"],
        output_modalities: ["audio"],
      },
    });
  });

  test("normalizes document and pdf output and input modalities to file", () => {
    expect(
      normalizeCanonicalMetadata({
        architecture: {
          input_modalities: ["text", "pdf", "document", "file"],
          output_modalities: ["document", "pdf"],
        },
      }),
    ).toEqual({
      architecture: {
        input_modalities: ["text", "file"],
        output_modalities: ["file"],
      },
    });

    expect(
      canonicalModelWithGeneratedFields(
        { id: "mistralai/mistral-ocr-2512", name: "Mistral OCR" },
        {
          architecture: {
            input_modalities: ["image", "document"],
            output_modalities: ["text", "pdf"],
          },
        },
      ),
    ).toEqual({
      id: "mistralai/mistral-ocr-2512",
      name: "Mistral OCR",
      architecture: {
        input_modalities: ["image", "file"],
        output_modalities: ["text", "file"],
      },
    });
  });
});
