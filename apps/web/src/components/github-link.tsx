import Link from "next/link";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return count.toString();
}

interface GitHubLinkProps {
  stars: number;
}

export function GitHubLink({ stars }: GitHubLinkProps) {
  return (
    <Button
      render={
        <Link
          href={siteConfig.links.github}
          target="_blank"
          rel="noreferrer"
          aria-label={stars > 0 ? `GitHub repository, ${stars} stars` : "GitHub repository"}
        />
      }
      nativeButton={false}
      variant="ghost"
      className="size-12 gap-2 p-0 sm:w-auto sm:px-4"
    >
      <Icons.gitHub />
      <span className="hidden sm:inline">GitHub</span>
      {stars > 0 && (
        <span className="hidden border-l border-current/20 pl-2 text-xs tabular-nums text-muted-foreground sm:inline">
          {formatCount(stars)}
        </span>
      )}
    </Button>
  );
}
