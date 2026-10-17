import { z } from "zod";
import { allowedCataloguePath } from "./policy.ts";

export const pullSchema = z.object({
  state: z.literal("open"),
  draft: z.literal(false),
  user: z.object({ login: z.literal("github-actions[bot]") }),
  head: z.object({ sha: z.string(), ref: z.string(), repo: z.object({ full_name: z.string() }) }),
  base: z.object({ sha: z.string(), ref: z.string(), repo: z.object({ full_name: z.string() }) }),
});

export function assertMergeCandidate(
  raw: unknown,
  expected: { repository: string; head: string; base: string; branch: string },
  files: string[],
  reviews: { state: string }[],
): void {
  const pr = pullSchema.parse(raw);
  if (
    pr.head.sha !== expected.head ||
    pr.base.sha !== expected.base ||
    pr.head.ref !== "automation/free-model-catalogue" ||
    pr.base.ref !== expected.branch ||
    pr.head.repo.full_name !== expected.repository ||
    pr.base.repo.full_name !== expected.repository
  )
    throw new Error("PR identity, head or base changed; retry from fresh baseline");
  if (!files.length || files.some((file) => !allowedCataloguePath(file)))
    throw new Error("PR exceeds catalogue-only scope");
  if (reviews.some((review) => review.state === "CHANGES_REQUESTED"))
    throw new Error("Human requested changes; automatic merge stopped");
}

if (import.meta.main) {
  const repository = process.env.GITHUB_REPOSITORY;
  const number = process.env.PR_NUMBER;
  const head = process.env.HEAD_SHA;
  const base = process.env.BASE_SHA;
  const branch = process.env.DEFAULT_BRANCH;
  if (!repository || !number || !head || !base || !branch) throw new Error("Missing merge context");
  function gh(args: string[]): string {
    const result = Bun.spawnSync(["gh", ...args], { stdout: "pipe", stderr: "inherit" });
    if (result.exitCode !== 0)
      throw new Error("GitHub operation failed; no protection bypass attempted");
    return result.stdout.toString();
  }
  const route = `repos/${repository}/pulls/${number}`;
  const pr: unknown = JSON.parse(gh(["api", route]));
  const files = JSON.parse(gh(["api", "--paginate", "--slurp", `${route}/files?per_page=100`])) as {
    filename: string;
  }[][];
  const reviews = JSON.parse(
    gh(["api", "--paginate", "--slurp", `${route}/reviews?per_page=100`]),
  ) as { state: string }[][];
  assertMergeCandidate(
    pr,
    { repository, head, base, branch },
    files.flat().map((file) => file.filename),
    reviews.flat(),
  );
  // A non-forced fast-forward installs exactly the validated tree. If main advances,
  // GitHub rejects it atomically instead of merging new, unvalidated base content.
  const result = JSON.parse(
    gh([
      "api",
      "--method",
      "PATCH",
      `repos/${repository}/git/refs/heads/${encodeURIComponent(branch)}`,
      "-f",
      `sha=${head}`,
      "-F",
      "force=false",
    ]),
  );
  if (result.object?.sha !== head)
    throw new Error("GitHub declined merge; retained proposal for next run");
}
