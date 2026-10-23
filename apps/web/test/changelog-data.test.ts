import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getChangelog } from "../src/lib/changelog-data";

test("getChangelog reads the local changelog document", async () => {
  const changelog = await getChangelog();
  expect(changelog).toBeDefined();
  expect(typeof changelog.generatedAt).toBe("string");
  expect(changelog.windowDays).toBe(30);
  expect(typeof changelog.totalAdded).toBe("number");
  expect(typeof changelog.totalRemoved).toBe("number");
  expect(Array.isArray(changelog.entries)).toBe(true);

  if (changelog.entries.length > 0) {
    const entry = changelog.entries[0];
    expect(entry.id).toBeDefined();
    expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(["added", "removed"]).toContain(entry.type);
    expect(typeof entry.provider).toBe("string");
    expect(typeof (entry.modelId ?? entry.modelName)).toBe("string");
  }
});

test("getChangelog returns default fallback when no document exists", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "web-changelog-test-"));
  try {
    const modulePath = new URL("../src/lib/changelog-data.ts", import.meta.url).pathname;
    const child = Bun.spawn(
      [
        "bun",
        "--eval",
        `
          import { getChangelog } from ${JSON.stringify(modulePath)};
          const result = await getChangelog();
          console.log(JSON.stringify({ windowDays: result.windowDays, entriesLength: result.entries.length }));
        `,
      ],
      { cwd: workspace, stdout: "pipe", stderr: "pipe" },
    );
    const output = await new Response(child.stdout).text();
    const errors = await new Response(child.stderr).text();
    expect(await child.exited, errors).toBe(0);
    expect(JSON.parse(output)).toEqual({
      windowDays: 30,
      entriesLength: 0,
    });
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
