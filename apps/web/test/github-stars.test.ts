import { afterEach, expect, test } from "bun:test";
import { fetchGitHubStars } from "../src/lib/github-stars";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("shares an in-flight star request and fetches fresh data on the next visit", async () => {
  let requests = 0;
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    expect(String(url)).toBe("https://api.github.com/repos/zack-o-zack/free-models-backend");
    expect(init?.cache).toBe("no-store");
    requests += 1;
    return Response.json({ stargazers_count: requests });
  }) as unknown as typeof fetch;

  expect(await Promise.all([fetchGitHubStars(), fetchGitHubStars()])).toEqual([1, 1]);
  expect(requests).toBe(1);
  expect(await fetchGitHubStars()).toBe(2);
});

test("accepts zero stars and preserves the fallback for failed or malformed responses", async () => {
  for (const count of [0, 42, -1, 1.5, "42", null, undefined]) {
    globalThis.fetch = (async () =>
      Response.json({ stargazers_count: count })) as unknown as typeof fetch;
    expect(await fetchGitHubStars()).toBe(count === 0 || count === 42 ? count : null);
  }

  globalThis.fetch = (async () => new Response(null, { status: 403 })) as unknown as typeof fetch;
  expect(await fetchGitHubStars()).toBeNull();
  globalThis.fetch = (async () => {
    throw new Error("Network unavailable");
  }) as unknown as typeof fetch;
  expect(await fetchGitHubStars()).toBeNull();
});
