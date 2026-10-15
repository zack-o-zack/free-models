"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function ExpandableModelDescription({
  description,
  className,
}: {
  description: string;
  className?: string;
}) {
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
    <div className={cn("mt-6 max-w-4xl text-muted-foreground", className)}>
      <p
        data-page-description
        className={cn("text-base leading-7 sm:text-lg sm:leading-8", !expanded && "line-clamp-3")}
        id={descriptionId}
        ref={descriptionRef}
      >
        {description}
      </p>
      {canToggle && (
        <button
          aria-controls={descriptionId}
          aria-expanded={expanded}
          className="mt-1 inline-flex min-h-11 cursor-pointer items-center gap-1 text-xs font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
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
