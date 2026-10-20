"use client";

import { useEffect, useMemo, useState } from "react";
import { EntityCards } from "@/components/entity-cards";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  type CatalogueEntity,
  type DirectorySortOption,
  directorySortLabels,
  type EntityKind,
  sortCatalogueEntities,
} from "@/lib/catalogue-entities";

export function CatalogueDirectoryList({
  entities,
  kind,
}: {
  entities: CatalogueEntity[];
  kind: EntityKind;
}) {
  const [sort, setSort] = useState<DirectorySortOption>("models-desc");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sortParam = params.get("sort");
    if (
      sortParam === "alphabetical" ||
      sortParam === "name" ||
      sortParam === "name-asc" ||
      sortParam === "alpha"
    ) {
      setSort("name-asc");
    } else if (sortParam === "name-desc") {
      setSort("name-desc");
    } else if (sortParam === "models-asc") {
      setSort("models-asc");
    } else if (sortParam === "models" || sortParam === "models-desc") {
      setSort("models-desc");
    }
  }, []);

  const handleSortChange = (next: DirectorySortOption) => {
    setSort(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next === "models-desc") {
        url.searchParams.delete("sort");
      } else {
        url.searchParams.set("sort", next === "name-asc" ? "alphabetical" : next);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  const sortedEntities = useMemo(() => sortCatalogueEntities(entities, sort), [entities, sort]);

  return (
    <section aria-label={`${kind} directory`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Showing all <span className="font-semibold text-foreground">{entities.length}</span>{" "}
          {kind}
        </p>
        <Select
          value={sort}
          onValueChange={(value) => handleSortChange(value as DirectorySortOption)}
        >
          <SelectTrigger className="min-w-48" aria-label={`Sort ${kind}`}>
            <span className="truncate">{directorySortLabels[sort]}</span>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="models-desc">Most models</SelectItem>
            <SelectItem value="name-asc">Alphabetical (A–Z)</SelectItem>
            <SelectItem value="name-desc">Alphabetical (Z–A)</SelectItem>
            <SelectItem value="models-asc">Fewest models</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <EntityCards entities={sortedEntities} kind={kind} />
    </section>
  );
}
