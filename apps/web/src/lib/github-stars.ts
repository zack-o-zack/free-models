import { siteConfig } from "./config";

let pending: Promise<number | null> | undefined;

export function fetchGitHubStars(): Promise<number | null> {
  // Share the header and hero request, but fetch again on the next visit.
  pending ??= fetch(`https://api.github.com/repos${new URL(siteConfig.links.github).pathname}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json();
      const count = data?.stargazers_count;
      return typeof count === "number" && Number.isSafeInteger(count) && count >= 0 ? count : null;
    })
    .catch(() => null)
    .finally(() => {
      pending = undefined;
    });

  return pending;
}
