import Link from "next/link";

import { Icons } from "@/components/icons";
import { siteConfig } from "@/lib/config";
import { formatCount } from "@/lib/format-count";
import type { ModelSummary } from "@/lib/model-types";
import { homeDescription } from "@/lib/page-content";
import styles from "./hero-typographic-broadsheet.module.css";
import { RequestFlow } from "./request-flow";

export interface HeroProps {
  models: ModelSummary[];
  githubStars: number;
  description?: string;
}

const destinationSlots = [
  { costCents: 2, y: 72, path: "M 446 300 C 338 300 350 72 153 72" },
  { costCents: 4, y: 224, path: "M 446 300 C 334 300 282 224 153 224" },
  { costCents: 1, y: 376, path: "M 446 300 C 334 300 282 376 153 376" },
  { costCents: 3, y: 528, path: "M 446 300 C 338 300 350 528 153 528" },
];

function getFeaturedModels(models: ModelSummary[]) {
  const multiProvider = [...models]
    .filter(
      (model) =>
        model.intelligenceScore !== null &&
        model.intelligenceScore > 0 &&
        model.providers.length > 1,
    )
    .sort(
      (a, b) => (b.intelligenceScore ?? 0) - (a.intelligenceScore ?? 0) || a.id.localeCompare(b.id),
    );

  const chosen: ModelSummary[] = [];
  const seenPublishers = new Set<string>();

  for (const model of multiProvider) {
    const publisher = model.id.split("/")[0];
    if (!seenPublishers.has(publisher)) {
      seenPublishers.add(publisher);
      chosen.push(model);
      if (chosen.length === destinationSlots.length) break;
    }
  }

  if (chosen.length < destinationSlots.length) {
    for (const model of multiProvider) {
      if (!chosen.some((c) => c.id === model.id)) {
        chosen.push(model);
        if (chosen.length === destinationSlots.length) break;
      }
    }
  }

  if (chosen.length < destinationSlots.length) {
    const anyRanked = [...models]
      .filter((model) => model.intelligenceScore !== null && model.intelligenceScore > 0)
      .sort(
        (a, b) =>
          (b.intelligenceScore ?? 0) - (a.intelligenceScore ?? 0) || a.id.localeCompare(b.id),
      );
    for (const model of anyRanked) {
      const publisher = model.id.split("/")[0];
      if (!seenPublishers.has(publisher) && !chosen.some((c) => c.id === model.id)) {
        seenPublishers.add(publisher);
        chosen.push(model);
        if (chosen.length === destinationSlots.length) break;
      }
    }
  }

  if (chosen.length < destinationSlots.length) {
    const remaining = models.filter((m) => !chosen.some((c) => c.id === m.id));
    chosen.push(...remaining.slice(0, destinationSlots.length - chosen.length));
  }

  return chosen.map((model, index) => {
    const slot = destinationSlots[index];
    const publisher = model.id.split("/")[0];
    return {
      ...slot,
      model: { id: model.id, name: model.name, author: model.author },
      publisher,
    };
  });
}

export function HeroTypographicBroadsheet({ models, githubStars, description }: HeroProps) {
  const displayDescription = description ?? homeDescription(models);

  return (
    <section aria-labelledby="hero-title" className={styles.hero}>
      <div className="container">
        <div className={styles.layout}>
          <div className={styles.copy}>
            <h1 id="hero-title" className={styles.title}>
              {siteConfig.headline.first} <br />
              {siteConfig.headline.second}
              <span className={styles.period}>{siteConfig.headline.punctuation}</span>
            </h1>
            <div className={styles.subhead}>
              <span data-page-subtitle className={styles.handwritten}>
                {siteConfig.tagline}
              </span>
            </div>
            <p data-page-description className={styles.description}>
              {displayDescription}
            </p>
            <div className={styles.actions}>
              <Link
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer"
                aria-label={
                  githubStars > 0
                    ? `Star Free Models on GitHub. ${githubStars.toLocaleString()} stars.`
                    : "Star Free Models on GitHub"
                }
                className={`${styles.starCta} inline-flex items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring`}
              >
                <Icons.gitHub className={styles.starIcon} />
                <span>Star on GitHub</span>
                {githubStars > 0 && (
                  <span className={styles.starCount} aria-hidden="true">
                    {formatCount(githubStars)}
                  </span>
                )}
              </Link>
            </div>
          </div>
          <RequestFlow featured={getFeaturedModels(models)} />
        </div>
      </div>
    </section>
  );
}
