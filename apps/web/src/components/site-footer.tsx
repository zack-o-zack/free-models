import { ArrowRight, ArrowUp, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Icons } from "@/components/icons";
import { SiteLogo } from "@/components/site-logo";
import { siteConfig } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-background text-foreground">
      <div className="container pt-10 sm:pt-12">
        <div className="grid gap-8 pb-8 sm:pb-10 md:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] md:gap-16">
          <div>
            <Link
              href="/"
              aria-label="Free Models home"
              className="inline-flex rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            >
              <SiteLogo />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Free AI models, providers, and benchmarks in one place. Find the right fit for your
              next idea.
            </p>
          </div>

          <nav aria-label="Footer navigation" className="grid content-start gap-2">
            <Link
              href="/#models"
              className="group flex min-h-14 items-center justify-between gap-4 rounded-2xl bg-primary px-5 py-3 text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span className="text-sm font-semibold">Explore the catalogue</span>
              <ArrowRight
                aria-hidden="true"
                className="size-5 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
              />
            </Link>
            <Link
              href={siteConfig.links.github}
              rel="noreferrer"
              target="_blank"
              className="group flex min-h-14 items-center justify-between gap-4 rounded-2xl px-5 py-3 transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold">
                <Icons.gitHub className="size-4 shrink-0" />
                View on GitHub
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
              />
              <span className="sr-only">(opens in a new tab)</span>
            </Link>
          </nav>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-border py-4 text-xs">
          <p className="leading-5 text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.name}. Directory of free AI models, zero-cost
            LLM API providers, and live model benchmarks.
          </p>
          <a
            href="#site-top"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Back to top <ArrowUp aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
