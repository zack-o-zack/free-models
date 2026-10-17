import { resolve } from "node:path";
import { z } from "zod";
import { cataloguePaths, serializeJson, writeTextFilesAtomically } from "../catalogue/files.ts";
import { canonicalModelsSchema, providerMappingsSchema } from "../catalogue/schema.ts";
import { computeUnresolved, loadCatalogueState } from "../catalogue/state.ts";
import { reconcile } from "../catalogue/workflow.ts";
import { providerRegistry } from "../providers/registry.ts";
import { freeReviewer } from "./inference.ts";
import { allowedCataloguePath, assertSafeDelta, identityCandidates } from "./policy.ts";

const paths = cataloguePaths(resolve("packages/json"));
const baseline = process.env.CATALOGUE_BASELINE;
if (!baseline) throw new Error("CATALOGUE_BASELINE must point to the baseline workspace");
const before = await loadCatalogueState(cataloguePaths(baseline), providerRegistry);
const current = await loadCatalogueState(paths, providerRegistry);
const mode = process.argv[2];
const reportPath = resolve(".scratch/catalogue-agent-report.json");

try {
  assertSafeDelta(before, current);
  const unresolved = computeUnresolved(current);
  if (mode === "repair") {
    const tasks = Object.entries(unresolved.providers).flatMap(([provider, ids]) =>
      ids.map((id) => {
        const offer = current.snapshots
          .get(provider)
          ?.offers.find((offer) => offer.model_id === id);
        if (!offer) throw new Error(`Missing discovered offer: ${provider}/${id}`);
        return { provider, id, name: offer.name, candidates: identityCandidates(current, offer) };
      }),
    );
    if (tasks.length > 40)
      throw new Error("More than 40 unresolved identities; manual investigation required");
    if (tasks.some((task) => task.candidates.length !== 1))
      throw new Error("Uncorroborated or ambiguous identities; refusing to guess");
    if (tasks.length) {
      const review = await freeReviewer(before.snapshots);
      const verdict = await review(
        `Check each proposed identity against the supplied upstream model IDs. Preserve versions, quantization and variants. Return {"approve":boolean,"reason":string}. Approve only if ALL proposals are sound.\n${JSON.stringify(tasks)}`,
        z.object({ approve: z.boolean(), reason: z.string().max(2000) }).strict(),
      );
      if (!verdict.result.approve)
        throw new Error(`Identity review declined: ${verdict.result.reason}`);
      const models = new Map(current.canonicalModels.models.map((model) => [model.id, model]));
      const mappings = new Map(
        [...current.mappings].map(([provider, mapping]) => [
          provider,
          { provider, mappings: { ...mapping.mappings } },
        ]),
      );
      for (const task of tasks) {
        const candidate = task.candidates[0];
        const mapping = mappings.get(task.provider);
        if (!candidate || !mapping) throw new Error("Missing validated candidate or provider");
        models.set(candidate.id, candidate);
        mapping.mappings[task.id] = candidate.id;
      }
      await writeTextFilesAtomically([
        {
          path: paths.canonicalModels,
          contents: serializeJson(
            canonicalModelsSchema.parse({
              models: [...models.values()].sort((a, b) => a.id.localeCompare(b.id)),
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
      ]);
      await Bun.write(reportPath, serializeJson({ phase: mode, ...verdict, identities: tasks }));
    }
    await reconcile(paths, providerRegistry);
  } else if (mode === "review") {
    if (Object.keys(unresolved.providers).length) throw new Error("Unresolved identities remain");
    const changed = Bun.spawnSync(["git", "diff", "--name-only", "HEAD"], { stdout: "pipe" });
    if (changed.exitCode !== 0) throw new Error("Cannot inspect change scope");
    const files = changed.stdout.toString().trim().split("\n").filter(Boolean);
    if (files.some((file) => !allowedCataloguePath(file)))
      throw new Error("Change exceeds catalogue-only scope");
    const diff = Bun.spawnSync(["git", "diff", "HEAD", "--", "packages/json/catalogue"], {
      stdout: "pipe",
    });
    if (diff.exitCode !== 0) throw new Error("Cannot inspect catalogue diff");
    const evidence = diff.stdout.toString();
    if (evidence.length > 140_000) throw new Error("Catalogue diff exceeds review context budget");
    if (evidence) {
      const noLongerListedFree = [...before.snapshots].flatMap(([provider, snapshot]) => {
        const liveIds = new Set(
          current.snapshots.get(provider)?.offers.map((offer) => offer.model_id),
        );
        return snapshot.offers
          .filter((offer) => !liveIds.has(offer.model_id))
          .map((offer) => ({ provider, model_id: offer.model_id }));
      });
      const review = await freeReviewer(before.snapshots);
      const verdict = await review(
        `Review this catalogue-only diff. Reject suspicious identity merges, wrong model variants, contradictory metadata, removals inconsistent with live discovery, corrupted limits or changed connection/auth details. Return {"approve":boolean,"reason":string}. The following offers were present in the baseline but are absent from freshly fetched free-provider discovery; this explains their removal and does not imply the underlying model retired: ${JSON.stringify(noLongerListedFree)}.\n${evidence}`,
        z.object({ approve: z.boolean(), reason: z.string().max(2000) }).strict(),
      );
      await Bun.write(reportPath, serializeJson({ phase: mode, ...verdict, files }));
      if (!verdict.result.approve)
        throw new Error(`Catalogue review declined: ${verdict.result.reason}`);
    }
  } else throw new Error("Expected repair or review mode");
} catch (error) {
  await Bun.write(
    reportPath,
    serializeJson({
      phase: mode,
      approved: false,
      error: error instanceof Error ? error.message : "Agent failed",
    }),
  );
  throw error;
}
