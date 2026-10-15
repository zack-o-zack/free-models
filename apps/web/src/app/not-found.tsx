import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { notFoundContent } from "@/lib/page-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = {
  ...pageMetadata(notFoundContent.title, notFoundContent.description),
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <main id="top" tabIndex={-1} className="container flex-1 py-24">
        <p className="text-sm font-semibold text-muted-foreground">404</p>
        <h1 className="mt-4 font-heading text-4xl font-extrabold">{notFoundContent.title}</h1>
        <p data-page-description className="mt-4 max-w-lg text-muted-foreground">
          {notFoundContent.description}
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
