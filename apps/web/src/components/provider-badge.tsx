"use client";

import Link from "next/link";
import { BrandImage } from "@/components/brand-image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProviderDoc } from "@/lib/model-types";
import { getProviderName, providerFaviconUrl, publisherFaviconUrl } from "@/lib/provider-logos";
import { cn } from "@/lib/utils";

function initials(value: string): string {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProviderBadge({
  provider,
  docs,
  publisher = false,
  iconOnly = false,
  plain = false,
  size = "default",
  names,
  href,
}: {
  provider: string;
  docs?: ProviderDoc;
  publisher?: boolean;
  iconOnly?: boolean;
  plain?: boolean;
  size?: "default" | "lg" | "xl";
  names?: Record<string, string>;
  href?: string;
}) {
  const label = getProviderName(provider, names);
  const logoUrl = publisher ? publisherFaviconUrl(provider) : providerFaviconUrl(docs);

  if (iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger
          aria-label={label}
          className="inline-flex size-6 shrink-0 rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          render={href ? <Link href={href} /> : <button type="button" />}
        >
          <Avatar aria-hidden="true" className="size-6">
            {logoUrl && <BrandImage alt="" className="object-contain" src={logoUrl} />}
            <AvatarFallback className="text-[8px]">{initials(label)}</AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }

  if (plain) {
    return (
      <div
        className={cn(
          "inline-flex min-w-0 items-center text-foreground",
          size === "xl"
            ? "gap-3 font-heading text-xl font-extrabold tracking-tight"
            : size === "lg"
              ? "gap-2 text-sm"
              : "gap-1.5 text-xs",
        )}
      >
        <Avatar className={size === "xl" ? "size-8" : size === "lg" ? "size-5" : "size-4"}>
          {logoUrl && <BrandImage alt="" className="object-contain" src={logoUrl} />}
          <AvatarFallback
            className={
              size === "xl" ? "text-xs font-bold" : size === "lg" ? "text-[8px]" : "text-[6px]"
            }
          >
            {initials(label)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 break-words">{label}</span>
      </div>
    );
  }

  return (
    <Badge
      className={
        size === "xl"
          ? "h-11 gap-3 px-4 font-heading text-lg font-bold"
          : size === "lg"
            ? "h-7 gap-2 px-2.5 text-sm"
            : "gap-1.5"
      }
      variant="secondary"
    >
      {logoUrl && (
        <Avatar className={size === "xl" ? "size-7" : size === "lg" ? "size-5" : "size-3.5"}>
          <BrandImage alt="" className="object-contain" src={logoUrl} />
          <AvatarFallback
            className={size === "xl" ? "text-xs" : size === "lg" ? "text-[9px]" : "text-[7px]"}
          >
            {initials(label)}
          </AvatarFallback>
        </Avatar>
      )}
      {label}
    </Badge>
  );
}
