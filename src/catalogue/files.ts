import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { z } from "zod";
import type { JsonValue } from "./schema.ts";

export interface CataloguePaths {
  readonly workspace: string;
  readonly canonicalModels: string;
  readonly mappingsDirectory: string;
  readonly snapshotsDirectory: string;
  readonly unresolved: string;
  readonly publicCatalogue: string;
  mapping(providerId: string): string;
  snapshot(providerId: string): string;
}

export function cataloguePaths(workspace: string): CataloguePaths {
  const absoluteWorkspace = resolve(workspace);
  const dataDirectory = join(absoluteWorkspace, "catalogue");
  const mappingsDirectory = join(dataDirectory, "mappings");
  const snapshotsDirectory = join(dataDirectory, "snapshots");

  return {
    workspace: absoluteWorkspace,
    canonicalModels: join(dataDirectory, "canonical-models.json"),
    mappingsDirectory,
    snapshotsDirectory,
    unresolved: join(dataDirectory, "unresolved.json"),
    publicCatalogue: join(absoluteWorkspace, "free-models.json"),
    mapping: (providerId) => join(mappingsDirectory, `${providerId}.json`),
    snapshot: (providerId) => join(snapshotsDirectory, `${providerId}.json`),
  };
}

export async function readValidatedJson<T>(
  path: string,
  schema: z.ZodType<T>,
  description: string,
): Promise<T> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`${description} does not exist: ${path}`);
  }

  let value: unknown;
  try {
    value = JSON.parse(await file.text());
  } catch (error) {
    throw new Error(`${description} is not valid JSON: ${path}`, { cause: error });
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`${description} is invalid:\n${formatValidationIssues(result.error.issues)}`);
  }

  return result.data;
}

export async function writeTextAtomically(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${crypto.randomUUID()}.tmp`;

  try {
    await writeFile(temporaryPath, contents, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, path);
  } catch (error) {
    await Bun.file(temporaryPath)
      .delete()
      .catch(() => undefined);
    throw error;
  }
}

export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function compareStrings(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  return left > right ? 1 : 0;
}

export function sortJsonObject(value: { [key: string]: JsonValue }): {
  [key: string]: JsonValue;
} {
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([key, child]) => [key, sortJsonValue(child)]),
  );
}

function sortJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }
  if (value !== null && typeof value === "object") {
    return sortJsonObject(value);
  }
  return value;
}

function formatValidationIssues(
  issues: ReadonlyArray<{ message: string; path: ReadonlyArray<PropertyKey> }>,
): string {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "document";
      return `- ${path}: ${issue.message}`;
    })
    .join("\n");
}
