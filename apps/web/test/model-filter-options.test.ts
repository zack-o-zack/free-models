import { expect, test } from "bun:test";
import { getModelFilterOptions } from "../src/lib/model-filter-options";

test("filters expose new catalogue values without configured options or context caps", () => {
  const options = getModelFilterOptions([
    {
      inputModalities: ["point_cloud", "text"],
      outputModalities: ["mesh"],
      contextLength: 4_000_000,
    },
    { inputModalities: ["text"], outputModalities: ["mesh", "speech"], contextLength: 512 },
  ]);
  expect(options.inputs).toEqual([
    { value: "point_cloud", label: "Point Cloud" },
    { value: "text", label: "Text" },
  ]);
  expect(options.outputs.map(({ value }) => value)).toEqual(["mesh", "speech"]);
  expect(options.contextSteps).toEqual([0, 512, 4_000_000]);
});

test("empty catalogues and missing context have a safe unfiltered range", () => {
  expect(getModelFilterOptions([])).toEqual({
    inputs: [],
    outputs: [],
    contextSteps: [0],
    regions: [],
    categories: [],
    topics: [],
    zdrCount: 0,
  });
  expect(
    getModelFilterOptions([
      { inputModalities: [], outputModalities: [], contextLength: 0 },
      { inputModalities: [], outputModalities: [], contextLength: Number.NaN },
    ]).contextSteps,
  ).toEqual([0]);
});

test("computes region and ZDR counts from model connections", () => {
  const options = getModelFilterOptions([
    {
      id: "model-zdr",
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextLength: 4096,
      connections: [
        {
          provider: "cloudflare",
          compliance: {
            zdr: true,
            noTraining: true,
            dataRetention: false,
            countries: ["US", "EU"],
          },
        },
      ],
    },
    {
      id: "model-retained",
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextLength: 8192,
      connections: [
        {
          provider: "groq",
          compliance: {
            zdr: false,
            noTraining: true,
            dataRetention: true,
            countries: ["US"],
          },
        },
      ],
    },
  ]);

  expect(options.zdrCount).toBe(1);
  expect(options.regions).toEqual([
    { value: "US", label: "United States", flag: "🇺🇸", count: 2 },
    { value: "EU", label: "European Union", flag: "🇪🇺", count: 1 },
  ]);
});

test("counts categories from model types and skips untyped models", () => {
  const options = getModelFilterOptions([
    {
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextLength: 4096,
      modelType: "chat",
    },
    {
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextLength: 8192,
      modelType: "chat",
    },
    {
      inputModalities: ["text"],
      outputModalities: ["embeddings"],
      contextLength: 0,
      modelType: "embedding",
    },
    { inputModalities: ["text"], outputModalities: ["text"], contextLength: 0, modelType: null },
  ]);

  expect(options.categories).toEqual([
    { value: "chat", label: "Chat", count: 2 },
    { value: "embedding", label: "Embedding", count: 1 },
  ]);
});

test("counts topics per model and sorts them by count, then label", () => {
  const options = getModelFilterOptions([
    {
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextLength: 4096,
      topics: ["programming", "agents"],
    },
    {
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextLength: 8192,
      topics: ["programming", "creative_writing", "programming"],
    },
    { inputModalities: ["text"], outputModalities: ["text"], contextLength: 0, topics: [] },
    { inputModalities: ["text"], outputModalities: ["text"], contextLength: 0 },
  ]);

  expect(options.topics).toEqual([
    { value: "programming", label: "Programming", count: 2 },
    { value: "agents", label: "Agents", count: 1 },
    { value: "creative_writing", label: "Creative Writing", count: 1 },
  ]);
});
