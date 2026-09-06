import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { siteConfig } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-heading text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">
            Build more. Spend less.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 opacity-70">
            A practical catalogue of free AI models, their providers, and the details that matter.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
          <Link className="inline-flex items-center gap-1 hover:text-primary" href="/#models">
            Models <ArrowUpRight className="size-4" />
          </Link>
          <Link
            className="inline-flex items-center gap-1 hover:text-primary"
            href={siteConfig.links.github}
            rel="noreferrer"
            target="_blank"
          >
            GitHub <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
