import { JsonCatalogueRenderer } from "../../src/catalogue/render.ts";
import { runCli } from "../../src/cli.ts";
import {
  OPENCODE_ZEN_DOCUMENTATION_URL,
  OPENCODE_ZEN_MODELS_URL,
  OpenCodeProvider,
} from "../../src/providers/opencode.ts";

const documentationFixturePath = process.env.OPENCODE_DOCUMENTATION_FIXTURE_PATH;
const modelsFixturePath = process.env.OPENCODE_MODELS_FIXTURE_PATH;
if (!documentationFixturePath || !modelsFixturePath) {
  throw new Error("OpenCode fixture paths are required");
}

const provider = new OpenCodeProvider({
  modelsDev: new Map([["opencode", { id: "opencode", env: ["OPENCODE_API_KEY"] }]]),
  fetch: async (url, init) => {
    if (new Headers(init?.headers).has("authorization")) {
      throw new Error("OpenCode Zen discovery requests must be anonymous");
    }
    if (url === OPENCODE_ZEN_DOCUMENTATION_URL) {
      return new Response(await Bun.file(documentationFixturePath).text(), {
        headers: { "Content-Type": "text/html" },
      });
    }
    if (url === OPENCODE_ZEN_MODELS_URL) {
      return new Response(await Bun.file(modelsFixturePath).text(), {
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(`Unexpected OpenCode fixture URL: ${url}`);
  },
});

runCli(process.argv.slice(2), {
  providers: [provider],
  renderer: new JsonCatalogueRenderer(),
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
