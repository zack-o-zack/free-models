import { dirname, join, relative, resolve } from "node:path";
import { z } from "zod";
import { cataloguePaths, serializeJson, writeTextFilesAtomically } from "../catalogue/files.ts";
import {
  type CanonicalModel,
  canonicalModelsSchema,
  type ProviderMappings,
  providerMappingsSchema,
} from "../catalogue/schema.ts";
import { computeUnresolved, loadCatalogueState } from "../catalogue/state.ts";
import { reconcile } from "../catalogue/workflow.ts";
import { providerRegistry } from "../providers/registry.ts";
import { freeReviewer, type ReviewAttempt } from "./inference.ts";
import {
  allowedCataloguePath,
  decideHolds,
  diffParts,
  HOLD_DAYS,
  identityCandidates,
  metadataChanges,
  providerAnomalies,
  restoreCommittedIdentities,
} from "./policy.ts";

const paths = cataloguePaths(resolve("packages/json"));
const baseline = process.env.CATALOGUE_BASELINE;
if (!baseline) throw new Error("CATALOGUE_BASELINE must point to the baseline workspace");
const before = await loadCatalogueState(cataloguePaths(baseline), providerRegistry);
const mode = process.argv[2];
const reportPath = resolve(".scratch/catalogue-agent-report.json");
const repairPath = resolve(".scratch/catalogue-repair.json");
const summaryPath = resolve(".scratch/catalogue-summary.md");
const heldPath = join(dirname(paths.canonicalModels), "held-providers.json");
const holdSchema = z.object({ since: z.iso.date(), reason: z.string() }).strict();
const heldSchema = z.object({ providers: z.record(z.string(), holdSchema) }).strict();
const failuresSchema = z.object({
  failures: z.array(z.object({ provider: z.string(), error: z.string() })),
});
const repairSchema = z.object({ accepted: z.record(z.string(), holdSchema) }).passthrough();
const MAX_REPAIRS = 40;
const METADATA_PATH = relative(process.cwd(), paths.canonicalMetadata);
// Each review part must fit the smallest reviewer context; more parts than this needs a human.
const REVIEW_PART_CHARS = 120_000;
const MAX_REVIEW_PARTS = 4;

async function readJson<T>(path: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  const file = Bun.file(path);
  return (await file.exists()) ? schema.parse(await file.json()) : fallback;
}

// Rewrites a snapshot from its file rather than parsed state, so kept offers retain their exact
// serialization and the diff shows only real changes.
async function snapshotFile(
  source: string,
  provider: string,
  keep: (modelId: string) => boolean = () => true,
) {
  const snapshot = (await Bun.file(source).json()) as { offers: { model_id: string }[] };
  const offers = snapshot.offers.filter((offer) => keep(offer.model_id));
  return { path: paths.snapshot(provider), contents: serializeJson({ ...snapshot, offers }) };
}

function identityFiles(
  models: readonly CanonicalModel[],
  mappings: ReadonlyMap<string, ProviderMappings>,
) {
  return [
    {
      path: paths.canonicalModels,
      contents: serializeJson(
        canonicalModelsSchema.parse({
          models: [...models].sort((a, b) => a.id.localeCompare(b.id)),
        }),
      ),
    },
    ...[...mappings].map(([provider, mapping]) => ({
      path: paths.mapping(provider),
      contents: serializeJson(
        providerMappingsSchema.parse({
          ...mapping,
          mappings: Object.fromEntries(
            Object.entries(mapping.mappings).sort(([a], [b]) => a.localeCompare(b)),
          ),
        }),
      ),
    })),
  ];
}

// Reads identities and mappings without cross-checks, so a broken edit can still be repaired.
async function readIdentities() {
  const canonicalModels = canonicalModelsSchema.parse(await Bun.file(paths.canonicalModels).json());
  const mappings = new Map<string, ProviderMappings>();
  for (const provider of providerRegistry) {
    const file = Bun.file(paths.mapping(provider.id));
    mappings.set(
      provider.id,
      (await file.exists())
        ? providerMappingsSchema.parse(await file.json())
        : { provider: provider.id, mappings: {} },
    );
  }
  return { canonicalModels, mappings };
}

