"use client";

import { ArrowLeftRight, ArrowRight, ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandImage } from "@/components/brand-image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const providerIcons = [
  { name: "OpenRouter", src: "/brand-logos/559bd61484bc9b6e.png", fallback: "OR" },
  { name: "OpenCode", src: "/brand-logos/2844b8b8684246d6.png", fallback: "OC" },
  { name: "Vercel", src: "/brand-logos/454d6e2691d7c8eb.png", fallback: "V" },
];

const publisherIcons = [
  { name: "Gemini", src: "/brand-logos/84e056109ee46311.png", fallback: "G" },
  { name: "OpenAI", src: "/brand-logos/8dba942326ba6368.png", fallback: "OA" },
  { name: "Claude", src: "/brands/claude-code.svg", fallback: "C" },
];

function StackedIcons({ icons }: { icons: typeof providerIcons }) {
  return (
    <div className="flex items-center -space-x-1.5" aria-hidden="true">
      {icons.map((icon) => (
        <Avatar
          key={icon.name}
          className="size-5.5 rounded-full bg-card ring-2 ring-popover shadow-2xs"
        >
          <BrandImage src={icon.src} alt={icon.name} className="object-contain p-0.5" />
          <AvatarFallback className="rounded-full text-[7px] font-bold">
            {icon.fallback}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}

export function CatalogueNavigation() {
  const pathname = usePathname();
  const isModelsActive =
    pathname.startsWith("/providers") ||
    pathname.startsWith("/publishers") ||
    pathname.startsWith("/compare") ||
    pathname.startsWith("/models");

  return (
    <>
      <div className="hidden items-center gap-3 text-sm font-semibold md:flex">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className={cn(
                  "group/nav inline-flex min-h-12 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring cursor-pointer",
                  isModelsActive && "underline",
                )}
              />
            }
          >
            <span>Models</span>
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 text-muted-foreground transition-transform duration-200 group-data-popup-open/nav:rotate-180"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-60 rounded-2xl p-1.5 border border-border/80 shadow-xl"
          >
            <DropdownMenuItem
              render={<Link href="/#models" />}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer"
            >
              <span>All Models</span>
              <ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/providers" />}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer"
            >
              <span>Providers</span>
              <StackedIcons icons={providerIcons} />
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/publishers" />}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer"
            >
              <span>Publishers</span>
              <StackedIcons icons={publisherIcons} />
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/compare" />}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer"
            >
              <span>Compare Models</span>
              <ArrowLeftRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link
          href="/changelog"
          aria-current={pathname.startsWith("/changelog") ? "page" : undefined}
          className="inline-flex min-h-12 items-center rounded-lg px-2.5 underline-offset-4 hover:underline aria-[current=page]:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Changelog
        </Link>
      </div>

      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button aria-label="Browse catalogue" variant="ghost" size="icon-lg" />}
          >
            <Menu aria-hidden="true" className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-60 rounded-2xl p-1.5 border border-border/80 shadow-xl"
          >
            <DropdownMenuItem
              render={<Link href="/#models" />}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer"
            >
              <span>All Models</span>
              <ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/providers" />}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer"
            >
              <span>Providers</span>
              <StackedIcons icons={providerIcons} />
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/publishers" />}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer"
            >
              <span>Publishers</span>
              <StackedIcons icons={publisherIcons} />
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/compare" />}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer"
            >
              <span>Compare Models</span>
              <ArrowLeftRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/changelog" />}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer"
            >
              <span>Changelog</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
