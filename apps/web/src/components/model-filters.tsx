"use client";

import type { LucideIcon } from "lucide-react";
import { AudioLines, FileText, ImageIcon, Type, Video } from "lucide-react";
import { ProviderBadge } from "@/components/provider-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

export interface ProviderFilterOption {
  value: string;
  label: string;
}

export interface PublisherFilterOption {
  value: string;
  label: string;
}

export const CONTEXT_STEPS = [
  0, 4_000, 8_000, 16_000, 32_000, 64_000, 128_000, 256_000, 512_000, 1_000_000, 2_000_000,
];

export function formatStepLabel(value: number): string {
  if (value === 0) return "0";
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  return `${value / 1_000}K`;
}

interface ModelFiltersProps {
  idPrefix: string;
  selectedInputs: string[];
  selectedPublishers: string[];
  selectedProviders: string[];
  contextRange: [number, number];
  publisherOptions: PublisherFilterOption[];
  providerOptions: ProviderFilterOption[];
  providerNames: Record<string, string>;
  activeFilterCount: number;
  onToggleInput: (modality: string) => void;
  onTogglePublisher: (publisher: string) => void;
  onToggleProvider: (provider: string) => void;
  onContextRangeChange: (range: [number, number]) => void;
  onClear: () => void;
}

const inputOptions: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "text", label: "Text", icon: Type },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "file", label: "File", icon: FileText },
  { value: "audio", label: "Audio", icon: AudioLines },
  { value: "video", label: "Video", icon: Video },
];

export function ModelFilters({
  idPrefix,
  selectedInputs,
  selectedPublishers,
  selectedProviders,
  contextRange,
  publisherOptions,
  providerOptions,
  providerNames,
  activeFilterCount,
  onToggleInput,
  onTogglePublisher,
  onToggleProvider,
  onContextRangeChange,
  onClear,
}: ModelFiltersProps) {
  const isContextFiltered = contextRange[0] > 0 || contextRange[1] < CONTEXT_STEPS.length - 1;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-4">
        <div>
          <p className="font-heading text-base font-extrabold tracking-[-0.02em]">Filters</p>
          <p className="text-xs text-muted-foreground">
            {activeFilterCount === 0 ? "Showing everything" : `${activeFilterCount} active`}
          </p>
        </div>
        <Button disabled={activeFilterCount === 0} onClick={onClear} size="xs" variant="ghost">
          Clear
        </Button>
      </div>
      <Separator />

      <Accordion
        className="min-h-0 flex-1"
        defaultValue={["context", "inputs", "publishers", "providers"]}
        multiple
      >
        <AccordionItem value="context">
          <AccordionTrigger>Context window</AccordionTrigger>
          <AccordionContent className="space-y-3 px-1 pt-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Range</span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-code text-xs text-foreground">
                {!isContextFiltered
                  ? "All (0 – 2M+)"
                  : `${formatStepLabel(CONTEXT_STEPS[contextRange[0]])} – ${formatStepLabel(CONTEXT_STEPS[contextRange[1]])}`}
              </span>
            </div>
            <Slider
              aria-label="Context window range"
              max={CONTEXT_STEPS.length - 1}
              min={0}
              onValueChange={(val) => {
                if (Array.isArray(val) && val.length === 2) {
                  onContextRangeChange([val[0], val[1]]);
                }
              }}
              step={1}
              value={[contextRange[0], contextRange[1]]}
            />
            <div className="flex justify-between font-code text-[10px] text-muted-foreground">
              <span>0</span>
              <span>64K</span>
              <span>2M+</span>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="inputs">
          <AccordionTrigger>Input modalities</AccordionTrigger>
          <AccordionContent className="grid gap-3 px-1 pt-1">
            {inputOptions.map(({ value, label, icon: Icon }) => (
              <label
                className="flex cursor-pointer items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                htmlFor={`${idPrefix}-input-${value}`}
                key={value}
              >
                <Checkbox
                  checked={selectedInputs.includes(value)}
                  id={`${idPrefix}-input-${value}`}
                  onCheckedChange={() => onToggleInput(value)}
                />
                <Icon className="size-4" />
                {label}
              </label>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="providers">
          <AccordionTrigger>Providers</AccordionTrigger>
          <AccordionContent className="grid gap-3 px-1 pt-1">
            {providerOptions.map(({ value }) => (
              <label
                className="flex cursor-pointer items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                htmlFor={`${idPrefix}-provider-${value}`}
                key={value}
              >
                <Checkbox
                  checked={selectedProviders.includes(value)}
                  id={`${idPrefix}-provider-${value}`}
                  onCheckedChange={() => onToggleProvider(value)}
                />
                <ProviderBadge plain names={providerNames} provider={value} />
              </label>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="publishers">
          <AccordionTrigger>Publishers</AccordionTrigger>
          <AccordionContent className="grid gap-3 px-1 pt-1">
            {publisherOptions.map(({ value, label }) => (
              <label
                className="flex cursor-pointer items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                htmlFor={`${idPrefix}-publisher-${value}`}
                key={value}
              >
                <Checkbox
                  checked={selectedPublishers.includes(value)}
                  id={`${idPrefix}-publisher-${value}`}
                  onCheckedChange={() => onTogglePublisher(value)}
                />
                <span className="min-w-0 flex-1 truncate">{label}</span>
              </label>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
