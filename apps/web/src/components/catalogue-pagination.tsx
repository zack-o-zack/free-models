import Link from "next/link";
import { cataloguePageCount, cataloguePageHref } from "@/lib/catalogue-pagination";

export function CataloguePagination({ page, total }: { page: number; total: number }) {
  const pages = cataloguePageCount(total);
  if (pages <= 1) return null;

  return (
    <nav aria-label="Catalogue pages" className="sr-only">
      {page > 1 && (
        <Link prefetch={false} href={cataloguePageHref(page - 1)} rel="prev">
          Previous page
        </Link>
      )}
      <span>
        Page {page} of {pages} · {total} models
      </span>
      {page < pages && (
        <Link prefetch={false} href={cataloguePageHref(page + 1)} rel="next">
          Next page
        </Link>
      )}
    </nav>
  );
}
