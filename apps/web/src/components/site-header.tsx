import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { CatalogueNavigation } from "@/components/catalogue-navigation";
import { GitHubLink } from "@/components/github-link";
import { ModeToggle } from "@/components/mode-toggle";
import { SiteLogo } from "@/components/site-logo";
import { Button } from "@/components/ui/button";

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
          <div className="hidden sm:block">
            <GitHubLink stars={githubStars} />
          </div>
          <ModeToggle />
          <Button
            className="ml-2 hidden h-12 gap-4 rounded-[24px] px-5 hover:bg-primary-hover md:inline-flex"
            render={<Link href="/#models" />}
            nativeButton={false}
          >
            Browse models <ArrowUpRight aria-hidden="true" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
