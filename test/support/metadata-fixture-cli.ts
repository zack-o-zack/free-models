import { join } from "node:path";
import { JsonCatalogueRenderer } from "../../src/catalogue/render.ts";
import { runCli } from "../../src/cli.ts";
import {
  OPENROUTER_METADATA_MODELS_URL,
  OpenRouterMetadataSource,
} from "../../src/metadata-sources/openrouter.ts";
import { defineProviderRegistry } from "../../src/providers/provider.ts";
import { FixtureProvider } from "./fixture-provider.ts";

const fixtureDirectory = process.env.CATALOGUE_FIXTURE_DIRECTORY;
const metadataFixturePath = process.env.OPENROUTER_METADATA_FIXTURE_PATH;
if (!fixtureDirectory) {
  throw new Error("CATALOGUE_FIXTURE_DIRECTORY is required");
}
if (!metadataFixturePath) {
  throw new Error("OPENROUTER_METADATA_FIXTURE_PATH is required");
}

const providers = defineProviderRegistry(
  new FixtureProvider("fixture-z", join(fixtureDirectory, "fixture-z.json")),
  new FixtureProvider("fixture-a", join(fixtureDirectory, "fixture-a.json")),
);

const metadataSources = [
  new OpenRouterMetadataSource({
    fetch: async (url, init) => {
      if (new Headers(init?.headers).has("authorization")) {
        throw new Error("OpenRouter metadata request must be anonymous");
      }
      if (url !== OPENROUTER_METADATA_MODELS_URL) {
        throw new Error(`Unexpected OpenRouter metadata fixture URL: ${url}`);
      }
      const body = await Bun.file(metadataFixturePath).text();
      let status = 200;
      try {
        const parsed = JSON.parse(body) as { http_status?: unknown };
        if (typeof parsed.http_status === "number") {
          status = parsed.http_status;
        }
      } catch {
        status = 200;
      }
      return new Response(body, {
        status,
        headers: { "Content-Type": "application/json" },
      });
    },
  }),
];

runCli(process.argv.slice(2), {
  providers,
  metadataSources,
  renderer: new JsonCatalogueRenderer(),
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
