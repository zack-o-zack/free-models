import { describe, expect, test } from "bun:test";
import {
  CLOUDFLARE_WORKERS_AI_BASE_URL,
  CLOUDFLARE_WORKERS_AI_PRICING_URL,
  CloudflareProvider,
} from "../src/providers/cloudflare.ts";
import {
  GEMINI_API_BASE_URL,
  GEMINI_PRICING_URL,
  GeminiProvider,
} from "../src/providers/gemini.ts";
import { GROQ_API_BASE_URL, GroqProvider } from "../src/providers/groq.ts";
import {
  MISTRAL_API_BASE_URL,
  MISTRAL_MODELS_URL,
  MistralProvider,
} from "../src/providers/mistral.ts";
import { NVIDIA_API_BASE_URL, NvidiaProvider, nvidiaModelsUrl } from "../src/providers/nvidia.ts";

describe("Groq discovery", () => {
  test("returns no offers when only Developer-plan limits are published", async () => {
    const provider = new GroqProvider({
      fetch: async () =>
        new Response(`
<table>
  <tr><th><button>Free Plan Limits</button><button class="happy">Developer Plan Limits</button></th></tr>
  <tr><th>MODEL ID</th><th>RPM</th><th>RPD</th><th>TPM</th><th>TPD</th><th>ASH</th><th>ASD</th></tr>
</table>
<table>
  <tr><td>paid/model</td><td>30</td><td>1,000</td><td>8,000</td><td>200,000</td><td>-</td><td>-</td></tr>
</table>
`),
    });

    expect(await provider.discover()).toEqual([]);
  });

  test("rejects an unlabeled plan limits table", async () => {
    const provider = new GroqProvider({
      fetch: async () =>
        new Response(`
<table>
  <tr><th>MODEL ID</th><th>RPM</th><th>RPD</th><th>TPM</th><th>TPD</th><th>ASH</th><th>ASD</th></tr>
</table>
<table>
  <tr><td>unknown/model</td><td>30</td><td>1,000</td><td>6,000</td><td>500,000</td><td>-</td><td>-</td></tr>
</table>
`),
    });

    expect(provider.discover()).rejects.toThrow("unique active plan");
  });

  test("discovers model IDs and quotas from the official free-plan table", async () => {
    const provider = new GroqProvider({
      fetch: async (url, init) => {
        expect(url).toBe("https://console.groq.com/docs/rate-limits");
        expect(new Headers(init?.headers).get("accept")).toBe("text/html,application/xhtml+xml");
        return new Response(`
<table>
  <thead>
    <tr><th><button class="happy">Free Plan Limits</button><button>Developer Plan Limits</button></th></tr>
    <tr><th>MODEL ID</th><th>RPM</th><th>RPD</th><th>TPM</th><th>TPD</th><th>ASH</th><th>ASD</th></tr>
  </thead>
</table>
<table>
  <tbody>
    <tr><td>alpha/model</td><td>30</td><td>1,000</td><td>6,000</td><td>500,000</td><td>-</td><td>-</td></tr>
    <tr><td>beta/model</td><td>10</td><td>100</td><td>2,000</td><td>20,000</td><td>5</td><td>20</td></tr>
  </tbody>
</table>
`);
      },
    });

    expect(await provider.discover()).toEqual([
      {
        model_id: "alpha/model",
        connection: { base_url: GROQ_API_BASE_URL },
        metadata: { rate_limits: { rpm: "30", rpd: "1,000", tpm: "6,000", tpd: "500,000" } },
      },
      {
        model_id: "beta/model",
        connection: { base_url: GROQ_API_BASE_URL },
        metadata: {
          rate_limits: {
            rpm: "10",
            rpd: "100",
            tpm: "2,000",
            tpd: "20,000",
            ash: "5",
            asd: "20",
          },
        },
      },
    ]);
  });
});

describe("Mistral discovery", () => {
  test("uses a free-mode account catalogue and excludes custom or archived models", async () => {
    const provider = new MistralProvider({
      apiKey: "free-mode-secret",
      fetch: async (url, init) => {
        expect(url).toBe(MISTRAL_MODELS_URL);
        expect(new Headers(init?.headers).get("authorization")).toBe("Bearer free-mode-secret");
        return Response.json({
          object: "list",
          data: [
            { id: "mistral-small", object: "model", owned_by: "mistralai" },
            { id: "archived-model", archived: true },
            { id: "ft:custom", type: "fine-tuned" },
          ],
        });
      },
    });

    expect(await provider.discover()).toEqual([
      {
        model_id: "mistral-small",
        connection: { base_url: MISTRAL_API_BASE_URL },
        metadata: { object: "model", owned_by: "mistralai" },
      },
    ]);
  });

  test("requires a key explicitly scoped to an organization in Free mode", async () => {
    const provider = new MistralProvider({ apiKey: "" });
    expect(provider.discover()).rejects.toThrow("MISTRAL_FREE_API_KEY");
  });
});

