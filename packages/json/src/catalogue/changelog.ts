import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { z } from "zod";
import type { ModelProvider } from "../providers/provider.ts";
import type { CataloguePaths } from "./files.ts";
import { compareStrings, readValidatedJson, serializeJson, writeTextAtomically } from "./files.ts";
import { providerIdSchema } from "./schema.ts";

export const changelogEntrySchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  timestamp: z.string().min(1),
  provider: providerIdSchema,
  providerName: z.string().min(1),
  type: z.enum(["added", "removed"]),
  modelId: z.string().min(1),
  modelName: z.string().min(1),
  canonicalId: z.string().nullable().optional(),
  commitHash: z.string().optional(),
  commitMessage: z.string().optional(),
});

export type ChangelogEntry = z.infer<typeof changelogEntrySchema>;

export const changelogDocumentSchema = z.object({
  generatedAt: z.string().min(1),
  windowDays: z.number().int().positive(),
  since: z.string().min(1),
  totalAdded: z.number().int().nonnegative(),
  totalRemoved: z.number().int().nonnegative(),
  entries: z.array(changelogEntrySchema),
});

export type ChangelogDocument = z.infer<typeof changelogDocumentSchema>;

export interface GenerateChangelogOptions {
  readonly windowDays?: number;
  readonly now?: number;
  readonly outputPath?: string;
  readonly gitWorkspace?: string;
}

interface RawOffer {
  readonly model_id: string;
  readonly name?: string;
}

interface RawSnapshot {
  readonly provider: string;
  readonly name?: string;
  readonly offers?: readonly RawOffer[];
}

function runGit(args: readonly string[], cwd: string): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 25 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

function loadMappings(mappingsDir: string): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>();
  try {
    if (!existsSync(mappingsDir)) return result;
    const files = readdirSync(mappingsDir).filter((file) => file.endsWith(".json"));
    for (const file of files) {
      const provider = file.replace(/\.json$/, "");
      try {
        const raw = JSON.parse(readFileSync(join(mappingsDir, file), "utf8"));
        if (raw && typeof raw.mappings === "object" && raw.mappings !== null) {
          result.set(provider, new Map(Object.entries(raw.mappings)));
        }
      } catch {
        // Ignore unreadable mapping file
      }
    }
  } catch {
    // Ignore missing directory
  }
  return result;
}

function parseSnapshotJson(raw: string | null): RawSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.provider === "string") {
      return parsed as RawSnapshot;
    }
  } catch {
    // Malformed JSON
  }
  return null;
}

