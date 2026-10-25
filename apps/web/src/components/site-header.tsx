import Link from "next/link";

import { CatalogueNavigation } from "@/components/catalogue-navigation";
import { GitHubLink } from "@/components/github-link";
import { ModeToggle } from "@/components/mode-toggle";
import { SiteLogo } from "@/components/site-logo";

interface SiteHeaderProps {
  modelCount: number;
  githubStars: number;
}

export function SiteHeader({ modelCount, githubStars }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/95 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between gap-3 sm:h-24">
        <div className="flex items-center gap-6">
          <Link
            className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/"
            aria-label="Free Models home"
          >
            <SiteLogo />
          </Link>
          <span className="hidden border-l border-border pl-6 text-xs leading-5 text-muted-foreground 2xl:block">
            {modelCount} free models
          </span>
        </div>
        <nav className="flex items-center gap-1.5 sm:gap-3" aria-label="Primary navigation">
          <CatalogueNavigation />
          <ModeToggle />
          <GitHubLink stars={githubStars} />
        </nav>
      </div>
    </header>
  );
}
