import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { cataloguePaths } from "./catalogue/files.ts";
import { type CatalogueRenderer, JsonCatalogueRenderer } from "./catalogue/render.ts";
import {
  check as checkCatalogue,
  discover,
  reconcile,
  render as renderCatalogue,
} from "./catalogue/workflow.ts";
import type { CanonicalMetadataProvider } from "./metadata/provider.ts";
import type { ModelProvider } from "./providers/provider.ts";
import { metadataProvider, providerRegistry } from "./providers/registry.ts";

type Command = "check" | "discover" | "reconcile" | "render";

export interface CliDependencies {
  readonly providers: readonly ModelProvider[];
  readonly renderer: CatalogueRenderer;
  readonly metadataProvider?: CanonicalMetadataProvider;
}

const defaultDependencies: CliDependencies = {
  providers: providerRegistry,
  renderer: new JsonCatalogueRenderer(),
  metadataProvider,
};

function usage(): string {
  return [
    "Usage:",
    "  bun run catalogue discover [--workspace <path>]",
    "  bun run catalogue reconcile [--workspace <path>]",
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
    const unresolvedCount = await reconcile(
      paths,
      dependencies.providers,
      dependencies.metadataProvider,
    );
    console.log(`Reconciled catalogue; ${unresolvedCount} unresolved model(s)`);
    return;
  }

  if (command === "render") {
    const outputPath = resolve(
      options.output ?? join(paths.workspace, dependencies.renderer.defaultFileName),
    );
    await renderCatalogue(paths, dependencies.providers, dependencies.renderer, outputPath);
    console.log(`Rendered ${outputPath}`);
    return;
  }

  const inputPath = resolve(
    options.input ?? join(paths.workspace, dependencies.renderer.defaultFileName),
  );
  await checkCatalogue(paths, dependencies.providers, dependencies.renderer, inputPath);
  console.log(`Checked ${inputPath}`);
}

function isCommand(command: string | undefined): command is Command {
  return (
    command === "check" || command === "discover" || command === "reconcile" || command === "render"
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
