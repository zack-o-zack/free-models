"use client";

import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  BookText,
  CircleHelp,
  File,
  FileText,
  ImageIcon,
  Type,
  Video,
} from "lucide-react";
import { useState } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type BenchmarkFilterOption,
  type BenchmarkRange,
  isBenchmarkNarrowed,
} from "@/lib/model-benchmark-filters";
import type { RegionFilterOption } from "@/lib/model-filter-options";
import { formatBenchmarkScore, formatContext } from "@/lib/model-format";
import type { ProviderDoc } from "@/lib/model-types";

export interface ProviderFilterOption {
  value: string;
  label: string;
}

export interface PublisherFilterOption {
  value: string;
  label: string;
}

export function formatStepLabel(value: number): string {
  return value === 0 ? "0" : formatContext(value);
}

interface ModelFiltersProps {
  idPrefix: string;
  selectedInputs: string[];
  selectedPublishers: string[];
  selectedProviders: string[];
  selectedRegions: string[];
  selectedTopics: string[];
  regionOptions: RegionFilterOption[];
  zdrOnly: boolean;
  zdrCount?: number;
  contextRange: [number, number];
  contextSteps: number[];
  artificialAnalysisOptions: BenchmarkFilterOption[];
  designArenaOptions: BenchmarkFilterOption[];
  benchmarkRanges: Partial<Record<string, BenchmarkRange>>;
  topicOptions: Array<{ value: string; label: string; count: number }>;
  inputOptions: Array<{ value: string; label: string }>;
  publisherOptions: PublisherFilterOption[];
  providerOptions: ProviderFilterOption[];
  providerNames: Record<string, string>;
  providerDocs: Record<string, ProviderDoc>;
  activeFilterCount: number;
  onBenchmarkRangeChange: (id: string, range: BenchmarkRange) => void;
  onToggleTopic: (topic: string) => void;
  onToggleInput: (modality: string) => void;
  onTogglePublisher: (publisher: string) => void;
  onToggleProvider: (provider: string) => void;
  onToggleRegion: (region: string) => void;
  onToggleZdr: () => void;
  onContextRangeChange: (range: [number, number]) => void;
  onClear: () => void;
}

const FILTER_LIST_LIMIT = 8;

function limitFilterOptions<T extends { value: string }>(
  options: T[],
  selected: string[],
  expanded: boolean,
): T[] {
  if (expanded || options.length <= FILTER_LIST_LIMIT) return options;
  // Keep checked options visible so a filter never hides its own active selection.
  return options.filter(
    (option, index) => index < FILTER_LIST_LIMIT || selected.includes(option.value),
  );
}

function FilterListToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <Button
      aria-expanded={expanded}
      className="justify-self-start"
      onClick={onToggle}
      size="xs"
      variant="ghost"
    >
      {expanded ? "View less" : "View more"}
    </Button>
  );
}

function getBenchmarkRange(
  option: BenchmarkFilterOption,
  ranges: Partial<Record<string, BenchmarkRange>>,
): BenchmarkRange {
  return ranges[option.value] ?? [option.min, option.max];
}

function BenchmarkSlider({
  option,
  range,
  onChange,
}: {
  option: BenchmarkFilterOption;
  range: BenchmarkRange;
  onChange: (range: BenchmarkRange) => void;
}) {
  const source =
    option.source.kind === "design-arena"
      ? `Design Arena Elo rating for ${option.label}.`
      : "Artificial Analysis score.";

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2 text-xs font-medium">
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <span className="truncate">{option.label}</span>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  aria-label={`About ${option.label}`}
                  className="shrink-0 hover:text-foreground"
                  type="button"
                />
              }
            >
              <CircleHelp aria-hidden="true" className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              {source} Models without a score are hidden while this range is narrowed.
            </TooltipContent>
          </Tooltip>
        </span>
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-code text-foreground">
          {isBenchmarkNarrowed(option, range)
            ? `${formatBenchmarkScore(range[0])} – ${formatBenchmarkScore(range[1])}`
            : "Any"}
        </span>
      </div>
      <Slider
        aria-label={`${option.label} range`}
        max={option.max}
        min={option.min}
        onValueChange={(val) => {
          if (Array.isArray(val) && val.length === 2) {
            onChange([val[0], val[1]]);
          }
        }}
        step={1}
        value={[range[0], range[1]]}
      />
    </div>
  );
}

