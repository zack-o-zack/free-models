"use client";

import { Clock, EyeOff, Shield, ShieldOff } from "lucide-react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  countryCodeToFlag,
  edgeGpuRegionLabel,
  getCountryName,
  getModelProviderCompliance,
  getProviderCompliance,
  isConditionalCompliance,
  type ProviderCompliance,
} from "@/lib/provider-compliance";
import { cn } from "@/lib/utils";

export interface ProviderComplianceBadgesProps {
  readonly provider: string;
  readonly modelId?: string;
  readonly className?: string;
  readonly size?: "sm" | "default" | "lg" | "xl";
  readonly compliance?: ProviderCompliance;
}

function stopClick(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

const SIZE_CONFIG = {
  sm: {
    height: "h-4 text-[10px]",
    separator: "h-3",
    icon: "size-3.5 stroke-[1.8]",
    flag: "text-[13px]",
    code: "text-[9.5px]",
    gap: "gap-1",
    margin: "ml-1",
  },
  default: {
    height: "h-5 text-xs",
    separator: "h-3.5",
    icon: "size-4 stroke-[1.7]",
    flag: "text-sm",
    code: "text-[10.5px]",
    gap: "gap-1.5",
    margin: "ml-1.5",
  },
  lg: {
    height: "h-6 text-xs",
    separator: "h-4",
    icon: "size-[18px] stroke-[1.7]",
    flag: "text-base",
    code: "text-[11px]",
    gap: "gap-1.5",
    margin: "ml-1.5",
  },
  xl: {
    height: "h-7 text-sm",
    separator: "h-[18px]",
    icon: "size-5 stroke-[1.8]",
    flag: "text-lg",
    code: "text-xs font-semibold",
    gap: "gap-2",
    margin: "ml-2",
  },
} as const;

interface SimpleTooltipProps {
  readonly children: ReactNode;
  readonly text: string;
  readonly ariaLabel: string;
}

function SimpleTooltip({ children, text, ariaLabel }: SimpleTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={stopClick}
            aria-label={ariaLabel}
            className="inline-flex cursor-default items-center justify-center self-center outline-none transition-opacity hover:opacity-80 focus-visible:ring-1 focus-visible:ring-ring rounded-xs"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">{text}</TooltipContent>
    </Tooltip>
  );
}

const separatorCenterStyle: CSSProperties = {
  alignSelf: "center",
};

export function ProviderComplianceBadges({
  provider,
  modelId,
  className,
  size = "default",
  compliance: propCompliance,
}: ProviderComplianceBadgesProps) {
  const compliance =
    propCompliance ??
    (modelId ? getModelProviderCompliance(modelId, provider) : getProviderCompliance(provider));

  if (!compliance) {
    return null;
  }

  const s = SIZE_CONFIG[size];
  const isConditional = isConditionalCompliance(compliance);

  return (
    <TooltipProvider delay={120}>
      <span
        className={cn(
          "inline-flex items-center self-center select-none text-foreground/80 leading-none",
          s.margin,
          s.gap,
          s.height,
          className,
        )}
      >
        {/* 1. Country Flag Emojis */}
        {compliance.countries.map((code, idx) => {
          const flag = countryCodeToFlag(code);
          const name = getCountryName(code);
          const hostedLabel = compliance.edge
            ? edgeGpuRegionLabel(code)
            : `Hosted in ${name} (${code})`;

          return (
            <span key={code} className="inline-flex items-center self-center">
              {idx > 0 && (
                <Separator
                  orientation="vertical"
                  style={separatorCenterStyle}
                  className={cn("mx-1 shrink-0 bg-border/60 my-auto", s.separator)}
                />
              )}
              <SimpleTooltip ariaLabel={hostedLabel} text={hostedLabel}>
                <span className="inline-flex items-center self-center gap-1 transition-opacity hover:opacity-80">
                  <span
                    role="img"
                    aria-label={name}
                    className={cn(
                      "leading-none select-none inline-flex items-center self-center",
                      s.flag,
                    )}
                  >
                    {flag}
                  </span>
                  <span
                    className={cn(
                      "font-mono font-medium tracking-wider text-muted-foreground tabular-nums leading-none self-center",
                      s.code,
                    )}
                  >
                    {code}
                  </span>
                </span>
              </SimpleTooltip>
            </span>
          );
        })}

        {/* Separator before ZDR / Retention */}
        {compliance.countries.length > 0 &&
          (compliance.zdr || compliance.dataRetention || isConditional) && (
            <Separator
              orientation="vertical"
              style={separatorCenterStyle}
              className={cn("mx-1 shrink-0 bg-border/60 my-auto", s.separator)}
            />
          )}

        {/* 2. Zero Data Retention (Shield) / Retention */}
        {compliance.zdr ? (
          <SimpleTooltip
            ariaLabel="Zero Data Retention"
            text="Prompts and responses are not stored"
          >
            <span className="inline-flex items-center self-center text-emerald-600 transition-opacity hover:opacity-80 dark:text-emerald-400">
              <Shield className={s.icon} aria-hidden="true" />
            </span>
          </SimpleTooltip>
        ) : isConditional ? (
          /* Conditional Retention: Yellow Uncrossed Shield, only mentioning the specific caveat */
          <SimpleTooltip
            ariaLabel="Conditional Privacy"
            text={compliance.description ?? "Privacy depends on the upstream provider"}
          >
            <span className="inline-flex items-center self-center text-amber-500 transition-opacity hover:opacity-80 dark:text-amber-400">
              <Shield className={s.icon} aria-hidden="true" />
            </span>
          </SimpleTooltip>
        ) : compliance.dataRetention && compliance.noTraining ? (
          <SimpleTooltip ariaLabel="Limited Retention" text="Logs kept up to 30 days">
            <span className="inline-flex items-center self-center text-amber-500 transition-opacity hover:opacity-80 dark:text-amber-400">
              <Clock className={s.icon} aria-hidden="true" />
            </span>
          </SimpleTooltip>
        ) : compliance.dataRetention ? (
          <SimpleTooltip ariaLabel="Data Retained" text="Prompts are logged and used for training">
            <span className="inline-flex items-center self-center text-destructive transition-opacity hover:opacity-80 dark:text-rose-400">
              <ShieldOff className={s.icon} aria-hidden="true" />
            </span>
          </SimpleTooltip>
        ) : null}

        {/* 3. No Model Training Eye */}
        {!isConditional && compliance.noTraining && (
          <>
            <Separator
              orientation="vertical"
              style={separatorCenterStyle}
              className={cn("mx-1 shrink-0 bg-border/60 my-auto", s.separator)}
            />
            <SimpleTooltip ariaLabel="No Model Training" text="Prompts are not used for training">
              <span className="inline-flex items-center self-center text-emerald-600 transition-opacity hover:opacity-80 dark:text-emerald-400">
                <EyeOff className={s.icon} aria-hidden="true" />
              </span>
            </SimpleTooltip>
          </>
        )}
      </span>
    </TooltipProvider>
  );
}
