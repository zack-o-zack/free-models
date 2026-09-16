"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getProviderName, providerFaviconUrl } from "@/lib/provider-logos";
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
  iconOnly = false,
  plain = false,
  size = "default",
  names,
}: {
  provider: string;
  iconOnly?: boolean;
  plain?: boolean;
  size?: "default" | "lg" | "xl";
  names?: Record<string, string>;
}) {
  const label = getProviderName(provider, names);
  const logoUrl = providerFaviconUrl(provider);

  if (iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger
          aria-label={label}
          className="inline-flex size-5 shrink-0 cursor-help rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          render={<button type="button" />}
        >
          <Avatar aria-hidden="true" className="size-5">
            {logoUrl && <AvatarImage alt="" className="object-contain p-0.5" src={logoUrl} />}
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
          "inline-flex items-center text-foreground",
          size === "xl"
            ? "gap-3 font-heading text-xl font-extrabold tracking-tight"
            : size === "lg"
              ? "gap-2 text-sm"
              : "gap-1.5 text-xs",
        )}
      >
        <Avatar className={size === "xl" ? "size-8" : size === "lg" ? "size-5" : "size-4"}>
          {logoUrl && <AvatarImage alt="" className="object-contain p-0.5" src={logoUrl} />}
          <AvatarFallback
            className={
              size === "xl" ? "text-xs font-bold" : size === "lg" ? "text-[8px]" : "text-[6px]"
            }
          >
            {initials(label)}
          </AvatarFallback>
        </Avatar>
        <span>{label}</span>
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
          <AvatarImage alt="" className="object-contain p-0.5" src={logoUrl} />
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