describe("Gemini API discovery", () => {
  test("uses only model sections whose standard pricing table offers free inference", async () => {
    const provider = new GeminiProvider({
      fetch: async (url) => {
        expect(url).toBe(GEMINI_PRICING_URL);
        return new Response(geminiPricingFixture());
      },
    });

    expect(await provider.discover()).toEqual([
      {
        model_id: "gemini-free",
        connection: { base_url: GEMINI_API_BASE_URL },
        metadata: {
          name: "Gemini Free",
          free_tier: {
            input_price: "Free of charge",
            output_price_including_thinking_tokens: "Free of charge",
            used_to_improve_our_products: "Yes",
          },
        },
      },
    ]);
  });
});

describe("NVIDIA Build discovery", () => {
  test("keeps only catalogue resources explicitly labeled Free Endpoint", async () => {
    const provider = new NvidiaProvider({
      fetch: async (url) => {
        expect(url).toBe(nvidiaModelsUrl(0));
        return Response.json({
          resultPageTotal: 1,
          resultTotal: 2,
          results: [
            {
              groupValue: "ENDPOINT",
              resources: [
                nvidiaResource("free", ["Download Available", "Free Endpoint"]),
                nvidiaResource("partner", ["Partner Endpoint"]),
              ],
            },
          ],
        });
      },
    });

    expect(await provider.discover()).toEqual([
      {
        model_id: "nvidia/free",
        connection: { base_url: NVIDIA_API_BASE_URL },
        metadata: {
          name: "Free Model",
          publisher: "nvidia",
          description: "free description",
          catalogue_url: "https://build.nvidia.com/nvidia/free",
          endpoint_tier: "Free Endpoint",
        },
      },
    ]);
  });
});

describe("Cloudflare Workers AI discovery", () => {
  test("applies the recurring allocation to priced models except paid-only entries", async () => {
    const provider = new CloudflareProvider({
      fetch: async (url) => {
        expect(url).toBe(CLOUDFLARE_WORKERS_AI_PRICING_URL);
        return new Response(`
Our free allocation allows anyone to use a total of **12,345 Neurons per day at no charge**.

Some models require a paid billing method. This applies to \`@cf/paid/model\`.

## LLM model pricing

| Model | Price | Neurons |
| --- | --- | --- |
| @cf/free/model | $0.10 per M tokens | 9,000 neurons per M tokens |
| @cf/paid/model | $1.00 per M tokens | 90,000 neurons per M tokens |
`);
      },
    });

    expect(await provider.discover()).toEqual([
      {
        model_id: "@cf/free/model",
        connection: { base_url: CLOUDFLARE_WORKERS_AI_BASE_URL },
        metadata: {
          free_allocation: "12,345 Neurons per day",
          pricing_category: "LLM model pricing",
          pricing: {
            price: "$0.10 per M tokens",
            neurons: "9,000 neurons per M tokens",
          },
        },
      },
    ]);
  });

  test("fails closed when the paid-only declaration disappears", async () => {
    const provider = new CloudflareProvider({
      fetch: async () =>
        new Response("Our free allocation is **10,000 Neurons per day at no charge**."),
    });
    expect(provider.discover()).rejects.toThrow("paid-only model declaration");
  });

  test("fails closed when the free allocation is ambiguous", async () => {
    const provider = new CloudflareProvider({
      fetch: async () =>
        new Response(`
**10,000 Neurons per day at no charge**
**20,000 Neurons per day at no charge**
`),
    });
    expect(provider.discover()).rejects.toThrow("no unique recognized free daily allocation");
  });
});

function geminiPricingFixture(): string {
  return `
<main>
  <div class="models-section"><h2>Gemini Free</h2><code>gemini-free</code></div>
  ${pricingTable("Free of charge", "Free of charge")}
  <h3>Batch</h3>
  ${pricingTable("Not available", "Not available")}
  <div class="models-section"><h2>Gemini Paid</h2><code>gemini-paid</code></div>
  ${pricingTable("Not available", "Not available")}
</main>`;
}

function pricingTable(input: string, output: string): string {
  return `
<table class="pricing-table">
  <tr><th></th><th>Free Tier</th><th>Paid Tier</th></tr>
  <tr><td>Input price</td><td>${input}</td><td>$1</td></tr>
  <tr><td>Output price (including thinking tokens)</td><td>${output}</td><td>$2</td></tr>
  <tr><td>Used to improve our products</td><td>Yes</td><td>No</td></tr>
</table>`;
}

function nvidiaResource(name: string, nimTypes: string[]): Record<string, unknown> {
  return {
    name,
    displayName: `${name[0]?.toUpperCase()}${name.slice(1)} Model`,
    description: `${name} description`,
    labels: [
      { key: "nimType", values: nimTypes, unresolvedValues: [] },
      { key: "publisher", values: ["nvidia"], unresolvedValues: ["nvidia"] },
    ],
  };
}
