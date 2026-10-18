"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { ModelCard } from "@/components/model-card";
import { Button } from "@/components/ui/button";
import { CATALOGUE_PAGE_SIZE } from "@/lib/catalogue-pagination";
import type { ModelSummary } from "@/lib/model-types";

export function ProgressiveModelList({ models }: { models: ModelSummary[] }) {
  const [visibleCount, setVisibleCount] = useState(CATALOGUE_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = models.length > visibleCount;

  useEffect(() => {
    const target = sentinel.current;
    if (
      visibleCount >= models.length ||
      loading ||
      pending ||
      !target ||
      !("IntersectionObserver" in window)
    )
      return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      setLoading(true);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [models.length, visibleCount, loading, pending]);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => {
      startTransition(() => {
        setVisibleCount((count) => count + CATALOGUE_PAGE_SIZE);
        setLoading(false);
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  return (
    <div className="grid gap-4">
      {models.slice(0, visibleCount).map((model) => (
        <ModelCard key={model.id} model={model} />
      ))}
      <div ref={sentinel} className="flex flex-col items-center gap-3 py-4">
        <p role="status" className="text-sm text-muted-foreground">
          {loading || pending
            ? "Loading more models…"
            : `Showing ${Math.min(visibleCount, models.length)} of ${models.length} models`}
        </p>
        {hasMore && (
          <Button
            variant="outline"
            disabled={loading || pending}
            aria-busy={loading || pending}
            onClick={() => setLoading(true)}
          >
            {loading || pending ? (
              <>
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                />
                Loading models…
              </>
            ) : (
              "Load more models"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
