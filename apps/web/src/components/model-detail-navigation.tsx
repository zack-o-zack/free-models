"use client";

import type { LucideIcon } from "lucide-react";
import { BrainCircuit, FileText, Server, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sections = [
  { id: "providers", label: "Providers", icon: Server },
  { id: "benchmarks", label: "Benchmarks", icon: BrainCircuit },
  { id: "faq", label: "FAQ", icon: FileText },
  { id: "related", label: "Related", icon: Sparkles },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: LucideIcon }>;

function useModelPagePosition() {
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["id"]>(
    sections[0].id,
  );
  const [showModelHeader, setShowModelHeader] = useState(false);

  useEffect(() => {
    let animationFrame = 0;

    const updatePosition = () => {
      const hero = document.getElementById("model-hero");
      setShowModelHeader(Boolean(hero && hero.getBoundingClientRect().bottom <= 72));

      const activationLine = Math.min(window.innerHeight * 0.3, 240);
      const sectionPositions = sections.flatMap((section) => {
        const element = document.getElementById(section.id);
        return element ? [{ ...section, rect: element.getBoundingClientRect() }] : [];
      });
      const sectionAtActivationLine = sectionPositions.find(
        ({ rect }) => rect.top <= activationLine && rect.bottom >= activationLine,
      );
      const closestSection = sectionPositions.reduce<(typeof sectionPositions)[number] | undefined>(
        (closest, section) =>
          !closest ||
          Math.abs(section.rect.top - activationLine) < Math.abs(closest.rect.top - activationLine)
            ? section
            : closest,
        undefined,
      );

      setActiveSection((sectionAtActivationLine ?? closestSection)?.id ?? sections[0].id);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updatePosition);
    };

    updatePosition();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return { activeSection, showModelHeader };
}

export function StickyModelHeader({
  author,
  isStealth,
  logoUrl,
  name,
}: {
  author: string;
  isStealth: boolean;
  logoUrl: string | null;
  name: string;
}) {
  const { showModelHeader } = useModelPagePosition();

  return (
    <div
      aria-hidden={!showModelHeader}
      className={cn(
        "fixed inset-x-0 top-[72px] z-30 border-b border-background/15 bg-foreground/95 text-background backdrop-blur transition-[transform,opacity] duration-200 supports-backdrop-filter:bg-foreground/85",
        showModelHeader
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-full opacity-0",
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2.5 px-5 sm:px-8">
        {!isStealth && (
          <Avatar className="size-6 bg-white ring-1 ring-background/15">
            {logoUrl && <AvatarImage alt="" className="object-contain p-1" src={logoUrl} />}
            <AvatarFallback className="bg-white text-[10px] font-medium text-black">
              {author.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <p className="truncate font-heading text-sm font-extrabold text-background sm:text-base">
          {name}
        </p>
      </div>
    </div>
  );
}

export function ModelSectionNav() {
  const { activeSection } = useModelPagePosition();

  return (
    <nav className="grid gap-1" aria-label="Model page sections">
      {sections.map(({ id, label, icon: Icon }) => {
        const isActive = activeSection === id;
        return (
          <Button
            aria-current={isActive ? "location" : undefined}
            className={cn(
              "justify-start",
              isActive &&
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground dark:hover:text-primary-foreground",
            )}
            key={id}
            nativeButton={false}
            render={<a href={`#${id}`} />}
            variant="ghost"
          >
            <Icon /> {label}
          </Button>
        );
      })}
    </nav>
  );
}
