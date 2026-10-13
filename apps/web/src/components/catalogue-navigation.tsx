"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { href: "/providers", label: "Providers" },
  { href: "/publishers", label: "Publishers" },
];

export function CatalogueNavigation() {
  const pathname = usePathname();
  return (
    <>
      <div className="hidden items-center gap-5 text-sm font-semibold lg:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname.startsWith(link.href) ? "page" : undefined}
            className="inline-flex min-h-12 items-center rounded-lg underline-offset-4 hover:underline aria-[current=page]:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button aria-label="Browse catalogue" variant="ghost" size="icon-lg" />}
          >
            <Menu aria-hidden="true" className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {[{ href: "/#models", label: "Models" }, ...links].map((link) => (
              <DropdownMenuItem
                key={link.href}
                render={<Link href={link.href} />}
                className="min-h-12 px-4"
              >
                {link.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
