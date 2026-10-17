import Link from "next/link";
import { cataloguePageCount, cataloguePageHref } from "@/lib/catalogue-pagination";

export function CataloguePagination({ page, total }: { page: number; total: number }) {
  const pages = cataloguePageCount(total);
  if (pages <= 1) return null;

  return (
    <nav
      aria-label="Catalogue pages"
      className="container flex flex-wrap items-center justify-center gap-6 py-8"
    >
      {page > 1 && (
        <Link
          prefetch={false}
          href={cataloguePageHref(page - 1)}
          rel="prev"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Previous page
        </Link>
      )}
      <span className="text-sm text-muted-foreground">
        Page {page} of {pages} · {total} models
      </span>
      {page < pages && (
        <Link
          prefetch={false}
          href={cataloguePageHref(page + 1)}
          rel="next"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Next page
        </Link>
      )}
    </nav>
  );
}
