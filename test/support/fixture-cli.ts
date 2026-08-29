import { join } from "node:path";
import { JsonCatalogueRenderer } from "../../src/catalogue/render.ts";
import { runCli } from "../../src/cli.ts";
import { defineProviderRegistry } from "../../src/providers/provider.ts";
import { FixtureProvider } from "./fixture-provider.ts";

const fixtureDirectory = process.env.CATALOGUE_FIXTURE_DIRECTORY;
if (!fixtureDirectory) {
  throw new Error("CATALOGUE_FIXTURE_DIRECTORY is required");
}

const providers = defineProviderRegistry(
  new FixtureProvider("fixture-z", join(fixtureDirectory, "fixture-z.json")),
  new FixtureProvider("fixture-a", join(fixtureDirectory, "fixture-a.json")),
);

runCli(process.argv.slice(2), {
  providers,
  metadataSources: [],
  renderer: new JsonCatalogueRenderer(),
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
