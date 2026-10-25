"use client";

import { EyeOff, Shield, ShieldOff } from "lucide-react";
import type { MouseEvent } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  countryCodeToFlag,
  getCountryName,
  getProviderCompliance,
  type ProviderCompliance,
} from "@/lib/provider-compliance";
import { cn } from "@/lib/utils";

export interface ProviderComplianceBadgesProps {
  readonly provider: string;
  readonly className?: string;
  readonly size?: "sm" | "default" | "lg";
  readonly compliance?: ProviderCompliance;
}

function stopClick(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function ProviderComplianceBadges({
  provider,
  className,
  size = "default",
  compliance: propCompliance,
}: ProviderComplianceBadgesProps) {
  const compliance = propCompliance ?? getProviderCompliance(provider);

  if (!compliance) {
    return null;
  }

  const iconSize = size === "lg" ? "size-4" : size === "sm" ? "size-3" : "size-3.5";
  const pillPadding =
    size === "lg" ? "p-1.5 rounded-lg" : size === "sm" ? "p-0.5 rounded-[4px]" : "p-1 rounded-md";
  const flagTextSize = size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className={cn("inline-flex items-center gap-1.5 select-none", className)}>
      {/* Country Flag Emojis */}
      {compliance.countries.map((code) => {
        const flag = countryCodeToFlag(code);
        const name = getCountryName(code);
        return (
          <Tooltip key={code}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={stopClick}
                  aria-label={`Hosted in ${name}`}
                  className="inline-flex cursor-default items-center justify-center rounded px-0.5 transition-transform hover:scale-115 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                />
              }
            >
              <span role="img" aria-label={name} className={cn("leading-none", flagTextSize)}>
                {flag}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">Hosted in {name}</TooltipContent>
          </Tooltip>
        );
      })}

      {/* Zero Data Retention (Shield) */}
      {compliance.zdr ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={stopClick}
                aria-label="Zero Data Retention"
                className={cn(
                  "inline-flex cursor-default items-center justify-center border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
                  pillPadding,
                )}
              />
            }
          >
            <Shield className={iconSize} aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="top">Zero Data Retention</TooltipContent>
        </Tooltip>
      ) : compliance.dataRetention ? (
        /* Data Retained / Training (Shield crossed red) */
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={stopClick}
                aria-label="Data Retained · Prompts Used for Training"
                className={cn(
                  "inline-flex cursor-default items-center justify-center border border-destructive/20 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                  pillPadding,
                )}
              />
            }
          >
            <ShieldOff className={iconSize} aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="top">Data Retained · Prompts Used for Training</TooltipContent>
        </Tooltip>
      ) : null}

      {/* No Training on Prompts (Eye crossed out) */}
      {compliance.noTraining && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={stopClick}
                aria-label="No Model Training on Prompts"
                className={cn(
                  "inline-flex cursor-default items-center justify-center border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
                  pillPadding,
                )}
              />
            }
          >
            <EyeOff className={iconSize} aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="top">No Model Training on Prompts</TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}
