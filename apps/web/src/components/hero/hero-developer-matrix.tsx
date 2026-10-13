"use client";

import { ArrowDownRight, Check, Copy, Terminal } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatContext } from "@/lib/model-format";
import type { ModelSummary } from "@/lib/model-types";

export interface HeroProps {
  models: ModelSummary[];
}

type SnippetTab = "curl" | "openai" | "aisdk";

export function HeroDeveloperMatrix({ models }: HeroProps) {
  const [activeSnippet, setActiveSnippet] = useState<SnippetTab>("curl");
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const reasoningCount = models.filter((m) => m.supportsReasoning).length;
    const visionCount = models.filter(
      (m) => m.inputModalities.includes("image") || m.inputModalities.includes("video"),
    ).length;
    const speechCount = models.filter(
      (m) => m.outputModalities.includes("speech") || m.outputModalities.includes("audio"),
    ).length;
    const maxContext = models.reduce((max, m) => Math.max(max, m.contextLength), 0);

    const featuredModel =
      models.find((m) => m.id.toLowerCase().includes("flash")) ??
      models.find((m) => m.id.toLowerCase().includes("llama")) ??
      models[0];

    return {
      reasoningCount,
      visionCount,
      speechCount,
      maxContext,
      featuredModel,
      providerCount: new Set(models.flatMap((m) => m.providers)).size,
    };
  }, [models]);

  const modelId = stats.featuredModel?.id ?? "google/gemini-2.0-flash-exp:free";

  const snippets: Record<SnippetTab, string> = {
    curl: `curl https://openrouter.ai/api/v1/chat/completions \\
  -H "Authorization: Bearer $FREE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelId}",
    "messages": [{"role": "user", "content": "Hello free world!"}]
  }'`,
    openai: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.FREE_API_KEY,
});

const response = await client.chat.completions.create({
  model: "${modelId}",
  messages: [{ role: "user", content: "Build more, spend zero." }],
});`,
    aisdk: `import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const provider = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.FREE_API_KEY,
});

