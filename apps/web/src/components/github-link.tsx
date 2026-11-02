"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";
import { formatCount } from "@/lib/format-count";

import { fetchGitHubStars } from "@/lib/github-stars";
import styles from "./hero/hero-typographic-broadsheet.module.css";

interface GitHubLinkProps {
  stars: number;
}

function useGitHubStars(initialStars: number) {
  const [stars, setStars] = useState(initialStars);
  const pathname = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh on every client-side page visit
  useEffect(() => {
    let active = true;
    fetchGitHubStars().then((count) => {
      if (active && count !== null) setStars(count);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  return stars;
}

export function GitHubLink({ stars: initialStars }: GitHubLinkProps) {
  const stars = useGitHubStars(initialStars);
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

export function GitHubStarButton({ stars: initialStars }: GitHubLinkProps) {
  const stars = useGitHubStars(initialStars);

  return (
    <Link
      href={siteConfig.links.github}
      target="_blank"
      rel="noreferrer"
      aria-label={
        stars > 0
          ? `Star Free Models on GitHub. ${stars.toLocaleString()} stars.`
          : "Star Free Models on GitHub"
      }
      className={`${styles.starCta} inline-flex items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring`}
    >
      <Icons.gitHub className={styles.starIcon} />
      <span>Star on GitHub</span>
      {stars > 0 && (
        <span className={styles.starCount} aria-hidden="true">
          {formatCount(stars)}
        </span>
      )}
    </Link>
  );
}
