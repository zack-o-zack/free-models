"use client";

import type { LucideIcon } from "lucide-react";
import { BrainCircuit, FileText, Layers, Server } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sections = [
  { id: "providers", label: "Providers", icon: Server },
  { id: "benchmarks", label: "Benchmarks", icon: BrainCircuit },
  { id: "faq", label: "FAQ", icon: FileText },
  { id: "related", label: "Related", icon: Layers },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: LucideIcon }>;

function useActiveSection() {
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["id"]>(
    sections[0].id,
  );

  useEffect(() => {
    let animationFrame = 0;

    const updatePosition = () => {
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

  return activeSection;
}

export function ModelSectionNav({ layout = "mobile" }: { layout?: "mobile" | "sidebar" }) {
  const activeSection = useActiveSection();

  return (
    <nav
      className={cn(
        layout === "sidebar"
          ? "hidden rounded-[24px] bg-card p-3 lg:block"
          : "sticky top-20 z-30 min-w-0 rounded-[24px] bg-background/95 py-3 backdrop-blur-xl sm:top-24 lg:hidden",
      )}
      aria-label="Model page sections"
    >
      <div
        className={cn(
          "grid min-w-0 gap-1",
          layout === "sidebar" ? "grid-cols-1" : "grid-cols-4 p-1 sm:flex",
        )}
      >
        {sections.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <Button
              aria-current={isActive ? "location" : undefined}
              className={cn(
                layout === "sidebar"
                  ? "h-11 w-full justify-start gap-3 px-4 text-sm"
                  : "h-11 min-w-0 justify-center gap-2 px-1 text-[11px] sm:h-12 sm:shrink-0 sm:justify-start sm:px-4 sm:text-sm",
                isActive &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground dark:hover:text-primary-foreground",
              )}
              key={id}
              nativeButton={false}
              render={<a href={`#${id}`} />}
              variant="ghost"
            >
              <Icon className={layout === "sidebar" ? "size-4" : "hidden sm:block"} /> {label}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