// Put back any committed identity or mapping that was edited or removed, then carry on.
const committed = restoreCommittedIdentities(before, await readIdentities());
if (committed.restored.length)
  await writeTextFilesAtomically(identityFiles(committed.models, committed.mappings));
let current = await loadCatalogueState(paths, providerRegistry);
const restoredLines = committed.restored.map(
  (item) => `- Restored committed ${item}; automation only adds identities and mappings.`,
);
const failuresPath = process.env.DISCOVERY_FAILURES;
const { failures } = failuresPath
  ? await readJson(failuresPath, failuresSchema, { failures: [] })
  : { failures: [] };
const previous = await readJson(heldPath, heldSchema, { providers: {} });
// Reviewers come only from providers whose snapshot this run freshly discovered.
const reviewerPool = {
  baseline: before,
  live: current,
  unavailable: new Set([
    ...failures.map((failure) => failure.provider),
    ...Object.keys(previous.providers),
  ]),
};
let reviewAttempts: readonly ReviewAttempt[] = [];
function reviewerLine(phase: string, model: string | undefined) {
  if (!reviewAttempts.length) return [];
  const tried = reviewAttempts.map((attempt) => `\`${attempt.model}\` ${attempt.outcome}`);
  return [`- ${phase} reviewer: ${model ? `\`${model}\`` : "none"} (${tried.join(", ")}).`];
}

try {
  if (mode === "repair") {
    // 1. Hold back providers whose discovery failed or changed suspiciously, one provider at a time.
    const anomalies = providerAnomalies(before, current);
    for (const failure of failures)
      anomalies.set(failure.provider, `discovery failed: ${failure.error}`);
    const today = new Date().toISOString().slice(0, 10);
    const { held, accepted } = decideHolds(anomalies, previous.providers, today);
    const failed = new Set(failures.map((failure) => failure.provider));
    const snapshotWrites = [];
    for (const provider of held.keys()) {
      if (before.snapshots.has(provider))
        snapshotWrites.push(
          await snapshotFile(cataloguePaths(baseline).snapshot(provider), provider),
        );
    }
    // A provider that stayed undiscoverable for the whole hold window no longer lists free offers.
    for (const provider of accepted.keys()) {
      if (current.snapshots.has(provider) && failed.has(provider))
        snapshotWrites.push(await snapshotFile(paths.snapshot(provider), provider, () => false));
    }
    const heldFile =
      held.size || (await Bun.file(heldPath).exists())
        ? [
            {
              path: heldPath,
              contents: serializeJson({
                providers: Object.fromEntries([...held].sort(([a], [b]) => a.localeCompare(b))),
              }),
            },
          ]
        : [];
    await writeTextFilesAtomically([...snapshotWrites, ...heldFile]);
    current = await loadCatalogueState(paths, providerRegistry);

    // 2. Decide each unresolved offer on its own. Anything not approved is deferred, never fatal.
    const unresolved = computeUnresolved(current);
    const tasks = Object.entries(unresolved.providers).flatMap(([provider, ids]) =>
      ids.map((id) => {
        const offer = current.snapshots
          .get(provider)
          ?.offers.find((offer) => offer.model_id === id);
        if (!offer) throw new Error(`Missing discovered offer: ${provider}/${id}`);
        return { provider, id, name: offer.name, candidates: identityCandidates(current, offer) };
      }),
    );
    const key = (task: { provider: string; id: string }) => `${task.provider}/${task.id}`;
    const reviewable =
      tasks.length <= MAX_REPAIRS ? tasks.filter((task) => task.candidates.length === 1) : [];
    const reasons = new Map<string, string>();
    for (const task of tasks)
      reasons.set(
        key(task),
        tasks.length > MAX_REPAIRS
          ? `more than ${MAX_REPAIRS} unresolved identities`
          : task.candidates.length === 1
            ? "reviewer gave no decision"
            : task.candidates.length
              ? "ambiguous identity candidates"
              : "no corroborated identity candidate",
      );
    const reviewableIds = new Set(reviewable.map(key));
    const approved = new Set<string>();
    let reviewer: string | undefined;
    if (reviewable.length) {
      try {
        const review = freeReviewer(reviewerPool);
        reviewAttempts = review.attempts;
        const verdict = await review(
          `Check each proposed identity against its upstream model ID. Preserve versions, quantization and variants. Decide each proposal independently. Return {"decisions":[{"provider":string,"id":string,"approve":boolean,"reason":string}]} with one decision per proposal.\n${JSON.stringify(reviewable)}`,
          z
            .object({
              decisions: z.array(
                z.object({
                  provider: z.string(),
                  id: z.string(),
                  approve: z.boolean(),
                  reason: z.string().max(500),
                }),
              ),
            })
            .strict(),
        );
        reviewer = verdict.model;
        for (const decision of verdict.result.decisions) {
          // Only proposals the reviewer was shown can be approved.
          if (!reviewableIds.has(key(decision))) continue;
          if (decision.approve) approved.add(key(decision));
          else reasons.set(key(decision), `reviewer declined: ${decision.reason}`);
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : "reviewer failed";
        for (const task of reviewable) reasons.set(key(task), `review unavailable: ${detail}`);
      }
    }

    const models = new Map(current.canonicalModels.models.map((model) => [model.id, model]));
    const mappings = new Map(
      [...current.mappings].map(([provider, mapping]) => [
        provider,
        { provider, mappings: { ...mapping.mappings } },
      ]),
    );
    const resolved = reviewable.filter((task) => approved.has(key(task)));
    for (const task of resolved) {
      const candidate = task.candidates[0];
      const mapping = mappings.get(task.provider);
      if (!candidate || !mapping) throw new Error("Missing validated candidate or provider");
      models.set(candidate.id, candidate);
      mapping.mappings[task.id] = candidate.id;
    }
    // Deferred offers stay out of this proposal and are retried by the next scheduled run.
    const deferred = tasks
      .filter((task) => !approved.has(key(task)))
      .map((task) => ({ provider: task.provider, id: task.id, reason: reasons.get(key(task)) }));
    const deferredIds = new Set(deferred.map(key));
    const prunedSnapshots = await Promise.all(
      [...current.snapshots.values()]
        .filter((snapshot) =>
          snapshot.offers.some((offer) =>
            deferredIds.has(`${snapshot.provider}/${offer.model_id}`),
          ),
        )
        .map(({ provider }) =>
          snapshotFile(
            paths.snapshot(provider),
            provider,
            (modelId) => !deferredIds.has(`${provider}/${modelId}`),
          ),
        ),
    );
    await writeTextFilesAtomically([
      ...prunedSnapshots,
      ...(resolved.length ? identityFiles([...models.values()], mappings) : []),
    ]);
    await reconcile(paths, providerRegistry);

    const report = {
      phase: mode,
      reviewer,
      reviewAttempts,
      restored: committed.restored,
      held: Object.fromEntries(held),
      accepted: Object.fromEntries(accepted),
      resolved: resolved.map((task) => ({ ...task, canonicalId: task.candidates[0]?.id })),
      deferred,
    };
    await Bun.write(reportPath, serializeJson(report));
    await Bun.write(repairPath, serializeJson(report));
    const lines = [
      ...reviewerLine("Identity", reviewer),
      ...restoredLines,
      ...[...held].map(
        ([provider, hold]) =>
          `- Held \`${provider}\` since ${hold.since} (${hold.reason}); accepted automatically after ${HOLD_DAYS} days.`,
      ),
      ...[...accepted].map(
        ([provider, hold]) =>
          `- Accepted \`${provider}\` change after holding since ${hold.since} (${hold.reason}).`,
      ),
      ...resolved.map((task) => `- Mapped \`${key(task)}\` to \`${task.candidates[0]?.id}\`.`),
      ...deferred.map((task) => `- Deferred \`${key(task)}\` to the next run: ${task.reason}.`),
    ];
    await Bun.write(summaryPath, lines.length ? `${lines.join("\n")}\n` : "");
  } else if (mode === "review") {
    const appendSummary = async (lines: readonly string[]) => {
      if (!lines.length) return;
      const summary = Bun.file(summaryPath);
      const existing = (await summary.exists()) ? await summary.text() : "";
      await Bun.write(summaryPath, `${existing}${lines.join("\n")}\n`);
    };
    await appendSummary(restoredLines);
    if (Object.keys(computeUnresolved(current).providers).length)
      throw new Error("Unresolved identities remain");
    const changed = Bun.spawnSync(["git", "diff", "--name-only", "HEAD"], { stdout: "pipe" });
    if (changed.exitCode !== 0) throw new Error("Cannot inspect change scope");
    const files = changed.stdout.toString().trim().split("\n").filter(Boolean);
    if (files.some((file) => !allowedCataloguePath(file)))
      throw new Error("Change exceeds catalogue-only scope");
    // Metadata is summarized per field; everything else is reviewed as a raw diff.
    const diff = Bun.spawnSync(
      ["git", "diff", "HEAD", "--", "packages/json/catalogue", `:(exclude)${METADATA_PATH}`],
      { stdout: "pipe" },
    );
    if (diff.exitCode !== 0) throw new Error("Cannot inspect catalogue diff");
    const metadata = metadataChanges(before.metadata, current.metadata);
    const metadataChanged =
      metadata.added.length || metadata.removed.length || metadata.fields.length;
    const parts = diffParts(diff.stdout.toString(), REVIEW_PART_CHARS);
    if (parts.length > MAX_REVIEW_PARTS)
      throw new Error("Catalogue diff exceeds review context budget");
    if (metadataChanged && !parts.length) parts.push("");
    if (parts.length) {
      const noLongerListedFree = [...before.snapshots].flatMap(([provider, snapshot]) => {
        const liveIds = new Set(
          current.snapshots.get(provider)?.offers.map((offer) => offer.model_id),
        );
        return snapshot.offers
          .filter((offer) => !liveIds.has(offer.model_id))
          .map((offer) => ({ provider, model_id: offer.model_id }));
      });
      const { accepted } = await readJson(repairPath, repairSchema, { accepted: {} });
      const review = freeReviewer(reviewerPool);
      reviewAttempts = review.attempts;
      const verdicts = [];
      for (const [index, part] of parts.entries()) {
        const verdict = await review(
          `Review part ${index + 1} of ${parts.length} of a catalogue-only change. Reject suspicious identity merges, wrong model variants, contradictory metadata, removals inconsistent with live discovery, corrupted limits or changed connection/auth details. Return {"approve":boolean,"reason":string}. The following offers were present in the baseline but are absent from freshly fetched free-provider discovery; this explains their removal and does not imply the underlying model retired: ${JSON.stringify(noLongerListedFree)}. These provider-level changes were held back and observed on every scheduled discovery for at least ${HOLD_DAYS} days before being accepted, so they reflect the live provider: ${JSON.stringify(accepted)}. packages/json/catalogue/held-providers.json records providers whose previous snapshot is intentionally kept while a suspicious change is observed.${index === 0 && metadataChanged ? ` Canonical metadata was refreshed from upstream registries; upstream may add, drop or rescale fields such as benchmarks. Its changes, summarized per field path with examples: ${JSON.stringify(metadata)}.` : ""}${part ? `\n${part}` : ""}`,
          z.object({ approve: z.boolean(), reason: z.string().max(2000) }).strict(),
        );
        verdicts.push(verdict);
        if (!verdict.result.approve) break;
      }
      const declined = verdicts.find((verdict) => !verdict.result.approve);
      await Bun.write(
        reportPath,
        serializeJson({ phase: mode, approved: !declined, verdicts, reviewAttempts, files }),
      );
      await appendSummary(
        reviewerLine("Final", [...new Set(verdicts.map((verdict) => verdict.model))].join(", ")),
      );
      if (declined) throw new Error(`Catalogue review declined: ${declined.result.reason}`);
    }
  } else throw new Error("Expected repair or review mode");
} catch (error) {
  await Bun.write(
    reportPath,
    serializeJson({
      phase: mode,
      approved: false,
      error: error instanceof Error ? error.message : "Agent failed",
      reviewAttempts,
    }),
  );
  throw error;
}
