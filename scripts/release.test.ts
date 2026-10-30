import { expect, test } from "bun:test";
import { bumpFor, type Change, nextVersion, parseCommit, renderNotes } from "./release";

const change = (overrides: Partial<Change>): Change => ({
  type: "fix",
  breaking: false,
  description: "repair something",
  sha: "0123456789abcdef0123456789abcdef01234567",
  ...overrides,
});

test("parses conventional commit subjects", () => {
  expect(
    parseCommit({ sha: "a", subject: "feat(web,json): add ZDR filters", body: "", pr: 121 }),
  ).toEqual({
    type: "feat",
    scope: "web,json",
    breaking: false,
    description: "add ZDR filters",
    sha: "a",
    pr: 121,
  });
  expect(parseCommit({ sha: "a", subject: "Improve SEO and marketing copy", body: "" })).toBe(
    undefined,
  );
});

test("detects breaking changes and squash-merge pull request numbers", () => {
  expect(
    parseCommit({ sha: "a", subject: "feat!: drop schema v3 (#130)", body: "" }),
  ).toMatchObject({ breaking: true, description: "drop schema v3", pr: 130 });
  expect(
    parseCommit({ sha: "a", subject: "refactor: rename fields", body: "BREAKING CHANGE: renamed" }),
  ).toMatchObject({ breaking: true });
});

test("only feature, fix, performance, revert, and breaking commits release", () => {
  expect(bumpFor([change({ type: "chore" }), change({ type: "docs" })])).toBe(undefined);
  expect(bumpFor([change({ type: "chore" }), change({ type: "fix" })])).toBe("patch");
  expect(bumpFor([change({ type: "fix" }), change({ type: "feat" })])).toBe("minor");
  expect(bumpFor([change({ type: "refactor", breaking: true })])).toBe("major");
});

test("keeps breaking changes inside the minor version before 1.0.0", () => {
  expect(nextVersion("0.1.0", "patch")).toBe("0.1.1");
  expect(nextVersion("0.1.3", "minor")).toBe("0.2.0");
  expect(nextVersion("0.4.2", "major")).toBe("0.5.0");
  expect(nextVersion("1.4.2", "major")).toBe("2.0.0");
  expect(() => nextVersion("1.0.0-beta.1", "patch")).toThrow();
});

test("renders grouped, deduplicated release notes", () => {
  const notes = renderNotes({
    repository: "owner/repo",
    component: "web",
    previousTag: "web-v0.1.0",
    tag: "web-v0.2.0",
    changes: [
      change({ type: "feat", scope: "web", description: "add compare page", pr: 101 }),
      change({ type: "feat", scope: "web,json", description: "add ZDR filters" }),
      change({ type: "fix", scope: "deps", description: "patch advisory" }),
      change({ type: "fix", scope: "deps", description: "Patch advisory" }),
      change({ type: "chore", description: "update free model catalogue" }),
      change({ type: "feat", breaking: true, description: "drop legacy routes" }),
    ],
  });
  expect(notes).toBe(`## Breaking Changes

- drop legacy routes ([0123456](https://github.com/owner/repo/commit/0123456789abcdef0123456789abcdef01234567))

## Features

- add compare page ([#101](https://github.com/owner/repo/pull/101)) ([0123456](https://github.com/owner/repo/commit/0123456789abcdef0123456789abcdef01234567))
- add ZDR filters ([0123456](https://github.com/owner/repo/commit/0123456789abcdef0123456789abcdef01234567))

## Bug Fixes

- **deps:** patch advisory ([0123456](https://github.com/owner/repo/commit/0123456789abcdef0123456789abcdef01234567))

**Full changelog**: https://github.com/owner/repo/compare/web-v0.1.0...web-v0.2.0
`);
});
