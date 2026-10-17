"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { ModelCard } from "@/components/model-card";
import { Button } from "@/components/ui/button";
import { CATALOGUE_PAGE_SIZE } from "@/lib/catalogue-pagination";
import type { ModelSummary } from "@/lib/model-types";

export function ProgressiveModelList({ models }: { models: ModelSummary[] }) {
  const [visibleCount, setVisibleCount] = useState(CATALOGUE_PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = models.length > visibleCount;

  useEffect(() => {
    const target = sentinel.current;
    if (!hasMore || !target || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      startTransition(() => setVisibleCount(visibleCount + CATALOGUE_PAGE_SIZE));
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  return (
    <div className="grid gap-4">
      {models.slice(0, visibleCount).map((model) => (
        <ModelCard key={model.id} model={model} />
      ))}
      {hasMore && (
        <div ref={sentinel} className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={() =>
              startTransition(() => setVisibleCount((count) => count + CATALOGUE_PAGE_SIZE))
            }
          >
            Load more models
          </Button>
        </div>
      )}
    </div>
  );
}
