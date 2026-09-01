import { Boxes } from "lucide-react";
import Link from "next/link";

import { GitHubLink } from "@/components/github-link";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SiteHeader({ modelCount }: { modelCount: number }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6">
        <Link className="flex items-center gap-2 font-heading font-semibold" href="/">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="size-4" />
          </span>
          <span>Free Models</span>
          <Badge className="hidden sm:inline-flex" variant="secondary">
            {modelCount} models
          </Badge>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Primary navigation">
          <Button
            className="hover:text-primary"
            render={<Link href="/#models" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            Models
          </Button>
          <ModeToggle />
          <GitHubLink />
        </nav>
      </div>
    </header>
  );
}
