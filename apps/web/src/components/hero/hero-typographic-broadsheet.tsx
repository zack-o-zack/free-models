"use client";

import { ArrowDown } from "lucide-react";
import { useState } from "react";
import { HeroOrbit } from "@/components/hero/hero-orbit";
import { Button } from "@/components/ui/button";
import { formatContext } from "@/lib/model-format";
import type { ModelSummary } from "@/lib/model-types";

export interface HeroProps {
  models: ModelSummary[];
}

export function HeroTypographicBroadsheet({ models }: HeroProps) {
  const [focused, setFocused] = useState(false);
  const providers = new Set(models.flatMap((model) => model.providers)).size;
  const reasoning = models.filter((model) => model.supportsReasoning).length;
  const maxContext = models.reduce((max, model) => Math.max(max, model.contextLength), 0);

  return (
    <section aria-labelledby="hero-title" className="bg-background">
      <div
        className="hero-orbit-stage relative isolate flex items-center justify-center overflow-hidden"
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
      >
        <HeroOrbit models={models} focused={focused} />
        <div className="relative z-10 mx-auto flex w-full max-w-[290px] flex-col items-center px-3 text-center min-[400px]:max-w-[340px] sm:max-w-[540px] sm:px-5">
          <p className="mb-5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:mb-6 sm:text-xs">
            {models.length} free models. Endless possibilities.
          </p>
          <h1
            id="hero-title"
            className="font-heading text-[clamp(3.4rem,7.4vw,6.5rem)] leading-[0.97] font-black tracking-[-0.065em]"
          >
            Big ideas.
            <br />
            Free AI<span className="text-positive">.</span>
          </h1>
          <p className="mt-5 max-w-[430px] text-sm leading-6 text-muted-foreground sm:mt-6 sm:text-base sm:leading-7">
            Write code. Create images, audio, and video. Transcribe speech. Build search with
            embeddings.
          </p>
          <Button
            render={<a href="#models" />}
            nativeButton={false}
            size="lg"
            className="mt-7 h-13 gap-5 rounded-full px-7 hover:bg-primary-hover sm:mt-8 sm:h-14"
          >
            Find your model <ArrowDown className="size-4" aria-hidden="true" />
          </Button>
          <p className="mt-4 text-[11px] text-muted-foreground sm:text-xs">
            Compare free AI models, API providers, and usage limits.
          </p>
        </div>
      </div>
      <div className="container pb-8 sm:pb-10">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 border-t border-foreground/15 pt-7 sm:grid-cols-4">
          {[
            { value: models.length, label: "Free models" },
            { value: providers, label: "API providers" },
            { value: reasoning, label: "Models with reasoning" },
            { value: formatContext(maxContext), label: "Largest context window" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col-reverse gap-1">
              <dt className="text-xs leading-5 text-muted-foreground sm:text-sm">{label}</dt>
              <dd className="font-heading text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
