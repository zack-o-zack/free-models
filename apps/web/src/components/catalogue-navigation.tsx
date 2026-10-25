"use client";

import { ArrowLeftRight, ArrowRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandImage } from "@/components/brand-image";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
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

function StackedBrandIcons({ icons }: { icons: typeof providerIcons }) {
  return (
    <AvatarGroup className="-space-x-1.5 *:data-[slot=avatar]:ring-popover">
      {icons.map((icon) => (
        <Avatar key={icon.name} className="size-5.5 rounded-full bg-card shadow-2xs">
          <BrandImage src={icon.src} alt={icon.name} className="object-contain p-0.5" />
          <AvatarFallback className="rounded-full text-[7px] font-bold">
            {icon.fallback}
          </AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
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
      <div className="hidden md:flex">
        <NavigationMenu>
          <NavigationMenuList className="gap-2">
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={cn(
                  "min-h-12 bg-transparent px-3 text-sm font-semibold underline-offset-4 hover:bg-transparent hover:underline focus:bg-transparent focus-visible:outline-2 focus-visible:outline-ring data-open:bg-transparent data-open:hover:bg-transparent data-popup-open:bg-transparent data-popup-open:hover:bg-transparent",
                  isModelsActive && "underline",
                )}
              >
                Models
              </NavigationMenuTrigger>
              <NavigationMenuContent className="w-64 rounded-2xl p-1.5 border border-border/80 shadow-xl">
                <ul className="grid gap-1">
                  <li>
                    <NavigationMenuLink
                      render={<Link href="/#models" />}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
                    >
                      <span>All Models</span>
                      <ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink
                      render={<Link href="/providers" />}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
                    >
                      <span>Providers</span>
                      <StackedBrandIcons icons={providerIcons} />
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink
                      render={<Link href="/publishers" />}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
                    >
                      <span>Publishers</span>
                      <StackedBrandIcons icons={publisherIcons} />
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink
                      render={<Link href="/compare" />}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
                    >
                      <span>Compare Models</span>
                      <ArrowLeftRight
                        aria-hidden="true"
                        className="size-3.5 text-muted-foreground"
                      />
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link href="/changelog" />}
                aria-current={pathname.startsWith("/changelog") ? "page" : undefined}
                className="inline-flex min-h-12 items-center rounded-lg px-3 text-sm font-semibold underline-offset-4 hover:bg-transparent hover:underline aria-[current=page]:underline focus:bg-transparent focus-visible:outline-2 focus-visible:outline-ring"
              >
                Changelog
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
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
              <StackedBrandIcons icons={providerIcons} />
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/publishers" />}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer"
            >
              <span>Publishers</span>
              <StackedBrandIcons icons={publisherIcons} />
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
