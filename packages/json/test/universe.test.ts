import { describe, expect, test } from "bun:test";
import { loadOpenRouterUniverse } from "../src/automation/universe.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("OpenRouter universe", () => {
  test("keeps valid entries, skips malformed ones and routers, and carries recall fields", async () => {
    const universe = await loadOpenRouterUniverse(async () =>
      json({
        data: [
          {
            id: "reflection/beam-1.0-501b-a23b",
            name: "Reflection: Beam 1.0",
            canonical_slug: "reflection/beam-1.0-501b-a23b-20261016",
            hugging_face_id: null,
            context_length: 1048576,
          },
          { id: "openrouter/auto", name: "Auto" },
          { name: "missing id" },
        ],
      }),
    );

    expect(universe).toEqual([
      {
        id: "reflection/beam-1.0-501b-a23b",
        name: "Reflection: Beam 1.0",
        canonical_slug: "reflection/beam-1.0-501b-a23b-20261016",
        context_length: 1048576,
      },
    ]);
  });

  test("throws on HTTP failure so the caller can skip recall", async () => {
    await expect(loadOpenRouterUniverse(async () => json({}, 503))).rejects.toThrow("HTTP 503");
  });

  test("throws when no usable model remains", async () => {
    await expect(loadOpenRouterUniverse(async () => json({ data: [] }))).rejects.toThrow(
      "no usable models",
    );
  });
});
