import {
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  EyeOff,
  Gauge,
  Zap,
} from "lucide-react";

import { ExpandableModelDescription } from "@/components/expandable-model-description";
import { ModelModalities } from "@/components/model-modalities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatContext } from "@/lib/model-format";
import { getBestFreeLimit } from "@/lib/model-free-limit";
import type { ModelHighlight } from "@/lib/model-highlights";
import type { ModelSummary } from "@/lib/model-types";
import { getProviderName, providerFaviconUrl, publisherFaviconUrl } from "@/lib/provider-logos";

export function ModelOverview({
  model,
  highlights,
}: {
  model: ModelSummary;
  highlights: ModelHighlight[];
}) {
  const logoUrl = publisherFaviconUrl(model.id.split("/")[0], 128);
  const freeLimit = getBestFreeLimit(model.connections);

  return (
    <section
      id="model-hero"
      aria-labelledby="model-title"
      className="min-w-0 rounded-[24px] bg-foreground p-6 text-background sm:p-8 xl:p-10"
    >
      <div className="min-w-0">
        <div className="flex items-start gap-3 sm:gap-5">
          {!model.isStealth && (
            <Avatar className="mt-1 size-10 shrink-0 rounded-2xl bg-card text-card-foreground sm:size-14">
              {logoUrl && <AvatarImage src={logoUrl} alt="" className="object-contain p-2" />}
              <AvatarFallback className="bg-card font-semibold">
                {model.author.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )}
          {model.isStealth && (
            <Badge variant="secondary">
              <EyeOff /> Stealth
            </Badge>
          )}
          <h1
            id="model-title"
            className={`min-w-0 font-heading leading-[1.08] font-black tracking-[-0.055em] text-primary wrap-anywhere dark:text-primary-foreground ${model.name.length > 44 ? "text-3xl sm:text-5xl lg:text-[44px]" : "text-3xl sm:text-5xl xl:text-[56px]"}`}
          >
            {model.name}
          </h1>
        </div>
        <section className="mt-7" aria-label="Free usage">
          {freeLimit ? (
            <a
              href={`#provider-${encodeURIComponent(freeLimit.provider)}`}
              className="block rounded-[20px] bg-primary p-4 text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <Zap className="size-3.5" aria-hidden="true" /> Free allowance
                </span>
              </div>
              <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-xs font-medium">Up to</span>
                <span className="font-heading text-4xl leading-none font-black tracking-[-0.06em] tabular-nums sm:text-[42px]">
                  {freeLimit.amount}
                </span>
                <span className="text-sm font-semibold">{freeLimit.allowance}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="text-xs font-medium">
                  via {getProviderName(freeLimit.provider, model.providerNames)}
                  {freeLimit.qualifier && ` · ${freeLimit.qualifier}`}
                </p>
                {freeLimit.otherLimits.length > 0 && (
                  <ul aria-label="Additional limits" className="flex flex-wrap gap-1.5">
                    {freeLimit.otherLimits.map((limit) => (
                      <li
                        key={limit}
                        className="rounded-lg bg-primary-foreground/7 px-2 py-1 text-[11px] leading-4"
                      >
                        {limit}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </a>
          ) : (
            <a
              href="#providers"
              className="inline-flex min-h-11 items-center gap-2 text-sm text-background/75 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-current"
            >
              Free access · check provider limits{" "}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </section>
        <ExpandableModelDescription
          className="text-background/75"
          description={model.description}
          key={model.id}
        />
        <ModelModalities input={model.inputModalities} output={model.outputModalities} />
        {highlights.length > 0 && (
          <ul aria-label="Model highlights" className="mt-5 flex flex-wrap gap-2">
            {highlights.map(({ label, detail }) => (
              <li key={label}>
                <Badge
                  title={detail}
                  variant="outline"
                  className="h-auto min-h-8 gap-2 whitespace-normal border-background/15 bg-background/10 px-3 py-1.5 text-background"
                >
                  <CircleCheck aria-hidden="true" /> {label}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function ModelEssentials({ model }: { model: ModelSummary }) {
  const released =
    model.created === null
      ? "Not listed"
      : new Intl.DateTimeFormat("en", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(model.created * 1000));

  return (
    <div className="rounded-[24px] bg-card p-6">
      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        Model details
      </p>
      <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-2">
        <span className="font-heading text-5xl leading-none font-black tracking-[-0.06em]">
          Free<span className="text-primary">.</span>
        </span>
        <span className="pb-1 text-sm text-muted-foreground">
          via {model.providers.length} {model.providers.length === 1 ? "provider" : "providers"}
        </span>
      </div>
      <dl className="mt-5 divide-y divide-border/70">
        {[
          {
            icon: Gauge,
            label: "Context window",
            value:
              model.contextLength > 0
                ? `${formatContext(model.contextLength)} tokens`
                : "Not listed",
          },
          { icon: CalendarDays, label: "Released", value: released },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-3 py-3 text-sm"
          >
            <dt className="flex items-center gap-2 text-muted-foreground">
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </dt>
            <dd className="text-right font-semibold wrap-anywhere">{value}</dd>
          </div>
        ))}
      </dl>
      <Button
        render={<a href="#providers" />}
        nativeButton={false}
        size="lg"
        aria-label={`Providers: ${model.providers.length} available`}
        className="mt-4 h-14 w-full justify-between gap-2 rounded-[24px] px-4 text-sm hover:bg-primary-hover"
      >
        <span>Providers</span>
        <span aria-hidden="true" className="ml-auto flex shrink-0 items-center -space-x-2">
          {model.providers.slice(0, 3).map((provider) => (
            <Avatar key={provider} className="size-7 bg-card ring-2 ring-primary">
              <AvatarImage
                src={providerFaviconUrl(model.providerDocs[provider]) ?? undefined}
                alt=""
                className="object-contain p-1"
              />
              <AvatarFallback className="bg-card text-[9px] font-semibold text-card-foreground">
                {getProviderName(provider, model.providerNames).slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          ))}
          {model.providers.length > 3 && (
            <span className="relative flex h-7 min-w-7 items-center justify-center rounded-full bg-primary-foreground px-1.5 text-[10px] font-semibold text-primary ring-2 ring-primary tabular-nums">
              +{model.providers.length - 3}
            </span>
          )}
        </span>
        <ArrowDown className="ml-1 size-4 shrink-0" aria-hidden="true" />
      </Button>
    </div>
  );
}
