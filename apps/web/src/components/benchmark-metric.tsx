"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  AudioLines,
  CircleHelp,
  Database,
  FileText,
  Image as ImageIcon,
  ListFilter,
  Minus,
  Type,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatModalities } from "@/lib/model-format";

const triggerClassName =
  "inline-flex shrink-0 cursor-help items-center gap-1.5 border-0 bg-transparent p-0 text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const modalityBadgeClass =
  "h-6 gap-1 border-primary/20 bg-secondary px-1.5 text-primary [&>svg]:size-3.5!";

export function BenchmarkMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        render={<button className={triggerClassName} type="button" />}
      >
        <Icon className="size-3.5" />
        {value}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const modalityIcons: Record<string, LucideIcon> = {
  audio: AudioLines,
  embeddings: Database,
  file: FileText,
  image: ImageIcon,
  rerank: ListFilter,
  speech: AudioLines,
  text: Type,
  video: Video,
};

function ModalityIcons({ values, side }: { values: string[]; side: "input" | "output" }) {
  if (values.length === 0) {
    return <Minus aria-hidden="true" className="size-3.5" />;
  }

  return values.map((value) => {
    const Icon = modalityIcons[value] ?? CircleHelp;
    return <Icon aria-hidden="true" className="size-3.5" key={`${side}-${value}`} />;
  });
}

export function ModalityMetric({ input, output }: { input: string[]; output: string[] }) {
  const value = formatModalities(input, output);
  if (!value) return null;

  const label = `Modalities — ${value}`;

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        render={<button className={triggerClassName} type="button" />}
      >
        <span aria-hidden="true" className="inline-flex items-center gap-1">
          <Badge className={modalityBadgeClass} variant="secondary">
            <ModalityIcons side="input" values={input} />
          </Badge>
          <ArrowRight className="size-3.5 text-muted-foreground" />
          <Badge className={modalityBadgeClass} variant="secondary">
            <ModalityIcons side="output" values={output} />
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
