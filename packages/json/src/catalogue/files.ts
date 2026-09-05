import { copyFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { z } from "zod";
import type { JsonValue } from "./schema.ts";

export interface CataloguePaths {
  readonly workspace: string;
  readonly canonicalModels: string;
  readonly canonicalMetadata: string;
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
    canonicalMetadata: join(dataDirectory, "canonical-metadata.json"),
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

export interface TextFileUpdate {
  readonly path: string;
  readonly contents: string;
}

export interface AtomicWriteOperations {
  rename(source: string, destination: string): Promise<void>;
}

const defaultAtomicWriteOperations: AtomicWriteOperations = { rename };

/**
 * Stages every changed file before replacing any target and restores replaced targets if a rename
 * fails. Byte-identical targets are left untouched.
 */
export async function writeTextFilesAtomically(
  updates: readonly TextFileUpdate[],
  operations: AtomicWriteOperations = defaultAtomicWriteOperations,
): Promise<void> {
  const targetPaths = new Set<string>();
  const changedUpdates: Array<TextFileUpdate & { existed: boolean }> = [];

  for (const update of updates) {
    if (targetPaths.has(update.path)) {
      throw new Error(`Atomic file update contains duplicate target: ${update.path}`);
    }
    targetPaths.add(update.path);

    const file = Bun.file(update.path);
    const existed = await file.exists();
    if (existed && (await file.text()) === update.contents) {
      continue;
    }
    changedUpdates.push({ ...update, existed });
  }

  if (changedUpdates.length === 0) {
    return;
  }

  const transactionId = crypto.randomUUID();
  const staged = changedUpdates.map((update) => ({
    ...update,
    temporaryPath: `${update.path}.${transactionId}.tmp`,
    backupPath: `${update.path}.${transactionId}.bak`,
  }));
  let preserveBackups = false;

  try {
    for (const update of staged) {
      await mkdir(dirname(update.path), { recursive: true });
      await writeFile(update.temporaryPath, update.contents, { encoding: "utf8", flag: "wx" });
    }

    for (const update of staged) {
      if (update.existed) {
        await copyFile(update.path, update.backupPath);
      }
    }

    const installed: typeof staged = [];
    try {
      for (const update of staged) {
        await operations.rename(update.temporaryPath, update.path);
        installed.push(update);
      }
    } catch (error) {
      const rollbackErrors: unknown[] = [];
      for (const update of installed.reverse()) {
        try {
          if (update.existed) {
            await operations.rename(update.backupPath, update.path);
          } else {
            await rm(update.path, { force: true });
          }
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length > 0) {
        preserveBackups = true;
        throw new AggregateError(
          [error, ...rollbackErrors],
          "Atomic file update failed and could not be fully rolled back",
        );
      }
      throw error;
    }
  } finally {
    const cleanupPaths = staged.flatMap((update) =>
      preserveBackups ? [update.temporaryPath] : [update.temporaryPath, update.backupPath],
    );
    await Promise.all(cleanupPaths.map((path) => rm(path, { force: true }).catch(() => undefined)));
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

export function sortJsonObject<T extends { [key: string]: JsonValue }>(value: T): T {
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([key, child]) => [key, sortJsonValue(child)]),
  ) as T;
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
