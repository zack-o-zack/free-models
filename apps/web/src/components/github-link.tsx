import Link from "next/link";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
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
      <span className="sr-only">GitHub repository</span>
    </Button>
  );
}
