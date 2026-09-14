"use client";

import { Bot, BrainCircuit, Code2, EyeOff, Gauge, Server } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { BenchmarkMetric, ModalityMetric } from "@/components/benchmark-metric";
import { DesignArenaPopover } from "@/components/design-arena-popover";
import { ProviderBadge } from "@/components/provider-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBenchmarkScore, formatContext } from "@/lib/model-format";
import { modelHref } from "@/lib/model-path";
import type { ModelSummary } from "@/lib/model-types";
import { providerFaviconUrl } from "@/lib/provider-logos";

function initials(value: string): string {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ModelCard({ model }: { model: ModelSummary }) {
  const router = useRouter();
  const href = modelHref(model.id);
  const providerLogoUrl = providerFaviconUrl(model.id.split("/")[0]);

  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    if (
      (event.target as HTMLElement).closest(
        'a, button, [role="dialog"], [data-slot="popover-content"], [data-slot="tooltip-content"]',
      )
    ) {
      return;
    }
    router.push(href);
  }
  const modelNameSize =
    model.name.length > 42
      ? "text-sm sm:text-base"
      : model.name.length > 30
        ? "text-base"
        : "text-lg";

  return (
    <Card className="cursor-pointer bg-background" onClick={handleCardClick}>
      <CardHeader>
        <div className="flex min-w-0 items-start gap-4">
          {!model.isStealth && (
            <Avatar className="bg-card ring-1 ring-foreground/10" size="lg">
              {providerLogoUrl && (
                <AvatarImage
                  alt={`${model.author} logo`}
                  className="object-contain p-1.5"
                  src={providerLogoUrl}
                />
              )}
              <AvatarFallback className="bg-card font-heading font-bold text-foreground">
                {initials(model.author)}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle
              className={`flex flex-wrap items-center gap-2 font-extrabold tracking-[-0.025em] ${modelNameSize}`}
            >
              <Link className="line-clamp-2 min-w-0 max-w-full leading-tight" href={href}>
                {model.name}
              </Link>
              {model.isStealth && (
                <Badge className="shrink-0" variant="secondary">
                  <EyeOff /> Stealth
                </Badge>
              )}
              <ModalityMetric input={model.inputModalities} output={model.outputModalities} />
            </CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
              <BenchmarkMetric
                icon={Server}
                label="Providers offering this model for free"
                value={String(model.providers.length)}
              />
              {model.contextLength > 0 && (
                <BenchmarkMetric
                  icon={Gauge}
                  label="Context window"
                  value={formatContext(model.contextLength)}
                />
              )}
              {model.intelligenceScore !== null && (
                <BenchmarkMetric
                  icon={BrainCircuit}
                  label="Artificial Analysis Intelligence Index"
                  value={formatBenchmarkScore(model.intelligenceScore)}
                />
              )}
              {model.codingScore !== null && (
                <BenchmarkMetric
                  icon={Code2}
                  label="Artificial Analysis Coding Index"
                  value={formatBenchmarkScore(model.codingScore)}
                />
              )}
              {model.agenticScore !== null && (
                <BenchmarkMetric
                  icon={Bot}
                  label="Artificial Analysis Agentic Index"
                  value={formatBenchmarkScore(model.agenticScore)}
                />
              )}
              <DesignArenaPopover benchmarks={model.designArena} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 max-w-4xl text-[15px] leading-6 text-muted-foreground">
          {model.description}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {model.providers.map((provider) => (
            <ProviderBadge
              key={provider}
              iconOnly
              names={model.providerNames}
              provider={provider}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
