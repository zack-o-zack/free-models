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
  expect(getModelFilterOptions([])).toEqual({ inputs: [], outputs: [], contextSteps: [0] });
  expect(
    getModelFilterOptions([
      { inputModalities: [], outputModalities: [], contextLength: 0 },
      { inputModalities: [], outputModalities: [], contextLength: Number.NaN },
    ]).contextSteps,
  ).toEqual([0]);
});
