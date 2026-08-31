import { JsonCatalogueRenderer } from "../../src/catalogue/render.ts";
import { runCli } from "../../src/cli.ts";
import { OPENROUTER_MODELS_URL, OpenRouterProvider } from "../../src/providers/openrouter.ts";

const fixturePath = process.env.OPENROUTER_FIXTURE_PATH;
if (!fixturePath) {
  throw new Error("OPENROUTER_FIXTURE_PATH is required");
}

const provider = new OpenRouterProvider({
  modelsDev: new Map([["openrouter", { id: "openrouter", env: ["OPENROUTER_API_KEY"] }]]),
  fetch: async (url, init) => {
    if (url !== OPENROUTER_MODELS_URL) {
      throw new Error(`Unexpected OpenRouter fixture URL: ${url}`);
    }
    if (new Headers(init?.headers).has("authorization")) {
      throw new Error("OpenRouter catalogue request must be anonymous");
    }
    return new Response(await Bun.file(fixturePath).text(), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

runCli(process.argv.slice(2), {
  providers: [provider],
  renderer: new JsonCatalogueRenderer(),
  metadataProvider: provider,
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