const { text } = await generateText({
  model: provider("${modelId}"),
  prompt: "What can you build with zero budget?",
});`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeSnippet]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-1/3 size-96 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="container relative grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(400px,0.8fr)] lg:items-center lg:py-24">
        {/* Left Column: Developer Story & Live Interactive Code Snippet */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2ead4b]/25 bg-[#e2f6d5] px-3.5 py-1 text-xs font-semibold text-[#054d28] dark:border-[#9fe870]/30 dark:bg-[#192b15] dark:text-[#9fe870]">
            <Terminal className="size-3.5 text-positive" />
            <span>OpenAI-Compatible & SDK Ready • 1-Minute Setup</span>
          </div>

          <h1 className="mt-6 font-heading text-[clamp(2.75rem,6.5vw,5.5rem)] leading-[0.92] font-black tracking-[-0.06em] text-foreground">
            Plug in free AI.
            <br />
            Ship in <span className="text-positive">30 seconds.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Connect to models using compatible OpenAI client libraries or native SDKs. Copy the
            snippet, plug in your free endpoint key, and begin building immediately.
          </p>

          {/* Interactive Code Preview Terminal Box */}
          <div className="mt-7 overflow-hidden rounded-[24px] border border-white/10 bg-[#0e0f0c] p-4 text-xs font-mono text-neutral-200 shadow-xl sm:p-5">
            {/* Terminal Tab Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#d03238]" />
                <span className="size-2.5 rounded-full bg-[#ffd11a]" />
                <span className="size-2.5 rounded-full bg-[#2ead4b]" />
                <div className="ml-3 flex gap-1 rounded-full bg-white/5 p-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActiveSnippet("curl")}
                    className={`rounded-full px-2.5 py-0.5 transition-colors ${
                      activeSnippet === "curl"
                        ? "bg-[#9fe870] font-bold text-[#163300]"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSnippet("openai")}
                    className={`rounded-full px-2.5 py-0.5 transition-colors ${
                      activeSnippet === "openai"
                        ? "bg-[#9fe870] font-bold text-[#163300]"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    OpenAI SDK
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSnippet("aisdk")}
                    className={`rounded-full px-2.5 py-0.5 transition-colors ${
                      activeSnippet === "aisdk"
                        ? "bg-[#9fe870] font-bold text-[#163300]"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    AI SDK
                  </button>
                </div>
              </div>

              {/* 1-Click Copy button */}
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-neutral-300 transition-colors hover:bg-white/15 hover:text-white"
              >
                {copied ? (
                  <>
                    <Check className="size-3 text-[#9fe870]" />
                    <span className="text-[#9fe870]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Body */}
            <pre className="mt-3.5 overflow-x-auto text-[11px] leading-relaxed text-neutral-300 sm:text-xs">
              <code>{snippets[activeSnippet]}</code>
            </pre>
          </div>

          {/* Primary CTA Action */}
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Button
              render={<a href="#models" />}
              nativeButton={false}
              size="lg"
              className="h-12 rounded-[24px] bg-primary px-7 text-base font-semibold text-[#163300] shadow-sm hover:bg-[#cdffad]"
            >
              Explore {models.length} Endpoints <ArrowDownRight className="size-4" />
            </Button>
            <span className="text-xs font-medium text-muted-foreground">
              {stats.providerCount} free provider networks indexed
            </span>
          </div>
        </div>

        {/* Right Column: Live Capability Matrix Card */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-[24px] border border-foreground/8 bg-card p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between border-b border-foreground/8 pb-4">
              <div>
                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Live Capability Matrix
                </p>
                <h2 className="mt-0.5 font-heading text-lg font-extrabold text-foreground">
                  Ready-to-Deploy Modalities
                </h2>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                {models.length} TOTAL
              </span>
            </div>

            {/* Capability Pills Matrix */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[18px] bg-background/80 p-4">
                <span className="text-xs font-medium text-muted-foreground">Reasoning & Math</span>
                <p className="mt-1 font-heading text-2xl font-black text-foreground">
                  {stats.reasoningCount}
                </p>
                <p className="text-[11px] text-positive">Free endpoints</p>
              </div>

              <div className="rounded-[18px] bg-background/80 p-4">
                <span className="text-xs font-medium text-muted-foreground">
                  Vision & Multimodal
                </span>
                <p className="mt-1 font-heading text-2xl font-black text-foreground">
                  {stats.visionCount}
                </p>
                <p className="text-[11px] text-[#ffc091]">Free endpoints</p>
              </div>

              <div className="rounded-[18px] bg-background/80 p-4">
                <span className="text-xs font-medium text-muted-foreground">Audio & Speech</span>
                <p className="mt-1 font-heading text-2xl font-black text-foreground">
                  {stats.speechCount}
                </p>
                <p className="text-[11px] text-[#38c8ff]">Free endpoints</p>
              </div>

              <div className="rounded-[18px] bg-background/80 p-4">
                <span className="text-xs font-medium text-muted-foreground">
                  Max Context Ceiling
                </span>
                <p className="mt-1 font-heading text-2xl font-black text-foreground">
                  {formatContext(stats.maxContext)}
                </p>
                <p className="text-[11px] text-muted-foreground">tokens</p>
              </div>
            </div>

            {/* Quick Provider Cloud */}
            <div className="mt-6 border-t border-foreground/8 pt-5">
              <p className="text-xs font-semibold text-muted-foreground">
                Major free networks included:
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {[
                  "Google AI Studio",
                  "Groq",
                  "Cloudflare",
                  "Mistral",
                  "OpenRouter",
                  "Hugging Face",
                  "DeepSeek",
                ].map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Direct Jump Link */}
            <div className="mt-6 border-t border-foreground/8 pt-4">
              <a
                href="#models"
                className="flex items-center justify-between text-xs font-semibold text-foreground hover:text-positive"
              >
                <span>Filter by provider connections</span>
                <ArrowDownRight className="size-4 text-positive" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
