import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ProviderBadge } from "@/components/provider-badge";
import { type CatalogueEntity, type EntityKind, entityHref } from "@/lib/catalogue-entities";

export function EntityCards({ entities, kind }: { entities: CatalogueEntity[]; kind: EntityKind }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {entities.map((entity) => (
        <Link
          key={entity.slug}
          href={entityHref(kind, entity.slug)}
          className="group flex min-w-0 flex-col gap-6 rounded-[24px] bg-card p-6 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <div className="flex min-w-0 items-start justify-between gap-4">
            <ProviderBadge
              plain
              size="xl"
              provider={entity.slug}
              publisher={kind === "publishers"}
              docs={
                entity.models.find((model) => model.providerDocs[entity.slug])?.providerDocs[
                  entity.slug
                ]
              }
              names={{ [entity.slug]: entity.name }}
            />
            <ArrowUpRight
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{entity.models.length}</span> free{" "}
            {entity.models.length === 1 ? "model" : "models"}
          </p>
        </Link>
      ))}
    </div>
  );
}
