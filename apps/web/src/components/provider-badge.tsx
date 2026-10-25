"use client";

import Link from "next/link";
import { BrandImage } from "@/components/brand-image";
import { ProviderComplianceBadges } from "@/components/provider-compliance-badges";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProviderDoc } from "@/lib/model-types";
import { countryCodeToFlag, getProviderCompliance } from "@/lib/provider-compliance";
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
  fundingLabel,
  showCompliance = true,
}: {
  provider: string;
  docs?: ProviderDoc;
  publisher?: boolean;
  iconOnly?: boolean;
  plain?: boolean;
  size?: "default" | "lg" | "xl";
  names?: Record<string, string>;
  href?: string;
  fundingLabel?: string;
  showCompliance?: boolean;
}) {
  const label = getProviderName(provider, names);
  const logoUrl = publisher ? publisherFaviconUrl(provider) : providerFaviconUrl(docs);
  const compliance = !publisher ? getProviderCompliance(provider) : undefined;

  if (iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger
          aria-label={`${label} ${publisher ? "publisher" : "provider"}`}
          className="inline-flex size-6 shrink-0 rounded-[6px] border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          render={href ? <Link href={href} /> : <button type="button" />}
        >
          <Avatar aria-hidden="true" className="size-6 rounded-[6px]">
            {logoUrl && <BrandImage alt="" className="object-contain" src={logoUrl} />}
            <AvatarFallback className="text-[8px]">{label.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent>
          <span className="flex items-center gap-1.5 text-xs">
            <span>{label}</span>
            {compliance && (
              <>
                <span className="text-muted-foreground">·</span>
                <span>{compliance.countries.map((c) => countryCodeToFlag(c)).join(" ")}</span>
                <span className="text-muted-foreground">·</span>
                {compliance.zdr ? (
                  <span className="font-medium text-emerald-400">ZDR</span>
                ) : compliance.dataRetention ? (
                  <span className="font-medium text-red-400">Data Retained</span>
                ) : null}
              </>
            )}
            {fundingLabel && ` · ${fundingLabel}`}
          </span>
        </TooltipContent>
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
        <Avatar
          className={
            size === "xl"
              ? "size-8 rounded-[8px]"
              : size === "lg"
                ? "size-5 rounded-[5px]"
                : "size-4 rounded-[4px]"
          }
        >
          {logoUrl && <BrandImage alt="" className="object-contain" src={logoUrl} />}
          <AvatarFallback
            className={
              size === "xl" ? "text-xs font-bold" : size === "lg" ? "text-[8px]" : "text-[6px]"
            }
          >
            {initials(label)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 break-words flex flex-wrap items-center gap-2">
          <span>{label}</span>
          {!publisher && showCompliance && (
            <ProviderComplianceBadges provider={provider} size={size === "xl" ? "default" : "sm"} />
          )}
          {fundingLabel && (
            <span className="block text-xs font-normal text-muted-foreground">{fundingLabel}</span>
          )}
        </span>
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
        <Avatar
          className={
            size === "xl"
              ? "size-7 rounded-[7px]"
              : size === "lg"
                ? "size-5 rounded-[5px]"
                : "size-3.5 rounded-[3.5px]"
          }
        >
          <BrandImage alt="" className="object-contain" src={logoUrl} />
          <AvatarFallback
            className={size === "xl" ? "text-xs" : size === "lg" ? "text-[9px]" : "text-[7px]"}
          >
            {initials(label)}
          </AvatarFallback>
        </Avatar>
      )}
      <span>{label}</span>
      {!publisher && showCompliance && (
        <ProviderComplianceBadges provider={provider} size={size === "xl" ? "default" : "sm"} />
      )}
    </Badge>
  );
}
