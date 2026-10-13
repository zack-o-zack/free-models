import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <>
      <main id="top" tabIndex={-1} className="container flex-1 py-24">
        <p className="text-sm font-semibold text-muted-foreground">404</p>
        <h1 className="mt-4 font-heading text-4xl font-extrabold">Page not found</h1>
        <p className="mt-4 max-w-lg text-muted-foreground">
          This page may have moved, or the model may no longer be in the free catalogue.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Browse free AI models
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
