import { describe, expect, test } from "bun:test";
import { desluggifyModelId } from "../src/catalogue/canonical.ts";
import { providerDocSchema } from "../src/catalogue/schema.ts";
import {
  CLOUDFLARE_WORKERS_AI_BASE_URL,
  CLOUDFLARE_WORKERS_AI_PRICING_URL,
  CloudflareProvider,
  cloudflareOfferLimits,
} from "../src/providers/cloudflare.ts";
import {
  GEMINI_API_BASE_URL,
  GEMINI_PRICING_URL,
  GeminiProvider,
} from "../src/providers/gemini.ts";
import { GROQ_API_BASE_URL, GroqProvider, groqOfferLimits } from "../src/providers/groq.ts";
import {
  geminiUnconfirmedLimits,
  mistralUnconfirmedLimits,
  openCodePublishedLimits,
  tokenRouterUnconfirmedLimits,
} from "../src/providers/limits.ts";
import {
  MISTRAL_API_BASE_URL,
  MISTRAL_MODELS_URL,
  MistralProvider,
} from "../src/providers/mistral.ts";
import {
  NVIDIA_API_BASE_URL,
  NVIDIA_LIMITS_URL,
  NvidiaProvider,
  nvidiaModelsUrl,
  parseNvidiaLimits,
} from "../src/providers/nvidia.ts";
import { providerRegistry } from "../src/providers/registry.ts";
import {
  parseTokenRouterModels,
  parseTokenRouterPricing,
  TOKENROUTER_API_BASE_URL,
  TOKENROUTER_MODELS_URL,
  TOKENROUTER_PRICING_URL,
  TokenRouterProvider,
} from "../src/providers/tokenrouter.ts";

describe("compact provider limit terms", () => {
  test("returns model-specific Gemini terms and a fallback", () => {
    expect(geminiUnconfirmedLimits("gemini-3.5-flash-lite")).toEqual({
      terms: ["15 req / min", "250k tok / min", "500 req / day"],
    });
    expect(geminiUnconfirmedLimits("gemini-3.5-flash")).toEqual({
      terms: ["5 req / min", "250k tok / min", "20 req / day"],
    });
    expect(geminiUnconfirmedLimits("gemini-specialized")).toEqual({
      terms: ["15 req / min", "250k tok / min", "500 req / day"],
    });
  });

  test("returns hardcoded Mistral, TokenRouter, and OpenCode terms", () => {
    expect(mistralUnconfirmedLimits()).toEqual({
      terms: ["50 req / min", "50k tok / min"],
    });
    expect(tokenRouterUnconfirmedLimits()).toEqual({ terms: ["8 req / min"] });
    expect(openCodePublishedLimits()).toEqual({
      terms: ["200 req / day"],
    });
  });
});

describe("provider documentation metadata", () => {
  test("validates documentation schema on valid and invalid URLs", () => {
    expect(providerDocSchema.safeParse({}).success).toBe(true);
    expect(
      providerDocSchema.safeParse({
        overview: "https://example.com/docs",
        rate_limit: "https://example.com/limits",
      }).success,
    ).toBe(true);
    expect(
      providerDocSchema.safeParse({
        overview: "not-a-url",
      }).success,
    ).toBe(false);
  });

  test("every registered provider exposes structured documentation URLs", () => {
    expect(providerRegistry.length).toBeGreaterThan(0);
    for (const provider of providerRegistry) {
      expect(provider.doc).toBeDefined();
      const parseResult = providerDocSchema.safeParse(provider.doc);
      expect(parseResult.success).toBe(true);
      expect(Object.keys(provider.doc ?? {}).length).toBeGreaterThan(0);
    }
  });
});

