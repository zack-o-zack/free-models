import Link from "next/link";
import { Fragment } from "react";
import type { BreadcrumbItem } from "@/lib/page-content";
import { cn } from "@/lib/utils";

export function PageBreadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex flex-wrap items-center gap-2 text-sm text-muted-foreground", className)}
    >
      {items.map((item, index) => (
        <Fragment key={item.href}>
          {index > 0 && <span aria-hidden="true">/</span>}
          {index === items.length - 1 ? (
            <span aria-current="page" className="break-words text-foreground">
              {item.name}
            </span>
          ) : (
            <Link
              href={item.href}
              className="rounded-lg underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {item.name}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
