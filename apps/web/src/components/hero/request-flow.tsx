"use client";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { modelHref } from "@/lib/model-path";
import { publisherFaviconUrl } from "@/lib/provider-logos";
import styles from "./hero-typographic-broadsheet.module.css";

interface RequestFlowItem {
  model: { id: string; name: string; author: string };
  publisher: string;
  costCents: number;
  y: number;
  path: string;
}
const maxIllustratedCostCents = 900;

const requestClients = [
  { name: "OpenCode", icon: "/brands/opencode.png" },
  { name: "Claude Code", icon: "/brands/claude-code.svg" },
  { name: "Codex", icon: "/brands/codex.svg" },
  { name: "Python", icon: "/brands/python.svg" },
  { name: "Pi", icon: "/brands/pi.svg" },
];

export function RequestFlow({ featured }: { featured: RequestFlowItem[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [offscreen, setOffscreen] = useState(true);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    const updateVisibility = () => setHidden(document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);
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

  return (
    <div ref={root} className={styles.requestFlow} data-paused={offscreen || hidden}>
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
              <Avatar className="size-11 rounded-[12px] bg-transparent sm:size-12 sm:rounded-[14px]">
                <AvatarImage
                  src={publisherFaviconUrl(publisher) ?? undefined}
                  alt=""
                  className="rounded-[inherit] object-contain"
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
            <Avatar
              key={client.name}
              className="size-12 rounded-[14px] bg-transparent sm:size-14 sm:rounded-[16px]"
            >
              <AvatarImage src={client.icon} alt="" className="rounded-[inherit] object-contain" />
            </Avatar>
          </div>
        </div>
      </div>
      <p className={styles.flowCaption}>Your tools, zero cost</p>
    </div>
  );
}
