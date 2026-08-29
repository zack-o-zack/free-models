import { resolve } from "node:path";
import { emptyCatalogue, renderCatalogue } from "./catalogue/render.ts";
import { catalogueSchema } from "./catalogue/schema.ts";

const DEFAULT_CATALOGUE_PATH = "free-models.json";

type Command = "check" | "render";

function usage(): string {
  return [
    "Usage:",
    "  bun run catalogue render [--output <path>]",
    "  bun run catalogue check [--input <path>]",
  ].join("\n");
}

function readPathOption(args: string[], option: "--input" | "--output"): string {
  if (args.length === 0) {
    return resolve(DEFAULT_CATALOGUE_PATH);
  }

  if (args.length !== 2 || args[0] !== option || !args[1]) {
    throw new Error(`Invalid arguments.\n\n${usage()}`);
  }

  return resolve(args[1]);
}

async function render(args: string[]): Promise<void> {
  const outputPath = readPathOption(args, "--output");
  await Bun.write(outputPath, renderCatalogue(emptyCatalogue));
  console.log(`Rendered ${outputPath}`);
}

async function check(args: string[]): Promise<void> {
  const inputPath = readPathOption(args, "--input");
  const input = Bun.file(inputPath);

  if (!(await input.exists())) {
    throw new Error(`Catalogue does not exist: ${inputPath}`);
  }

  let document: unknown;
  try {
    document = await input.json();
  } catch (error) {
    throw new Error(`Catalogue is not valid JSON: ${inputPath}`, { cause: error });
  }

  const result = catalogueSchema.safeParse(document);
  if (!result.success) {
    throw new Error(`Catalogue does not match schema version 1:\n${zodIssues(result.error)}`);
  }

  console.log(`Checked ${inputPath}`);
}

function zodIssues(error: {
  issues: ReadonlyArray<{ message: string; path: PropertyKey[] }>;
}): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "document";
      return `- ${path}: ${issue.message}`;
    })
    .join("\n");
}

export async function main(args: string[]): Promise<void> {
  const [command, ...commandArgs] = args;

  if (command !== "check" && command !== "render") {
    throw new Error(`Unknown command${command ? `: ${command}` : ""}.\n\n${usage()}`);
  }

  const handlers: Record<Command, (handlerArgs: string[]) => Promise<void>> = {
    check,
    render,
  };

  await handlers[command](commandArgs);
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
