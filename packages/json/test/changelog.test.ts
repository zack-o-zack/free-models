import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type ChangelogDocument,
  changelogDocumentSchema,
  generateChangelog,
} from "../src/catalogue/changelog.ts";
import { cataloguePaths, serializeJson, writeTextAtomically } from "../src/catalogue/files.ts";

describe("catalogue changelog", () => {
  test("enforces schema on changelog documents", () => {
    const doc: ChangelogDocument = {
      generatedAt: new Date().toISOString(),
      windowDays: 30,
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      totalAdded: 1,
      totalRemoved: 1,
      entries: [
        {
          id: "test-add-1",
          date: "2026-10-21",
          timestamp: "2026-10-21T10:00:00Z",
          provider: "mistral",
          providerName: "Mistral AI",
          type: "added",
          modelId: "mistral-small-latest",
          modelName: "Mistral Small",
          canonicalId: "mistralai/mistral-small",
        },
        {
          id: "test-remove-1",
          date: "2026-10-20",
          timestamp: "2026-10-20T10:00:00Z",
          provider: "openrouter",
          providerName: "OpenRouter",
          type: "removed",
          modelId: "old-model:free",
          modelName: "Old Model Free",
          canonicalId: null,
        },
      ],
    };

    expect(() => changelogDocumentSchema.parse(doc)).not.toThrow();
  });

  test("filters data to past 30 days strictly", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "changelog-test-"));
    try {
      const paths = cataloguePaths(workspace);
      const now = Date.parse("2026-10-21T12:00:00Z");

      // Seed an existing changelog with one recent and one 45-day-old entry
      const seedDoc: ChangelogDocument = {
        generatedAt: "2026-10-21T10:00:00Z",
        windowDays: 30,
        since: "2026-09-21T12:00:00Z",
        totalAdded: 2,
        totalRemoved: 0,
        entries: [
          {
            id: "recent-model",
            date: "2026-10-15",
            timestamp: "2026-10-15T00:00:00Z",
            provider: "groq",
            providerName: "Groq",
            type: "added",
            modelId: "recent/model",
            modelName: "Recent Model",
          },
          {
            id: "old-model",
            date: "2026-08-01",
            timestamp: "2026-08-01T00:00:00Z",
            provider: "groq",
            providerName: "Groq",
            type: "added",
            modelId: "old/model",
            modelName: "Old Model",
          },
        ],
      };

      await writeTextAtomically(paths.changelog, serializeJson(seedDoc));

      const generated = await generateChangelog(paths, [], {
        now,
        windowDays: 30,
        gitWorkspace: workspace, // Empty git so it relies on existing doc
      });

      expect(generated.entries).toHaveLength(1);
      expect(generated.entries[0]?.id).toBe("recent-model");
      expect(generated.totalAdded).toBe(1);
      expect(generated.totalRemoved).toBe(0);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  test("generates entries from working directory snapshot changes", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "changelog-working-"));
    try {
      const paths = cataloguePaths(workspace);
      const now = Date.parse("2026-10-21T12:00:00Z");

      // Create snapshot directory and a mapping
      await writeTextAtomically(
        join(paths.mappingsDirectory, "bazaarlink.json"),
        serializeJson({
          provider: "bazaarlink",
          mappings: {
            "custom/free-model": "custom/canonical-free-model",
          },
        }),
      );

      // Create initial changelog file
      const initialDoc: ChangelogDocument = {
        generatedAt: "2026-10-20T12:00:00Z",
        windowDays: 30,
        since: "2026-09-21T12:00:00Z",
        totalAdded: 1,
        totalRemoved: 0,
        entries: [
          {
            id: "prev-1",
            date: "2026-10-20",
            timestamp: "2026-10-20T12:00:00Z",
            provider: "bazaarlink",
            providerName: "BazaarLink",
            type: "added",
            modelId: "custom/free-model",
            modelName: "Custom Free Model",
            canonicalId: "custom/canonical-free-model",
          },
        ],
      };
      await writeTextAtomically(paths.changelog, serializeJson(initialDoc));

      const result = await generateChangelog(paths, [], {
        now,
        windowDays: 30,
        gitWorkspace: workspace,
      });

      expect(result.entries.length).toBeGreaterThanOrEqual(1);
      expect(result.entries[0]?.modelId).toBe("custom/free-model");
      expect(result.entries[0]?.canonicalId).toBe("custom/canonical-free-model");
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
});
