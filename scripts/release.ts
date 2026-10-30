import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Commit = { sha: string; subject: string; body: string; pr?: number };
export type Change = {
  type: string;
  scope?: string;
  breaking: boolean;
  description: string;
  sha: string;
  pr?: number;
};
export type Bump = "major" | "minor" | "patch";

type Component = { name: string; path: string; latest: boolean };

// Each component is released on its own tag line (`json-v1.2.3`, `web-v1.2.3`). The JSON
// release is marked latest so `releases/latest/download/free-models.json` stays stable.
export const components: Component[] = [
  { name: "json", path: "packages/json", latest: true },
  { name: "web", path: "apps/web", latest: false },
];

const sections = [
  { title: "Features", types: ["feat"] },
  { title: "Bug Fixes", types: ["fix"] },
  { title: "Performance", types: ["perf"] },
  { title: "Reverts", types: ["revert"] },
];
const releasable = new Set(sections.flatMap((section) => section.types));
const header = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<description>.+)$/;
const squashSuffix = /\s+\(#(\d+)\)$/;
const semver = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseCommit(commit: Commit): Change | undefined {
  const groups = header.exec(commit.subject.trim())?.groups;
  if (!groups?.type || !groups.description) return undefined;
  const squashed = squashSuffix.exec(groups.description);
  return {
    type: groups.type,
    scope: groups.scope,
    breaking: Boolean(groups.bang) || /^BREAKING[ -]CHANGE:/m.test(commit.body),
    description: squashed ? groups.description.slice(0, squashed.index) : groups.description,
    sha: commit.sha,
    pr: commit.pr ?? (squashed ? Number(squashed[1]) : undefined),
  };
}

export function bumpFor(changes: Change[]): Bump | undefined {
  if (changes.some((change) => change.breaking)) return "major";
  if (changes.some((change) => change.type === "feat")) return "minor";
  if (changes.some((change) => releasable.has(change.type))) return "patch";
  return undefined;
}

// Before 1.0.0 a breaking change bumps the minor version instead of the major version.
export function nextVersion(version: string, bump: Bump): string {
  const match = semver.exec(version);
  if (!match) throw new Error(`Unsupported version "${version}"`);
  const [major, minor, patch] = match.slice(1).map(Number) as [number, number, number];
  if (bump === "major" && major > 0) return `${major + 1}.0.0`;
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  return `${major}.${minor + 1}.0`;
}

export function renderNotes(input: {
  repository: string;
  component: string;
  previousTag?: string;
  tag: string;
  changes: Change[];
}): string {
  const base = `https://github.com/${input.repository}`;
  const groups = [
    { title: "Breaking Changes", items: input.changes.filter((change) => change.breaking) },
    ...sections.map((section) => ({
      title: section.title,
      items: input.changes.filter(
        (change) => !change.breaking && section.types.includes(change.type),
      ),
    })),
  ];
  const lines: string[] = [];
  for (const group of groups) {
    const seen = new Set<string>();
    const items = group.items.filter((change) => {
      const key = change.description.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (items.length === 0) continue;
    lines.push(`## ${group.title}`, "");
    for (const change of items) {
      const scopes = change.scope?.split(",").map((scope) => scope.trim()) ?? [];
      const label =
        scopes.length && !scopes.includes(input.component) ? `**${change.scope}:** ` : "";
      const pr = change.pr ? ` ([#${change.pr}](${base}/pull/${change.pr}))` : "";
      const commit = ` ([${change.sha.slice(0, 7)}](${base}/commit/${change.sha}))`;
      lines.push(`- ${label}${change.description}${pr}${commit}`);
    }
    lines.push("");
  }
  lines.push(
    input.previousTag
      ? `**Full changelog**: ${base}/compare/${input.previousTag}...${input.tag}`
      : `**Full changelog**: ${base}/commits/${input.tag}`,
  );
  return `${lines.join("\n")}\n`;
}

function run(command: string[], stdin?: string): string {
  const result = Bun.spawnSync(command, {
    stdin: stdin === undefined ? "ignore" : Buffer.from(stdin),
    stderr: "inherit",
  });
  if (result.exitCode !== 0) throw new Error(`${command.join(" ")} exited with ${result.exitCode}`);
  return result.stdout.toString();
}

const git = (...args: string[]) => run(["git", ...args]);

// Maps each commit to the pull request whose merge commit brought it onto the main line.
function pullRequests(range: string): Map<string, number> {
  const numbers = new Map<string, number>();
  for (const line of git("log", "--first-parent", "--merges", "--format=%P%x1f%s", range).split(
    "\n",
  )) {
    const [parents = "", subject = ""] = line.split("\x1f");
    const number = /^Merge pull request #(\d+)/.exec(subject)?.[1];
    const [first, second] = parents.split(" ");
    if (!number || !first || !second) continue;
    for (const sha of git("rev-list", second, `^${first}`).split("\n").filter(Boolean)) {
      numbers.set(sha, Number(number));
    }
  }
  return numbers;
}

function commitsSince(range: string, path: string): Commit[] {
  const numbers = pullRequests(range);
  return git("log", "--no-merges", "--format=%H%x1f%s%x1f%b%x1e", range, "--", path)
    .split("\x1e")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [sha = "", subject = "", body = ""] = entry.split("\x1f");
      return { sha, subject, body, pr: numbers.get(sha) };
    });
}

function packageVersion(path: string): string {
  const { version } = JSON.parse(readFileSync(join(path, "package.json"), "utf8"));
  if (typeof version !== "string") throw new Error(`${path}/package.json has no version`);
  return version;
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const assets = new Map<string, string[]>();
  for (const [index, arg] of args.entries()) {
    if (arg !== "--asset") continue;
    const [component, file] = (args[index + 1] ?? "").split("=");
    if (!component || !file) throw new Error("--asset expects <component>=<file>");
    assets.set(component, [...(assets.get(component) ?? []), file]);
  }
  const repository =
    process.env.GITHUB_REPOSITORY ??
    run(["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]).trim();
  const head = git("rev-parse", "HEAD").trim();

  for (const component of components) {
    const previousTag =
      git("tag", "--list", `${component.name}-v*`, "--sort=-v:refname").split("\n")[0] || undefined;
    const range = previousTag ? `${previousTag}..${head}` : head;
    const changes = commitsSince(range, component.path)
      .map(parseCommit)
      .filter((change) => change !== undefined);
    const bump = bumpFor(changes);
    if (!bump) {
      console.log(`${component.name}: no releasable changes since ${previousTag ?? "the start"}`);
      continue;
    }
    // The first release uses the version already declared in package.json.
    const version = previousTag
      ? nextVersion(previousTag.slice(`${component.name}-v`.length), bump)
      : packageVersion(component.path);
    const tag = `${component.name}-v${version}`;
    const notes = renderNotes({
      repository,
      component: component.name,
      previousTag,
      tag,
      changes,
    });
    if (dryRun) {
      console.log(`# ${component.name} v${version} (${tag})\n\n${notes}`);
      continue;
    }
    run(
      [
        "gh",
        "release",
        "create",
        tag,
        ...(assets.get(component.name) ?? []),
        "--repo",
        repository,
        "--target",
        head,
        "--title",
        `${component.name} v${version}`,
        "--notes-file",
        "-",
        `--latest=${component.latest}`,
      ],
      notes,
    );
    console.log(`${component.name}: released ${tag}`);
  }
}
