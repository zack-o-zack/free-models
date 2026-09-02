"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function ExpandableModelDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const [canToggle, setCanToggle] = useState(false);
  const descriptionId = useId();
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = descriptionRef.current;
    if (!element) return;

    const measure = () => {
      if (!expanded) {
        setCanToggle(element.scrollHeight - element.clientHeight > 1);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [expanded]);

  const ToggleIcon = expanded ? ChevronUp : ChevronDown;

  return (
    <div className="mt-8 max-w-4xl">
      <p
        className={cn(
          "text-base leading-7 text-background/70 sm:text-lg sm:leading-8",
          !expanded && "line-clamp-2",
        )}
        id={descriptionId}
        ref={descriptionRef}
      >
        {description}
      </p>
      {canToggle && (
        <button
          aria-controls={descriptionId}
          aria-expanded={expanded}
          className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-background/60 transition-colors hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "Show less" : "Show more"}
          <ToggleIcon aria-hidden="true" className="size-3" />
        </button>
      )}
    </div>
  );
}
