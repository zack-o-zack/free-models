import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { cataloguePaths } from "./catalogue/files.ts";
import { type CatalogueRenderer, JsonCatalogueRenderer } from "./catalogue/render.ts";
import {
  check as checkCatalogue,
  discover,
  enrich as enrichCatalogue,
  reconcile,
  render as renderCatalogue,
} from "./catalogue/workflow.ts";
import type { ModelMetadataSource } from "./metadata-sources/metadata-source.ts";
import { metadataSourceRegistry } from "./metadata-sources/registry.ts";
import type { ModelProvider } from "./providers/provider.ts";
import { providerRegistry } from "./providers/registry.ts";

type Command = "check" | "discover" | "enrich" | "reconcile" | "render";

export interface CliDependencies {
  readonly providers: readonly ModelProvider[];
  readonly metadataSources: readonly ModelMetadataSource[];
  readonly renderer: CatalogueRenderer;
}

const defaultDependencies: CliDependencies = {
  providers: providerRegistry,
  metadataSources: metadataSourceRegistry,
  renderer: new JsonCatalogueRenderer(),
};

function usage(): string {
  return [
    "Usage:",
    "  bun run catalogue discover [--workspace <path>]",
    "  bun run catalogue reconcile [--workspace <path>]",
    "  bun run catalogue enrich [--workspace <path>]",
    "  bun run catalogue render [--workspace <path>] [--output <path>]",
    "  bun run catalogue check [--workspace <path>] [--input <path>]",
  ].join("\n");
}

export async function runCli(
  args: string[],
  dependencies: CliDependencies = defaultDependencies,
): Promise<void> {
  const [command, ...commandArgs] = args;
  if (!isCommand(command)) {
    throw new Error(`Unknown command${command ? `: ${command}` : ""}.\n\n${usage()}`);
  }

  const options = parseCommandOptions(command, commandArgs);
  const paths = cataloguePaths(options.workspace ?? process.cwd());

  if (command === "discover") {
    const unresolvedCount = await discover(paths, dependencies.providers);
    console.log(
      `Discovered ${dependencies.providers.length} provider(s); ${unresolvedCount} unresolved model(s)`,
    );
    return;
  }

  if (command === "reconcile") {
    const unresolvedCount = await reconcile(paths, dependencies.providers);
    console.log(`Reconciled catalogue; ${unresolvedCount} unresolved model(s)`);
    return;
  }

  if (command === "enrich") {
    const result = await enrichCatalogue(
      paths,
      dependencies.providers,
      dependencies.metadataSources,
    );
    for (const failure of result.failures) {
      console.error(`Metadata source ${failure.sourceId} enrichment failed: ${failure.message}`);
    }
    console.log(
      `Enriched metadata for ${result.resolvedCount} canonical model(s); ${result.failures.length} source failure(s)`,
    );
    return;
  }

  if (command === "render") {
    const outputPath = resolve(
      options.output ?? join(paths.workspace, dependencies.renderer.defaultFileName),
    );
    await renderCatalogue(
      paths,
      dependencies.providers,
      dependencies.renderer,
      dependencies.metadataSources,
      outputPath,
    );
    console.log(`Rendered ${outputPath}`);
    return;
  }

  const inputPath = resolve(
    options.input ?? join(paths.workspace, dependencies.renderer.defaultFileName),
  );
  await checkCatalogue(
    paths,
    dependencies.providers,
    dependencies.renderer,
    dependencies.metadataSources,
    inputPath,
  );
  console.log(`Checked ${inputPath}`);
}

function isCommand(command: string | undefined): command is Command {
  return (
    command === "check" ||
    command === "discover" ||
    command === "enrich" ||
    command === "reconcile" ||
    command === "render"
  );
}

function parseCommandOptions(
  command: Command,
  args: string[],
): { input?: string; output?: string; workspace?: string } {
  const options: Record<string, { type: "string" }> = {
    workspace: { type: "string" },
  };
  if (command === "check") {
    options.input = { type: "string" };
  }
  if (command === "render") {
    options.output = { type: "string" };
  }

  try {
    return parseArgs({ args, options, strict: true, allowPositionals: false }).values;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n\n${usage()}`, { cause: error });
  }
}

if (import.meta.main) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