const inputIcons: Record<string, LucideIcon> = {
  text: Type,
  image: ImageIcon,
  file: File,
  document: BookText,
  pdf: FileText,
  audio: AudioLines,
  video: Video,
};

export function ModelFilters({
  idPrefix,
  selectedInputs,
  selectedPublishers,
  selectedProviders,
  selectedRegions,
  selectedTopics,
  regionOptions,
  zdrOnly,
  zdrCount,
  contextRange,
  contextSteps,
  artificialAnalysisOptions,
  designArenaOptions,
  benchmarkRanges,
  topicOptions,
  inputOptions,
  publisherOptions,
  providerOptions,
  providerNames,
  providerDocs,
  activeFilterCount,
  onBenchmarkRangeChange,
  onToggleTopic,
  onToggleInput,
  onTogglePublisher,
  onToggleProvider,
  onToggleRegion,
  onToggleZdr,
  onContextRangeChange,
  onClear,
}: ModelFiltersProps) {
  const isContextFiltered = contextRange[0] > 0 || contextRange[1] < contextSteps.length - 1;
  const [designArenaExpanded, setDesignArenaExpanded] = useState(false);
  const [providersExpanded, setProvidersExpanded] = useState(false);
  const [publishersExpanded, setPublishersExpanded] = useState(false);
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  const visibleTopics = limitFilterOptions(topicOptions, selectedTopics, topicsExpanded);
  const narrowedDesignArena = designArenaOptions
    .filter((option) => isBenchmarkNarrowed(option, getBenchmarkRange(option, benchmarkRanges)))
    .map((option) => option.value);
  const visibleDesignArena = limitFilterOptions(
    designArenaOptions,
    narrowedDesignArena,
    designArenaExpanded,
  );
  const visibleProviders = limitFilterOptions(
    providerOptions,
    selectedProviders,
    providersExpanded,
  );
  const visiblePublishers = limitFilterOptions(
    publisherOptions,
    selectedPublishers,
    publishersExpanded,
  );

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
        defaultValue={[
          "context",
          "privacy",
          "regions",
          "inputs",
          "topics",
          "providers",
          "publishers",
        ]}
        multiple
      >
        <AccordionItem value="context">
          <AccordionTrigger>Context window</AccordionTrigger>
          <AccordionContent className="space-y-3 px-1 pt-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Range</span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-code text-xs text-foreground">
                {!isContextFiltered
                  ? `All (0 – ${formatStepLabel(contextSteps[contextSteps.length - 1])})`
                  : `${formatStepLabel(contextSteps[contextRange[0]])} – ${formatStepLabel(contextSteps[contextRange[1]])}`}
              </span>
            </div>
            <Slider
              aria-label="Context window range"
              disabled={contextSteps.length < 2}
              max={Math.max(1, contextSteps.length - 1)}
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
              <span>
                {formatStepLabel(contextSteps[Math.floor((contextSteps.length - 1) / 2)])}
              </span>
              <span>{formatStepLabel(contextSteps[contextSteps.length - 1])}</span>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="inputs">
          <AccordionTrigger>Input modalities</AccordionTrigger>
          <AccordionContent className="grid gap-3 px-1 pt-1">
            {inputOptions.map(({ value, label }) => {
              const Icon = inputIcons[value] ?? CircleHelp;
              return (
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
              );
            })}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="topics">
          <AccordionTrigger>Topics</AccordionTrigger>
          <AccordionContent className="grid gap-3 px-1 pt-1">
            {visibleTopics.map(({ value, label, count }) => (
              <label
                className="flex cursor-pointer items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                htmlFor={`${idPrefix}-topic-${value}`}
                key={value}
              >
                <Checkbox
                  checked={selectedTopics.includes(value)}
                  id={`${idPrefix}-topic-${value}`}
                  onCheckedChange={() => onToggleTopic(value)}
                />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="text-xs font-mono text-muted-foreground">{count}</span>
              </label>
            ))}
            {topicOptions.length > FILTER_LIST_LIMIT && (
              <FilterListToggle
                expanded={topicsExpanded}
                onToggle={() => setTopicsExpanded((expanded) => !expanded)}
              />
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="providers">
          <AccordionTrigger>Providers</AccordionTrigger>
          <AccordionContent className="grid gap-3 px-1 pt-1">
            {visibleProviders.map(({ value }) => (
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
                <ProviderBadge
                  plain
                  names={providerNames}
                  docs={providerDocs[value]}
                  provider={value}
                />
              </label>
            ))}
            {providerOptions.length > FILTER_LIST_LIMIT && (
              <FilterListToggle
                expanded={providersExpanded}
                onToggle={() => setProvidersExpanded((expanded) => !expanded)}
              />
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="publishers">
          <AccordionTrigger>Publishers</AccordionTrigger>
          <AccordionContent className="grid gap-3 px-1 pt-1">
            {visiblePublishers.map(({ value, label }) => (
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
            {publisherOptions.length > FILTER_LIST_LIMIT && (
              <FilterListToggle
                expanded={publishersExpanded}
                onToggle={() => setPublishersExpanded((expanded) => !expanded)}
              />
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy">
          <AccordionTrigger>Data privacy</AccordionTrigger>
          <AccordionContent className="grid gap-3 px-1 pt-1">
            <label
              className="flex cursor-pointer items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              htmlFor={`${idPrefix}-privacy-zdr`}
            >
              <Checkbox
                checked={zdrOnly}
                id={`${idPrefix}-privacy-zdr`}
                onCheckedChange={onToggleZdr}
              />
              <span className="min-w-0 flex-1 truncate">Zero Data Retention</span>
              {typeof zdrCount === "number" && (
                <span className="text-xs font-mono text-muted-foreground">{zdrCount}</span>
              )}
            </label>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="regions">
          <AccordionTrigger>Hosting region</AccordionTrigger>
          <AccordionContent className="grid gap-3 px-1 pt-1">
            {regionOptions.map(({ value, label, flag, count }) => (
              <label
                className="flex cursor-pointer items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                htmlFor={`${idPrefix}-region-${value}`}
                key={value}
              >
                <Checkbox
                  checked={selectedRegions.includes(value)}
                  id={`${idPrefix}-region-${value}`}
                  onCheckedChange={() => onToggleRegion(value)}
                />
                <span className="text-base select-none leading-none" role="img" aria-label={label}>
                  {flag}
                </span>
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="text-xs font-mono text-muted-foreground">{count}</span>
              </label>
            ))}
          </AccordionContent>
        </AccordionItem>

        {artificialAnalysisOptions.length > 0 && (
          <AccordionItem value="artificial-analysis">
            <AccordionTrigger>Artificial Analysis</AccordionTrigger>
            <AccordionContent className="grid gap-4 px-1 pt-1">
              {artificialAnalysisOptions.map((option) => (
                <BenchmarkSlider
                  key={option.value}
                  onChange={(range) => onBenchmarkRangeChange(option.value, range)}
                  option={option}
                  range={getBenchmarkRange(option, benchmarkRanges)}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {designArenaOptions.length > 0 && (
          <AccordionItem value="design-arena">
            <AccordionTrigger>Design Arena</AccordionTrigger>
            <AccordionContent className="grid gap-4 px-1 pt-1">
              {visibleDesignArena.map((option) => (
                <BenchmarkSlider
                  key={option.value}
                  onChange={(range) => onBenchmarkRangeChange(option.value, range)}
                  option={option}
                  range={getBenchmarkRange(option, benchmarkRanges)}
                />
              ))}
              {designArenaOptions.length > FILTER_LIST_LIMIT && (
                <FilterListToggle
                  expanded={designArenaExpanded}
                  onToggle={() => setDesignArenaExpanded((expanded) => !expanded)}
                />
              )}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