describe("TokenRouter discovery", () => {
  test("keeps every endpoint type on active native free models", async () => {
    const freeModels = [
      ["vendor/openai-free", ["openai"]],
      ["vendor/responses-free", ["openai-response"]],
      ["vendor/anthropic-free", ["anthropic"]],
      ["vendor/anthropic-compatible-free", ["anthropic-compatible"]],
      ["vendor/gemini-free", ["gemini"]],
      ["vendor/audio-free", ["audio-chat"]],
      ["vendor/image-free", ["image-generation"]],
      ["vendor/video-free", ["video-generation", "video-fetch"]],
    ] as const;
    const activeModels = [
      ...freeModels.map(([modelId]) => modelId),
      "nvidia/nemotron:free",
      "stealth/ox-alpha",
      "paid/model",
    ];
    const modelsDev = new Map([
      [
        "tokenrouter",
        {
          id: "tokenrouter",
          env: ["TOKENROUTER_API_KEY"],
        },
      ],
    ]);
    const provider = new TokenRouterProvider({
      apiKey: "tokenrouter-secret",
      fetch: async (url, init) => {
        expect(new Headers(init?.headers).get("accept")).toBe("application/json");
        if (url === TOKENROUTER_MODELS_URL) {
          expect(new Headers(init?.headers).get("authorization")).toBe("Bearer tokenrouter-secret");
          return Response.json({
            object: "list",
            data: activeModels.map((id) => ({ id, object: "model" })),
          });
        }
        if (url === TOKENROUTER_PRICING_URL) {
          expect(new Headers(init?.headers).get("authorization")).toBeNull();
          return Response.json({
            success: true,
            data: [
              ...freeModels.map(([modelId, endpointTypes]) =>
                tokenRouterPrice(modelId, 0, ["default"], [...endpointTypes].reverse()),
              ),
              tokenRouterPrice("nvidia/nemotron:free", 0),
              tokenRouterPrice("stealth/ox-alpha", 0),
              tokenRouterPrice("retired/model-free", 0),
              tokenRouterPrice("paid/model", 1),
              tokenRouterPrice("vip/model-free", 0, ["vip"]),
              tokenRouterPrice("missing-endpoint/model-free", 0, ["default"], []),
            ],
          });
        }
        throw new Error(`Unexpected URL: ${url}`);
      },
    });

    expect(await provider.discover(modelsDev)).toEqual(
      freeModels.map(([modelId, endpointTypes]) => {
        const sortedEndpoints = [...endpointTypes].sort();
        return {
          model_id: modelId,
          name: desluggifyModelId(modelId),
          connection: {
            auth: { env: ["TOKENROUTER_API_KEY"] },
            base_url: TOKENROUTER_API_BASE_URL,
            protocol: sortedEndpoints.includes("openai")
              ? "openai"
              : (sortedEndpoints[0] ?? "openai"),
            supported_endpoint_types: sortedEndpoints,
          },
          limits: tokenRouterUnconfirmedLimits(),
        };
      }),
    );
  });

  test("requires a key so retired public pricing rows cannot stand in for availability", async () => {
    const provider = new TokenRouterProvider({ apiKey: "" });
    expect(provider.discover(new Map())).rejects.toThrow("TOKENROUTER_API_KEY");
  });

  test("rejects duplicate, malformed, and unsupported pricing records", () => {
    expect(() =>
      parseTokenRouterModels({ object: "list", data: [{ id: "duplicate" }, { id: "duplicate" }] }),
    ).toThrow("duplicate model ID");
    expect(() => parseTokenRouterModels({ object: "list", data: [{}] })).toThrow("no valid id");
    expect(() =>
      parseTokenRouterPricing({
        success: true,
        data: [tokenRouterPrice("duplicate", 0), tokenRouterPrice("duplicate", 0)],
      }),
    ).toThrow("duplicate model ID");
    expect(() =>
      parseTokenRouterPricing({
        success: true,
        data: [{ ...tokenRouterPrice("bad-price", 0), model_ratio: -1 }],
      }),
    ).toThrow("invalid model_ratio");
  });
});

describe("Groq discovery", () => {
  test("returns no offers when only Developer-plan limits are published", async () => {
    const modelsDev = new Map([["groq", { id: "groq", env: ["GROQ_API_KEY"] }]]);
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

    expect(await provider.discover(modelsDev)).toEqual([]);
  });

  test("rejects an unlabeled plan limits table", async () => {
    const modelsDev = new Map([["groq", { id: "groq", env: ["GROQ_API_KEY"] }]]);
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

    expect(provider.discover(modelsDev)).rejects.toThrow("unique active plan");
  });

  test("discovers model IDs from the official free-plan table", async () => {
    const modelsDev = new Map([
      [
        "groq",
        {
          id: "groq",
          env: ["GROQ_API_KEY"],
        },
      ],
    ]);
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

    expect(await provider.discover(modelsDev)).toEqual([
      {
        model_id: "alpha/model",
        name: "Alpha: Model",
        connection: {
          auth: { env: ["GROQ_API_KEY"] },
          base_url: GROQ_API_BASE_URL,
          protocol: "openai",
        },
        limits: groqOfferLimits({ rpm: "30", rpd: "1,000", tpm: "6,000", tpd: "500,000" }),
      },
      {
        model_id: "beta/model",
        name: "Beta: Model",
        connection: {
          auth: { env: ["GROQ_API_KEY"] },
          base_url: GROQ_API_BASE_URL,
          protocol: "openai",
        },
        limits: groqOfferLimits({
          rpm: "10",
          rpd: "100",
          tpm: "2,000",
          tpd: "20,000",
          ash: "5",
          asd: "20",
        }),
      },
    ]);
  });
});