export async function generateChangelog(
  paths: CataloguePaths,
  providers: readonly ModelProvider[] = [],
  options: GenerateChangelogOptions = {},
): Promise<ChangelogDocument> {
  const windowDays = options.windowDays ?? 30;
  const now = options.now ?? Date.now();
  const cutoffTime = now - windowDays * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffTime).toISOString();
  const outputPath = options.outputPath ?? paths.changelog;

  const providerMap = new Map<string, ModelProvider>(providers.map((p) => [p.id, p]));
  const mappings = loadMappings(paths.mappingsDirectory);

  const getProviderName = (providerId: string, snapshotName?: string): string => {
    if (snapshotName && snapshotName.trim().length > 0) return snapshotName;
    const p = providerMap.get(providerId);
    if (p?.name) return p.name;
    return providerId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const entries: ChangelogEntry[] = [];
  const gitCwd = options.gitWorkspace ?? paths.workspace;
  const gitRoot = runGit(["rev-parse", "--show-toplevel"], gitCwd)?.trim();

  if (gitRoot) {
    const relSnapshots = relative(gitRoot, paths.snapshotsDirectory);
    const logOut = runGit(
      ["log", `--since=${cutoffIso}`, "--reverse", "--format=%H|%cI|%s", "--", relSnapshots],
      gitRoot,
    );

    if (logOut) {
      const commitLines = logOut.trim().split("\n").filter(Boolean);
      for (const line of commitLines) {
        const [hash, commitDate, commitMessage] = line.split("|");
        if (!hash || !commitDate) continue;

        const filesOut = runGit(
          ["diff-tree", "--no-commit-id", "--name-only", "-r", hash, "--", relSnapshots],
          gitRoot,
        );
        if (!filesOut) continue;

        const changedFiles = filesOut.trim().split("\n").filter(Boolean);
        for (const relFile of changedFiles) {
          const currRaw = runGit(["show", `${hash}:${relFile}`], gitRoot);
          const prevRaw = runGit(["show", `${hash}~1:${relFile}`], gitRoot);

          const currSnapshot = parseSnapshotJson(currRaw);
          const prevSnapshot = parseSnapshotJson(prevRaw);

          const provider =
            currSnapshot?.provider ??
            prevSnapshot?.provider ??
            relFile.replace(/^.*\/([a-z0-9-]+)\.json$/, "$1");
          const providerName = getProviderName(provider, currSnapshot?.name ?? prevSnapshot?.name);
          const providerMappings = mappings.get(provider);

          const currOffers = new Map<string, string>();
          for (const offer of currSnapshot?.offers ?? []) {
            if (offer.model_id) currOffers.set(offer.model_id, offer.name ?? offer.model_id);
          }

          const prevOffers = new Map<string, string>();
          for (const offer of prevSnapshot?.offers ?? []) {
            if (offer.model_id) prevOffers.set(offer.model_id, offer.name ?? offer.model_id);
          }

          const shortHash = hash.slice(0, 7);
          const dateStr = commitDate.slice(0, 10);

          for (const [modelId, modelName] of currOffers.entries()) {
            if (!prevOffers.has(modelId)) {
              entries.push({
                id: `${shortHash}-${provider}-add-${modelId}`,
                date: dateStr,
                timestamp: commitDate,
                provider,
                providerName,
                type: "added",
                modelId,
                modelName,
                canonicalId: providerMappings?.get(modelId) ?? null,
                commitHash: shortHash,
                commitMessage,
              });
            }
          }

          for (const [modelId, modelName] of prevOffers.entries()) {
            if (!currOffers.has(modelId)) {
              entries.push({
                id: `${shortHash}-${provider}-remove-${modelId}`,
                date: dateStr,
                timestamp: commitDate,
                provider,
                providerName,
                type: "removed",
                modelId,
                modelName,
                canonicalId: providerMappings?.get(modelId) ?? null,
                commitHash: shortHash,
                commitMessage,
              });
            }
          }
        }
      }
    }

    // Check for uncommitted working tree changes
    const workingDiff = runGit(["diff", "--name-only", "HEAD", "--", relSnapshots], gitRoot);
    const untracked = runGit(
      ["ls-files", "--others", "--exclude-standard", "--", relSnapshots],
      gitRoot,
    );
    const pendingFiles = new Set(
      [...(workingDiff?.split("\n") ?? []), ...(untracked?.split("\n") ?? [])].filter(Boolean),
    );

    if (pendingFiles.size > 0) {
      const nowIso = new Date(now).toISOString();
      const nowDate = nowIso.slice(0, 10);

      for (const relFile of pendingFiles) {
        const fullPath = join(gitRoot, relFile);
        let currRaw: string | null = null;
        if (existsSync(fullPath)) {
          try {
            currRaw = readFileSync(fullPath, "utf8");
          } catch {
            currRaw = null;
          }
        }
        const headRaw = runGit(["show", `HEAD:${relFile}`], gitRoot);

        const currSnapshot = parseSnapshotJson(currRaw);
        const headSnapshot = parseSnapshotJson(headRaw);

        const provider =
          currSnapshot?.provider ??
          headSnapshot?.provider ??
          relFile.replace(/^.*\/([a-z0-9-]+)\.json$/, "$1");
        const providerName = getProviderName(provider, currSnapshot?.name ?? headSnapshot?.name);
        const providerMappings = mappings.get(provider);

        const currOffers = new Map<string, string>();
        for (const offer of currSnapshot?.offers ?? []) {
          if (offer.model_id) currOffers.set(offer.model_id, offer.name ?? offer.model_id);
        }

        const headOffers = new Map<string, string>();
        for (const offer of headSnapshot?.offers ?? []) {
          if (offer.model_id) headOffers.set(offer.model_id, offer.name ?? offer.model_id);
        }

        for (const [modelId, modelName] of currOffers.entries()) {
          if (!headOffers.has(modelId)) {
            entries.push({
              id: `working-${provider}-add-${modelId}`,
              date: nowDate,
              timestamp: nowIso,
              provider,
              providerName,
              type: "added",
              modelId,
              modelName,
              canonicalId: providerMappings?.get(modelId) ?? null,
              commitMessage: "Working directory changes",
            });
          }
        }

        for (const [modelId, modelName] of headOffers.entries()) {
          if (!currOffers.has(modelId)) {
            entries.push({
              id: `working-${provider}-remove-${modelId}`,
              date: nowDate,
              timestamp: nowIso,
              provider,
              providerName,
              type: "removed",
              modelId,
              modelName,
              canonicalId: providerMappings?.get(modelId) ?? null,
              commitMessage: "Working directory changes",
            });
          }
        }
      }
    }
  }

  // If previous changelog file exists, merge its entries (useful if git history was truncated)
  if (existsSync(paths.changelog)) {
    try {
      const existingDoc = await readValidatedJson(
        paths.changelog,
        changelogDocumentSchema,
        "Existing changelog",
      );
      for (const entry of existingDoc.entries) {
        entries.push(entry);
      }
    } catch {
      // Ignore existing changelog read issues
    }
  }

  // Deduplicate entries by unique signature
  const seen = new Set<string>();
  const uniqueEntries: ChangelogEntry[] = [];

  for (const entry of entries) {
    const key = `${entry.commitHash ?? "local"}:${entry.provider}:${entry.modelId}:${entry.type}:${entry.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEntries.push(entry);
    }
  }

  // Filter strictly to past windowDays only
  const filteredEntries = uniqueEntries.filter((entry) => {
    const time = Date.parse(entry.timestamp);
    return !Number.isNaN(time) && time >= cutoffTime;
  });

  // Sort newest first: timestamp desc, then provider, then modelId
  filteredEntries.sort((a, b) => {
    const timeA = Date.parse(a.timestamp);
    const timeB = Date.parse(b.timestamp);
    if (timeB !== timeA) return timeB - timeA;
    const pComp = compareStrings(a.provider, b.provider);
    if (pComp !== 0) return pComp;
    const mComp = compareStrings(a.modelId, b.modelId);
    if (mComp !== 0) return mComp;
    return compareStrings(a.type, b.type);
  });

  const totalAdded = filteredEntries.filter((e) => e.type === "added").length;
  const totalRemoved = filteredEntries.filter((e) => e.type === "removed").length;

  const document: ChangelogDocument = {
    generatedAt: new Date(now).toISOString(),
    windowDays,
    since: cutoffIso,
    totalAdded,
    totalRemoved,
    entries: filteredEntries,
  };

  const validatedDocument = changelogDocumentSchema.parse(document);
  await writeTextAtomically(outputPath, serializeJson(validatedDocument));

  return validatedDocument;
}
