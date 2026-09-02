import { JsonCatalogueRenderer } from "../../src/catalogue/render.ts";
import { runCli } from "../../src/cli.ts";
import {
  OPENROUTER_LIMITS_URL,
  OPENROUTER_MODELS_URL,
  OpenRouterProvider,
} from "../../src/providers/openrouter.ts";

const fixturePath = process.env.OPENROUTER_FIXTURE_PATH;
if (!fixturePath) {
  throw new Error("OPENROUTER_FIXTURE_PATH is required");
}

const provider = new OpenRouterProvider({
  fetch: async (url, init) => {
    if (new Headers(init?.headers).has("authorization")) {
      throw new Error("OpenRouter catalogue request must be anonymous");
    }
    if (url === OPENROUTER_MODELS_URL) {
      return new Response(await Bun.file(fixturePath).text(), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url === OPENROUTER_LIMITS_URL) {
      return new Response(
        "const FREE_MODEL_RATE_LIMIT_RPM=20;const FREE_MODEL_NO_CREDITS_RPD=50;" +
          "const FREE_MODEL_HAS_CREDITS_RPD=1e3;const FREE_MODEL_CREDITS_THRESHOLD=10;",
        { headers: { "Content-Type": "text/html" } },
      );
    }
    throw new Error(`Unexpected OpenRouter fixture URL: ${url}`);
  },
});

runCli(process.argv.slice(2), {
  providers: [provider],
  renderer: new JsonCatalogueRenderer(),
  metadataProvider: provider,
  modelsDevRegistry: new Map([["openrouter", { id: "openrouter", env: ["OPENROUTER_API_KEY"] }]]),
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
