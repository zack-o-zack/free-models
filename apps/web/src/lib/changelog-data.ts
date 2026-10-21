import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface ChangelogEntry {
  readonly id: string;
  readonly date: string;
  readonly timestamp: string;
  readonly provider: string;
  readonly providerName: string;
  readonly type: "added" | "removed";
  readonly modelId: string;
  readonly modelName: string;
  readonly canonicalId?: string | null;
  readonly commitHash?: string;
  readonly commitMessage?: string;
}

export interface ChangelogDocument {
  readonly generatedAt: string;
  readonly windowDays: number;
  readonly since: string;
  readonly totalAdded: number;
  readonly totalRemoved: number;
  readonly entries: readonly ChangelogEntry[];
}

export async function getChangelog(): Promise<ChangelogDocument> {
  const candidatePaths = [
    join(process.cwd(), ".generated/changelog.json"),
    join(process.cwd(), "packages/json/catalogue/changelog.json"),
    join(process.cwd(), "../../packages/json/catalogue/changelog.json"),
  ];

  for (const path of candidatePaths) {
    try {
      const text = await readFile(/*turbopackIgnore: true*/ path, "utf8");
      const parsed = JSON.parse(text) as ChangelogDocument;
      if (Array.isArray(parsed.entries)) {
        return parsed;
      }
    } catch {
      // Continue to next path
    }
  }

  const now = new Date().toISOString();
  return {
    generatedAt: now,
    windowDays: 30,
    since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    totalAdded: 0,
    totalRemoved: 0,
    entries: [],
  };
}
