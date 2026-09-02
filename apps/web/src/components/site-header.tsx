import { ArrowDownRight } from "lucide-react";
import Link from "next/link";

import { GitHubLink } from "@/components/github-link";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="relative flex size-10 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground"
    >
      <span className="absolute h-2.5 w-6 -translate-x-1 -skew-x-[28deg] rounded-sm bg-current" />
      <span className="absolute h-2.5 w-6 translate-x-1 translate-y-2 -skew-x-[28deg] rounded-sm bg-current" />
    </span>
  );
}

export function SiteHeader({ modelCount }: { modelCount: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/90 backdrop-blur-xl supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8">
        <Link className="flex items-center gap-3" href="/">
          <BrandMark />
          <span className="font-heading text-lg font-extrabold tracking-[-0.03em]">
            Free Models
          </span>
          <span className="hidden rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted-foreground sm:inline-flex">
            {modelCount} live
          </span>
        </Link>
        <nav className="flex items-center gap-1.5" aria-label="Primary navigation">
          <Button
            className="hidden sm:inline-flex"
            render={<Link href="/#models" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            Explore models
          </Button>
          <ModeToggle />
          <GitHubLink />
          <Button
            className="ml-1 hidden md:inline-flex"
            render={<Link href="/#models" />}
            nativeButton={false}
            size="sm"
          >
            Start exploring <ArrowDownRight />
          </Button>
        </nav>
      </div>
    </header>
  );
}
