import { describe, expect, test } from "bun:test";
import { formatEmbeddingDimensions, getModelCardDetails } from "../src/lib/model-card-details";

const base = {
  id: "maker/model",
  modelType: "chat",
  topics: [] as string[],
  embeddingDimensions: [] as number[],
  outputModalities: ["text"],
  connections: [] as { provider: string }[],
};

describe("model card details", () => {
  test("shows at most three topics with labels", () => {
    expect(
      getModelCardDetails({
        ...base,
        topics: ["programming", "agents", "math", "creative_writing"],
      }).topics,
    ).toEqual([
      { value: "programming", label: "Programming" },
      { value: "agents", label: "Agents" },
      { value: "math", label: "Math" },
    ]);
  });

  test("shows embedding dimensions only for embedding models", () => {
    expect(
      getModelCardDetails({ ...base, modelType: "embedding", embeddingDimensions: [1024] })
        .embeddingDimensions,
    ).toBe("1,024 dims");
    expect(
      getModelCardDetails({ ...base, embeddingDimensions: [1024] }).embeddingDimensions,
    ).toBeNull();
    expect(formatEmbeddingDimensions([256, 1024, 512])).toBe("256–1,024 dims");
    expect(formatEmbeddingDimensions([])).toBeNull();
  });

  test("shows output modalities for image and speech models", () => {
    expect(
      getModelCardDetails({ ...base, modelType: "image", outputModalities: ["image", "text"] })
        .outputs,
    ).toBe("Image, Text");
    expect(
      getModelCardDetails({ ...base, modelType: "speech", outputModalities: ["audio"] }).outputs,
    ).toBe("Audio");
    expect(getModelCardDetails(base).outputs).toBeNull();
  });

  test("flags zero data retention from any provider", () => {
    expect(getModelCardDetails(base).zdr).toBe(false);
    expect(
      getModelCardDetails({
        ...base,
        connections: [
          {
            provider: "acme",
            compliance: { zdr: true, noTraining: true, dataRetention: false, countries: [] },
          },
        ] as never,
      }).zdr,
    ).toBe(true);
  });
});
