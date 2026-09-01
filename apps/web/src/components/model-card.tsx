"use client";

import { Bot, BrainCircuit, Code2, EyeOff, Gauge, Server } from "lucide-react";
import Link from "next/link";

import { BenchmarkMetric, ModalityMetric } from "@/components/benchmark-metric";
import { CopyButton } from "@/components/copy-button";
import { DesignArenaPopover } from "@/components/design-arena-popover";
import { ProviderBadge } from "@/components/provider-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBenchmarkScore, formatContext } from "@/lib/model-format";
import { modelHref } from "@/lib/model-path";
import type { ModelConnection, ModelSummary } from "@/lib/model-types";
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
  const providerLogoUrl = providerFaviconUrl(model.id.split("/")[0]);
  const visibleProviders = model.providers.slice(0, 3);
  const additionalProviderCount = Math.max(model.providers.length - visibleProviders.length, 0);
  const providerConnections: ModelConnection[] =
    model.connections.length > 0
      ? model.connections
      : model.providers.map((provider) => ({ provider, modelId: model.id }));

  return (
    <Card className="transition-colors hover:bg-muted/20">
      <CardHeader>
        <div className="flex min-w-0 items-start gap-3">
          {!model.isStealth && (
            <Avatar size="lg">
              {providerLogoUrl && (
                <AvatarImage
                  alt={`${model.author} logo`}
                  className="object-contain p-1.5"
                  src={providerLogoUrl}
                />
              )}
              <AvatarFallback className="font-heading font-medium text-foreground">
                {initials(model.author)}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-1.5">
              <Link
                className="min-w-0 truncate underline-offset-4 hover:text-primary hover:underline"
                href={modelHref(model.id)}
              >
                {model.name}
              </Link>
              {model.isStealth && (
                <Badge className="shrink-0" variant="secondary">
                  <EyeOff /> Stealth
                </Badge>
              )}
              <ModalityMetric input={model.inputModalities} output={model.outputModalities} />
            </CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
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
        <p className="line-clamp-2 leading-6 text-muted-foreground">{model.description}</p>
        <Accordion>
          <AccordionItem className="border-b-0" value="providers">
            <AccordionTrigger className="py-1.5 hover:no-underline">
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 pr-2">
                <span className="mr-1 shrink-0 text-xs text-muted-foreground">
                  {model.providers.length} {model.providers.length === 1 ? "provider" : "providers"}
                </span>
                {visibleProviders.map((provider) => (
                  <ProviderBadge key={provider} iconOnly provider={provider} />
                ))}
                {additionalProviderCount > 0 && (
                  <Badge variant="outline">+{additionalProviderCount}</Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableBody>
                  {providerConnections.map((providerConnection) => (
                    <TableRow key={`${providerConnection.provider}-${providerConnection.modelId}`}>
                      <TableCell>
                        <ProviderBadge plain provider={providerConnection.provider} size="lg" />
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-64 items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger
                              aria-label={`Model ID — ${providerConnection.modelId}`}
                              className="min-w-0 flex-1 truncate text-left"
                              render={<span />}
                            >
                              <code className="font-code text-xs">
                                {providerConnection.modelId}
                              </code>
                            </TooltipTrigger>
                            <TooltipContent>{providerConnection.modelId}</TooltipContent>
                          </Tooltip>
                          <CopyButton
                            label={`Copy ${providerConnection.provider} model ID`}
                            value={providerConnection.modelId}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="px-2 pt-1 text-xs text-muted-foreground">
                * Closest provider match, not an exact offering. Check provider docs for details.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
