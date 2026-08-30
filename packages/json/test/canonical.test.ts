import { describe, expect, test } from "bun:test";
import {
  canonicalModelWithGeneratedFields,
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
});
