"use client";

import { Clock, EyeOff, Shield, ShieldOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  countryCodeToFlag,
  edgeGpuRegionLabel,
  getCountryName,
  isConditionalCompliance,
  type ProviderCompliance,
} from "@/lib/provider-compliance";
import { cn } from "@/lib/utils";

export function ConnectionCompliancePills({
  compliance,
  className,
}: {
  compliance?: ProviderCompliance;
  className?: string;
}) {
  if (!compliance) {
    return null;
  }

  const isConditional = isConditionalCompliance(compliance);

  const hasAny =
    compliance.countries.length > 0 ||
    compliance.zdr ||
    compliance.dataRetention ||
    compliance.noTraining ||
    isConditional;

  if (!hasAny) {
    return null;
  }

  return (
    <TooltipProvider delay={100}>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {/* Regions */}
        {compliance.countries.map((code) => {
          const flag = countryCodeToFlag(code);
          const name = getCountryName(code);
          const hostedLabel = compliance.edge
            ? edgeGpuRegionLabel(code)
            : `Hosted in ${name} (${code})`;

          return (
            <Tooltip key={code}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex cursor-default items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs shadow-sm transition-opacity hover:opacity-85 focus-visible:ring-1 focus-visible:ring-ring"
                  />
                }
              >
                <span className="text-sm select-none leading-none" role="img" aria-label={name}>
                  {flag}
                </span>
                <span className="font-medium text-foreground">{name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">({code})</span>
              </TooltipTrigger>
              <TooltipContent side="top">{hostedLabel}</TooltipContent>
            </Tooltip>
          );
        })}

        {/* Zero Data Retention */}
        {compliance.zdr && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex cursor-default items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs shadow-sm text-emerald-600 transition-opacity hover:opacity-85 focus-visible:ring-1 focus-visible:ring-ring dark:text-emerald-400"
                />
              }
            >
              <Shield className="size-3.5 stroke-[1.8]" />
              <span className="font-medium">Zero Data Retention</span>
            </TooltipTrigger>
            <TooltipContent side="top">Prompts and responses are not stored</TooltipContent>
          </Tooltip>
        )}

        {/* Conditional Privacy (Yellow Uncrossed Shield) */}
        {!compliance.zdr && isConditional && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex cursor-default items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs shadow-sm text-amber-500 transition-opacity hover:opacity-85 focus-visible:ring-1 focus-visible:ring-ring dark:text-amber-400"
                />
              }
            >
              <Shield className="size-3.5 stroke-[1.8]" />
              <span className="font-medium">Conditional Privacy</span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {compliance.description ?? "Privacy depends on the upstream provider"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Limited Retention without training */}
        {!compliance.zdr && !isConditional && compliance.dataRetention && compliance.noTraining && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex cursor-default items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs shadow-sm text-amber-500 transition-opacity hover:opacity-85 focus-visible:ring-1 focus-visible:ring-ring dark:text-amber-400"
                />
              }
            >
              <Clock className="size-3.5 stroke-[1.8]" />
              <span className="font-medium">Limited Retention</span>
            </TooltipTrigger>
            <TooltipContent side="top">Logs kept up to 30 days</TooltipContent>
          </Tooltip>
        )}

        {/* Data Retained / Training */}
        {!compliance.zdr &&
          !isConditional &&
          compliance.dataRetention &&
          !compliance.noTraining && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex cursor-default items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs shadow-sm text-destructive transition-opacity hover:opacity-85 focus-visible:ring-1 focus-visible:ring-ring dark:text-rose-400"
                  />
                }
              >
                <ShieldOff className="size-3.5 stroke-[1.8]" />
                <span className="font-medium">Training Active</span>
              </TooltipTrigger>
              <TooltipContent side="top">Prompts are logged and used for training</TooltipContent>
            </Tooltip>
          )}

        {/* No Model Training */}
        {!isConditional && compliance.noTraining && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex cursor-default items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs shadow-sm text-emerald-600 transition-opacity hover:opacity-85 focus-visible:ring-1 focus-visible:ring-ring dark:text-emerald-400"
                />
              }
            >
              <EyeOff className="size-3.5 stroke-[1.8]" />
              <span className="font-medium">No Training</span>
            </TooltipTrigger>
            <TooltipContent side="top">Prompts are not used for training</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
