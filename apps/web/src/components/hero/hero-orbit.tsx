"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { OrbitIcon, type OrbitIconName } from "@/components/hero/orbit-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { modelHref } from "@/lib/model-path";
import type { ModelSummary } from "@/lib/model-types";
import { getProviderName, providerFaviconUrl, publisherFaviconUrl } from "@/lib/provider-logos";

const tasks: OrbitIconName[] = ["braces", "image", "audio-lines", "video", "mic", "database"];
const preferredBrands = [
  "google",
  "groq",
  "openai",
  "cloudflare",
  "deepseek",
  "openrouter",
  "mistralai",
  "huggingface",
];
const brandSlots = ["a", "b", "c", "d"];
const modelPositions = [25, 75, 0, 50];

export function HeroOrbit({ models, focused }: { models: ModelSummary[]; focused: boolean }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [brandStep, setBrandStep] = useState(0);
  const [hovered, setHovered] = useState(false);
  const featuredModels = useMemo(() => {
    const ranked = (["intelligenceScore", "codingScore"] as const).map((metric) =>
      models
        .filter((model) => model[metric] !== null)
        .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0) || a.id.localeCompare(b.id))
        .slice(0, 3),
    );
    const unique = new Map<string, ModelSummary>();
    for (let rank = 0; rank < 3; rank++) {
      for (const list of ranked) {
        const model = list[rank];
        if (model) unique.set(model.id, model);
      }
    }
    return [...unique.values()];
  }, [models]);
  const providerDocs = useMemo(
    () => Object.assign({}, ...models.map((model) => model.providerDocs)),
    [models],
  );
  const brands = useMemo(() => {
    const available = new Set(
      models.flatMap((model) => [model.id.split("/")[0], ...model.providers]),
    );
    return [
      ...new Set([
        ...preferredBrands.filter((brand) => available.has(brand)),
        ...[...available].sort(),
      ]),
    ].filter(
      (brand) =>
        (brand in providerDocs
          ? providerFaviconUrl(providerDocs[brand])
          : publisherFaviconUrl(brand)) !== null,
    );
  }, [models, providerDocs]);
  const slots = Math.min(brandSlots.length, brands.length);
  const stopped = reducedMotion || hidden || focused || hovered;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(query.matches);
    const updateVisibility = () => setHidden(document.hidden);
    updateMotion();
    updateVisibility();
    query.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      query.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (stopped || (brands.length <= slots && featuredModels.length <= 2)) return;
    const timer = window.setInterval(() => {
      if (document.activeElement?.closest(".hero-orbit-stage")) return;
      setBrandStep((step) => step + 1);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [stopped, brands.length, slots, featuredModels.length]);

  return (
    <div className="hero-orbits" data-paused={stopped}>
      <div className="hero-orbit-glow" aria-hidden="true" />
      <div className="hero-orbit-track hero-orbit-signal" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="hero-orbit-node hero-orbit-satellite"
            style={
              {
                "--orbit-position": `${index * 33}%`,
                animationDelay: `${-index * 20}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="hero-orbit-track hero-orbit-tasks" aria-hidden="true">
        {tasks.map((key, index) => (
          <span
            key={key}
            className="hero-orbit-node"
            style={
              {
                "--orbit-position": `${(index * 100) / tasks.length}%`,
                animationDelay: `${(-index * 48) / tasks.length}s`,
              } as CSSProperties
            }
          >
            <span className="hero-orbit-token hero-task-token bg-card text-foreground/70">
              <OrbitIcon name={key} />
            </span>
          </span>
        ))}
      </div>
      <div className="hero-orbit-track hero-orbit-brands">
        {brandSlots.slice(0, slots).map((slot, index) => {
          // Advance one slot at a time through every available publisher and provider.
          const position =
            Math.floor(brandStep / slots) * slots + index + (index < brandStep % slots ? slots : 0);
          const brand = brands[position % brands.length];
          return (
            <span
              key={slot}
              className="hero-orbit-node"
              data-brand={brand}
              aria-hidden="true"
              style={
                {
                  "--orbit-position": `${(index * 100) / slots + 12.5}%`,
                  animationDelay: `${-(index / slots + 0.125) * 72}s`,
                } as CSSProperties
              }
            >
              <span className="hero-brand-frame">
                <Avatar key={brand} className="hero-orbit-token hero-brand-enter text-foreground">
                  <AvatarImage
                    src={
                      (brand in providerDocs
                        ? providerFaviconUrl(providerDocs[brand])
                        : publisherFaviconUrl(brand)) ?? undefined
                    }
                    alt=""
                    className="object-contain p-3 sm:p-4"
                  />
                  <AvatarFallback className="bg-transparent text-xs font-semibold">
                    {getProviderName(brand).slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </span>
            </span>
          );
        })}
        {featuredModels.slice(0, 4).map((_, index) => {
          const model = featuredModels[(Math.floor(brandStep / 3) + index) % featuredModels.length];
          const name = model.name.replace(/^[^:]+:\s*/, "");
          return (
            <span
              key={modelPositions[index]}
              className="hero-orbit-node hero-model-node"
              data-secondary={index > 1}
              style={
                {
                  "--orbit-position": `${modelPositions[index]}%`,
                  "--model-delay": `${(-modelPositions[index] / 100) * 72}s`,
                } as CSSProperties
              }
            >
              <a
                href={modelHref(model.id)}
                className="hero-orbit-model text-foreground hover:text-positive focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
              >
                <span
                  key={model.id}
                  className="hero-brand-enter flex h-10 min-w-0 items-center gap-2 rounded-full bg-card px-3"
                >
                  <Avatar
                    aria-hidden="true"
                    className="hero-model-logo size-5 shrink-0 bg-transparent"
                  >
                    <AvatarImage
                      src={publisherFaviconUrl(model.id.split("/")[0]) ?? undefined}
                      alt=""
                      className="object-contain"
                    />
                    <AvatarFallback className="bg-transparent text-sm">
                      {model.author.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hero-model-name truncate font-heading text-sm leading-5 font-bold sm:text-base sm:leading-5">
                    {name}
                  </span>
                </span>
              </a>
            </span>
          );
        })}
      </div>
    </div>
  );
}
