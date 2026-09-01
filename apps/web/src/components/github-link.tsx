import Link from "next/link";
import * as React from "react";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/lib/config";

export function GitHubLink() {
  return (
    <Button
      render={
        <Link
          href={siteConfig.links.github}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository"
        />
      }
      nativeButton={false}
      size="sm"
      variant="ghost"
      className="h-8 shadow-none hover:text-primary"
    >
      <Icons.gitHub />
      <React.Suspense fallback={<Skeleton className="h-4 w-[42px]" />}>
        <StarsCount />
      </React.Suspense>
    </Button>
  );
}

async function getStarsCount(): Promise<string | null> {
  try {
    const repoPath = siteConfig.links.github.replace("https://github.com/", "");
    const data = await fetch(`https://api.github.com/repos/${repoPath}`, {
      next: { revalidate: 86400 },
    });
    if (!data.ok) {
      return null;
    }
    const json = await data.json();

    if (json.stargazers_count === undefined || json.stargazers_count === null) {
      return null;
    }

    return json.stargazers_count >= 1000
      ? `${Math.round(json.stargazers_count / 1000)}k`
      : json.stargazers_count.toLocaleString();
  } catch {
    return null;
  }
}

export async function StarsCount() {
  const formattedCount = await getStarsCount();

  if (!formattedCount) {
    return null;
  }

  return <span className="w-fit text-xs text-muted-foreground tabular-nums">{formattedCount}</span>;
}
