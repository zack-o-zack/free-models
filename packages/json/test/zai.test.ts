import { expect, test } from "bun:test";
import {
  parseZaiPricing,
  ZAI_API_BASE_URL,
  ZAI_PRICING_URL,
  ZaiProvider,
} from "../src/providers/zai.ts";

const header =
  "| Model | Input | Cached Input | Cached Input Storage | Output |\n| :- | :- | :- | :- | :- |";

test("discovers free text and vision models, excluding paid inference and cache", async () => {
  const provider = new ZaiProvider({
    fetch: async (url) => {
      expect(url).toBe(`${ZAI_PRICING_URL}.md`);
      return new Response(`${header}
| GLM-4.7-Flash | Free | Free | Free | Free |
| GLM-5.3 | $1.4 | $0.26 | Limited-time Free | $4.4 |
| GLM-paid-output | Free | Free | Free | $1 |
| GLM-paid-cache | Free | $1 | Free | Free |

### Vision Models
${header}
| GLM-4.6V-Flash | Free | Free | Free | Free |`);
    },
  });
  const offers = await provider.discover(new Map());
  expect(offers.map((offer) => offer.model_id)).toEqual(["glm-4.6v-flash", "glm-4.7-flash"]);
  expect(offers[0]?.connection).toEqual({
    base_url: ZAI_API_BASE_URL,
    protocol: "openai",
    auth: { env: ["ZAI_API_KEY"] },
  });
  expect(offers[0]?.limits.terms.length).toBeGreaterThan(0);
});

test("discovers free models inside blockquoted tables", () => {
  const markdown = `> ## Documentation Index
>
> **Other Pricing**
>
> ### Text Models
>
> | Model | Input | Cached Input | Cached Input Storage | Output |
> | :- | :- | :- | :- | :- |
> | GLM-4.7-Flash | Free | Free | Free | Free |
> | GLM-4.5-Flash | Free | Free | Free | Free |
>
> ### Vision Models
>
> | Model | Input | Cached Input | Cached Input Storage | Output |
> | :- | :- | :- | :- | :- |
> | GLM-4.6V-Flash | Free | Free | Free | Free |`;
  expect(parseZaiPricing(markdown)).toEqual(["GLM-4.5-Flash", "GLM-4.6V-Flash", "GLM-4.7-Flash"]);
});

test("returns no offers when all documented models become paid", () => {
  expect(parseZaiPricing(`${header}\n| GLM-4.7-Flash | $1 | $1 | Free | $1 |`)).toEqual([]);
});

test("rejects unrecognized pages, malformed rows, and duplicate IDs", () => {
  expect(() => parseZaiPricing("<html>Service unavailable</html>")).toThrow("no recognized");
  expect(() => parseZaiPricing(`${header}\n| GLM-free | Free |`)).toThrow("malformed");
  expect(() =>
    parseZaiPricing(
      `${header}\n| GLM-free | Free | Free | Free | Free |\n| glm-free | Free | Free | Free | Free |`,
    ),
  ).toThrow("duplicate");
});

test("reports HTTP failures instead of replacing the saved offers", async () => {
  const provider = new ZaiProvider({
    fetch: async () => new Response("Unavailable", { status: 503 }),
  });
  await expect(provider.discover(new Map())).rejects.toThrow("HTTP status 503");
});
