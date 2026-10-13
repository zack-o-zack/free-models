import type { ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatContext } from "@/lib/model-format";
import { getBestFreeLimit } from "@/lib/model-free-limit";
import type { ModelSummary } from "@/lib/model-types";
import { getProviderName } from "@/lib/provider-logos";

const linkClass =
  "font-medium text-foreground underline underline-offset-4 hover:text-positive focus-visible:outline-2 focus-visible:outline-ring";
const list = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

function formats(values: string[]) {
  return list.format(values.map((value) => value.replaceAll("_", " ")));
}

export function ModelFaq({ model }: { model: ModelSummary }) {
  const name = model.name.startsWith(`${model.author}: `)
    ? model.name.slice(model.author.length + 2)
    : model.name;
  const freeLimit = getBestFreeLimit(model.connections);
  const providers = list.format(
    model.providers.map((provider) => getProviderName(provider, model.providerNames)),
  );
  const hasBenchmarks =
    [model.intelligenceScore, model.codingScore, model.agenticScore].some(
      (score) => score !== null,
    ) || model.designArena.length > 0;
  const questions: { id: string; question: string; answer: ReactNode }[] = [
    {
      id: "free-usage",
      question: `What are the free API limits for ${name}?`,
      answer: freeLimit ? (
        <>
          {name} is available with {freeLimit.label.toLowerCase()} through{" "}
          {getProviderName(freeLimit.provider, model.providerNames)}
          {freeLimit.qualifier ? ` (${freeLimit.qualifier})` : ""}.
          {freeLimit.otherLimits.length > 0 &&
            ` Additional limits apply at the same time: ${list.format(freeLimit.otherLimits)}.`}{" "}
          Free allowances can change. Check the{" "}
          <a className={linkClass} href={`#provider-${encodeURIComponent(freeLimit.provider)}`}>
            {name} provider limits
          </a>{" "}
          before you start.
        </>
      ) : (
        <>
          {providers
            ? `Free API access for ${name} is listed through ${providers}, but a specific request or token allowance isn’t available in the listed data.`
            : `A free API allowance for ${name} isn’t listed yet.`}{" "}
          Check the{" "}
          <a className={linkClass} href="#providers">
            {name} provider pricing and rate limits
          </a>{" "}
          for what’s included and any account requirements.
        </>
      ),
    },
    {
      id: "get-started",
      question: `How do I access ${name} through an API?`,
      answer: (
        <>
          To use {name}, choose one of the listed{" "}
          <a className={linkClass} href="#providers">
            {name} API providers
          </a>{" "}
          and follow the provider’s account and API-key setup guide. Copy the {name} model ID and
          connection settings for your chosen provider into your app or API client. Model IDs can
          differ between providers. API requests go directly to the provider; Free Models is a
          comparison site.
        </>
      ),
    },
    {
      id: "formats",
      question: `What input and output formats does ${name} support?`,
      answer: (
        <>
          {model.inputModalities.length
            ? `${name} accepts ${formats(model.inputModalities)} as listed input formats.`
            : `Input formats for ${name} aren’t listed yet.`}{" "}
          {model.outputModalities.length
            ? `Listed output formats include ${formats(model.outputModalities)}.`
            : `Output formats for ${name} aren’t listed yet.`}{" "}
          Image or audio input support does not imply image or audio generation. Check the chosen
          provider’s {name} documentation for supported file types and request formats.
        </>
      ),
    },
    ...(model.contextLength > 0
      ? [
          {
            id: "context",
            question: `What is the context window for ${name}?`,
            answer: (
              <>
                {name} has a listed context window of {formatContext(model.contextLength)} tokens.
                Tokens are small pieces of content rather than a word count. Instructions,
                conversation history, and other inputs use context space, and the response also
                needs room. The maximum output length for {name} may be smaller than the context
                window and can vary by provider.
              </>
            ),
          },
        ]
      : []),
    {
      id: "capabilities",
      question: `Does ${name} support reasoning and tool calling?`,
      answer: (
        <>
          {model.supportsReasoning && model.supportsTools
            ? `${name} has both reasoning and tool calling listed as supported capabilities.`
            : model.supportsReasoning
              ? `${name} has reasoning support listed; tool calling support isn’t listed.`
              : model.supportsTools
                ? `${name} has tool calling support listed; reasoning support isn’t listed.`
                : `Neither reasoning nor tool calling support is listed for ${name}.`}{" "}
          Reasoning enables additional processing for complex problems. Tool calling allows a model
          to request functions that your app executes. Check the chosen provider’s documentation for
          capability availability and setup.
        </>
      ),
    },
    {
      id: "benchmarks",
      question: `How should I compare ${name} benchmark scores?`,
      answer: (
        <>
          {hasBenchmarks ? (
            <>
              Review the listed{" "}
              <a className={linkClass} href="#benchmarks">
                {name} benchmark results
              </a>{" "}
              to compare performance on measured tasks.
            </>
          ) : (
            `No benchmark results are listed for ${name} yet. Missing scores don’t establish poor performance.`
          )}{" "}
          Compare scores within the same benchmark: coding indexes, Elo ratings, and win rates
          measure different things. The index comparison charts include only scored free models
          listed on Free Models. Evaluate {name} on examples from your own task alongside context
          size and provider limits.
        </>
      ),
    },
  ];

  return (
    <Accordion keepMounted className="rounded-[24px] bg-background px-5 sm:px-8">
      {questions.map(({ id, question, answer }) => (
        <AccordionItem key={id} value={id}>
          <AccordionTrigger className="py-5 font-heading text-base font-bold leading-snug hover:no-underline sm:text-lg">
            {question}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-[15px] leading-7 text-muted-foreground sm:text-base">
            {answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
