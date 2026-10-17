"use client";

import { ArrowDown } from "lucide-react";
import { type CSSProperties, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";
import { modelHref } from "@/lib/model-path";
import type { ModelSummary } from "@/lib/model-types";
import { publisherFaviconUrl } from "@/lib/provider-logos";
import styles from "./hero-typographic-broadsheet.module.css";

export interface HeroProps {
  models: ModelSummary[];
}

const destinationSlots = [
  { costCents: 2, y: 72, path: "M 446 300 C 338 300 350 72 153 72" },
  { costCents: 4, y: 224, path: "M 446 300 C 334 300 282 224 153 224" },
  { costCents: 1, y: 376, path: "M 446 300 C 334 300 282 376 153 376" },
  { costCents: 3, y: 528, path: "M 446 300 C 338 300 350 528 153 528" },
];

const maxIllustratedCostCents = 900;

const requestClients = [
  { name: "OpenCode", icon: "/brands/opencode.png" },
  { name: "Claude Code", icon: "/brands/claude-code.svg" },
  { name: "Codex", icon: "/brands/codex.svg" },
  { name: "Python", icon: "/brands/python.svg" },
  { name: "Pi", icon: "/brands/pi.svg" },
];

function RequestFlow({ models }: HeroProps) {
  const [hits, setHits] = useState<Record<string, number>>({});
  const [clientIndex, setClientIndex] = useState(0);
  const client = requestClients[clientIndex];

  function receiveRequest(modelId: string, costCents: number) {
    const maxIllustratedHits = Math.ceil(maxIllustratedCostCents / costCents);
    setHits((current) => ({
      ...current,
      [modelId]: ((current[modelId] ?? 0) + 1) % (maxIllustratedHits + 1),
    }));
  }

  const featured = useMemo(() => {
    const ranked = [...models]
      .filter((model) => model.intelligenceScore !== null && model.intelligenceScore > 0)
      .sort(
        (a, b) =>
          (b.intelligenceScore ?? 0) - (a.intelligenceScore ?? 0) || a.id.localeCompare(b.id),
      );
    const chosen = ranked.slice(0, destinationSlots.length);
    if (chosen.length < destinationSlots.length) {
      const remaining = models.filter((m) => !chosen.some((c) => c.id === m.id));
      chosen.push(...remaining.slice(0, destinationSlots.length - chosen.length));
    }
    return chosen.map((model, index) => {
      const slot = destinationSlots[index];
      const publisher = model.id.split("/")[0];
      return {
        ...slot,
        model,
        publisher,
      };
    });
  }, [models]);

  return (
    <div className={styles.requestFlow}>
      <div className={styles.flowCanvas}>
        <svg
          viewBox="0 0 600 600"
          preserveAspectRatio="none"
          fill="none"
          className={styles.flowLines}
          aria-hidden="true"
        >
          <defs>
            <marker
              id="hero-request-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 2 1 L 8 5 L 2 9" className={styles.arrowHead} />
            </marker>
          </defs>
          {featured.map(({ model, path, costCents }, index) => (
            <g key={model.id}>
              <path d={path} className={styles.flowTrack} markerEnd="url(#hero-request-arrow)" />
              <path
                d={path}
                pathLength="1"
                className={styles.flowPacket}
                onAnimationIteration={() => receiveRequest(model.id, costCents)}
                style={{ animationDelay: `${-index * 1.2}s` } as CSSProperties}
              />
            </g>
          ))}
        </svg>
        {featured.map(({ publisher, y, model, costCents }) => (
          <a
            key={model.id}
            href={modelHref(model.id)}
            className={styles.destination}
            style={{ top: `${y / 6}%` }}
          >
            <span
              key={hits[model.id] ?? 0}
              className={`${styles.destinationLogo} ${hits[model.id] ? styles.logoHit : ""}`}
            >
              <Avatar className="size-8 rounded-none bg-transparent sm:size-10">
                <AvatarImage
                  src={publisherFaviconUrl(publisher, 128) ?? undefined}
                  alt=""
                  className="object-contain"
                />
                <AvatarFallback className="bg-transparent text-lg font-bold">
                  {model.author.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <span className={styles.freeTag}>
                <s aria-hidden="true">
                  $
                  {(
                    Math.min((hits[model.id] ?? 0) * costCents, maxIllustratedCostCents) / 100
                  ).toFixed(2)}
                </s>
                <strong>$0</strong>
              </span>
            </span>
            <span className={styles.destinationName}>{model.name.replace(/^[^:]+:\s*/, "")}</span>
          </a>
        ))}
        <div
          className={styles.requestOrigin}
          role="img"
          aria-label="Request from OpenCode, Claude Code, Codex, Python, or Pi"
        >
          <div
            className={styles.clientCycle}
            onAnimationIteration={() =>
              setClientIndex((current) => (current + 1) % requestClients.length)
            }
            aria-hidden="true"
          >
            <Avatar key={client.name} className="size-12 rounded-none bg-transparent sm:size-14">
              <AvatarImage src={client.icon} alt="" className="rounded-none object-contain" />
            </Avatar>
          </div>
        </div>
      </div>
      <p className={styles.flowCaption}>Your tools, zero cost</p>
    </div>
  );
}

export function HeroTypographicBroadsheet({ models }: HeroProps) {
  return (
    <section aria-labelledby="hero-title" className={styles.hero}>
      <div className="container">
        <div className={styles.layout}>
          <div className={styles.copy}>
            <h1 id="hero-title" className={styles.title}>
              {siteConfig.headline.first} <br />
              {siteConfig.headline.second}
              <span className={styles.period}>{siteConfig.headline.punctuation}</span>
            </h1>
            <div className={styles.subhead}>
              <span data-page-subtitle className={styles.handwritten}>
                {siteConfig.tagline}
              </span>
            </div>
            <p data-page-description className={styles.description}>
              {siteConfig.description}
            </p>
            <div className={styles.actions}>
              <Button
                render={<a href="#models" />}
                nativeButton={false}
                size="lg"
                className={styles.browse}
              >
                Find your model <ArrowDown size={18} aria-hidden="true" />
              </Button>
            </div>
          </div>
          <RequestFlow models={models} />
        </div>
      </div>
    </section>
  );
}