describe("Mistral discovery", () => {
  test("uses a free-mode account catalogue and excludes custom or archived models", async () => {
    const modelsDev = new Map([
      [
        "mistral",
        {
          id: "mistral",
          env: ["MISTRAL_API_KEY"],
        },
      ],
    ]);
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

    expect(await provider.discover(modelsDev)).toEqual([
      {
        model_id: "mistral-small",
        name: "Mistral small",
        connection: {
          auth: { env: ["MISTRAL_API_KEY"] },
          base_url: MISTRAL_API_BASE_URL,
          protocol: "openai",
        },
        limits: mistralUnconfirmedLimits(),
      },
    ]);
  });

  test("requires a key explicitly scoped to an organization in Free mode", async () => {
    const provider = new MistralProvider({ apiKey: "" });
    expect(provider.discover(new Map())).rejects.toThrow("MISTRAL_FREE_API_KEY");
  });
});

describe("Gemini API discovery", () => {
  test("uses only model sections whose standard pricing table offers free inference", async () => {
    const modelsDev = new Map([
      [
        "google",
        {
          id: "google",
          env: ["GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY"],
        },
      ],
    ]);
    const provider = new GeminiProvider({
      fetch: async (url) => {
        expect(url).toBe(GEMINI_PRICING_URL);
        return new Response(geminiPricingFixture());
      },
    });

    expect(await provider.discover(modelsDev)).toEqual([
      {
        model_id: "gemini-free",
        name: "Gemini Free",
        connection: {
          auth: {
            env: ["GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY"],
          },
          base_url: GEMINI_API_BASE_URL,
          protocol: "google",
        },
        limits: geminiUnconfirmedLimits("gemini-free"),
      },
    ]);
  });
});

describe("NVIDIA Build discovery", () => {
  test("keeps only catalogue resources explicitly labeled Free Endpoint", async () => {
    const modelsDev = new Map([
      [
        "nvidia",
        {
          id: "nvidia",
          env: ["NVIDIA_API_KEY"],
        },
      ],
    ]);
    const provider = new NvidiaProvider({
      fetch: async (url) => {
        if (url === NVIDIA_LIMITS_URL) {
          return new Response(
            '"rateLimits":{"requestsPerMinute":"Up to 40 rpm","requestsPerDay":"10,000 requests per day"}',
          );
        }
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

    expect(await provider.discover(modelsDev)).toEqual([
      {
        model_id: "nvidia/free",
        name: "Free Model",
        connection: {
          auth: { env: ["NVIDIA_API_KEY"] },
          base_url: NVIDIA_API_BASE_URL,
          protocol: "openai",
        },
        limits: parseNvidiaLimits(
          '"rateLimits":{"requestsPerMinute":"Up to 40 rpm","requestsPerDay":"10,000 requests per day"}',
        ),
      },
    ]);
  });
});

describe("Cloudflare Workers AI discovery", () => {
  test("applies the recurring allocation to priced models except paid-only entries", async () => {
    const modelsDev = new Map([
      [
        "cloudflare-workers-ai",
        {
          id: "cloudflare-workers-ai",
          env: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_KEY"],
        },
      ],
    ]);
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

    expect(await provider.discover(modelsDev)).toEqual([
      {
        model_id: "@cf/free/model",
        name: "Free: Model",
        connection: {
          auth: {
            env: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_KEY"],
          },
          base_url: CLOUDFLARE_WORKERS_AI_BASE_URL,
          protocol: "cloudflare",
        },
        limits: cloudflareOfferLimits("12,345 Neurons per day"),
      },
    ]);
  });

  test("fails closed when the paid-only declaration disappears", async () => {
    const modelsDev = new Map([
      [
        "cloudflare-workers-ai",
        {
          id: "cloudflare-workers-ai",
          env: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_KEY"],
        },
      ],
    ]);
    const provider = new CloudflareProvider({
      fetch: async () =>
        new Response("Our free allocation is **10,000 Neurons per day at no charge**."),
    });
    expect(provider.discover(modelsDev)).rejects.toThrow("paid-only model declaration");
  });

  test("fails closed when the free allocation is ambiguous", async () => {
    const modelsDev = new Map([
      [
        "cloudflare-workers-ai",
        {
          id: "cloudflare-workers-ai",
          env: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_KEY"],
        },
      ],
    ]);
    const provider = new CloudflareProvider({
      fetch: async () =>
        new Response(`
**10,000 Neurons per day at no charge**
**20,000 Neurons per day at no charge**
`),
    });
    expect(provider.discover(modelsDev)).rejects.toThrow(
      "no unique recognized free daily allocation",
    );
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

function tokenRouterPrice(
  modelName: string,
  modelRatio: number,
  enableGroups: string[] = ["default"],
  supportedEndpointTypes: string[] = ["openai"],
): Record<string, unknown> {
  return {
    model_name: modelName,
    quota_type: 0,
    model_ratio: modelRatio,
    model_price: 0,
    completion_ratio: 1,
    enable_groups: enableGroups,
    supported_endpoint_types: supportedEndpointTypes,
  };
}
