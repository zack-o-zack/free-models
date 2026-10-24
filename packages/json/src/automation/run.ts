import { resolve } from "node:path";
import { z } from "zod";
import { cataloguePaths, serializeJson } from "../catalogue/files.ts";
import { type CatalogueState, computeUnresolved, loadCatalogueState } from "../catalogue/state.ts";
import { reconcile } from "../catalogue/workflow.ts";
import { providerRegistry } from "../providers/registry.ts";
import { createEscalator } from "./escalation.ts";
import { freeReviewer } from "./inference.ts";
import { createJevClient } from "./jev.ts";
import { allowedCataloguePath, assertSafeDelta } from "./policy.ts";
import { type RepairReport, repairCatalogue } from "./repair.ts";
import { loadOpenRouterUniverse } from "./universe.ts";
import type { UniverseModel } from "./identity-index.ts";

const paths = cataloguePaths(resolve("packages/json"));
const mode = process.argv[2];
const reportPath = resolve(".scratch/catalogue-agent-report.json");

async function loadStates(): Promise<{ before: CatalogueState; current: CatalogueState }> {
  const baseline = process.env.CATALOGUE_BASELINE;
  if (!baseline) throw new Error("CATALOGUE_BASELINE must point to the baseline workspace");
  const before = await loadCatalogueState(cataloguePaths(baseline), providerRegistry);
  const current = await loadCatalogueState(paths, providerRegistry);
  return { before, current };
}

if (mode === "repair") {
  await runRepair();
} else if (mode === "review") {
  try {
    await runReview(await loadStates());
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
} else throw new Error("Expected repair or review mode");

async function runRepair(): Promise<void> {
  const report: RepairReport = {
    phase: "repair",
    unresolvedCount: 0,
    pending: [],
    resolutions: [],
    escalationModels: [],
  };
  try {
    const { before, current } = await loadStates();
    const escalator = createEscalator(before.snapshots);
    const summary = await repairCatalogue({
      before,
      current,
      paths,
      jev: createJevClient(),
      escalate: escalator.escalate,
      escalationModels: escalator.models,
      universe: await loadUniverse(),
      report,
      persistReport: writeReport,
      reconcile: () => reconcile(paths, providerRegistry),
    });
    process.exitCode = summary.exitCode;
  } catch (error) {
    report.error = error instanceof Error ? (error.stack ?? error.message) : "Agent failed";
    throw error;
  } finally {
    await writeReport(report);
  }
}

async function loadUniverse(): Promise<readonly UniverseModel[] | null> {
  try {
    return await loadOpenRouterUniverse();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown failure";
    console.warn(`OpenRouter universe unavailable; recall is skipped for this run: ${detail}`);
    return null;
  }
}

async function writeReport(report: RepairReport): Promise<void> {
  await Bun.write(reportPath, serializeJson(report));
}

async function runReview({
  before,
  current,
}: {
  before: CatalogueState;
  current: CatalogueState;
}): Promise<void> {
  assertSafeDelta(before, current);
  const unresolved = computeUnresolved(current);
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
    await Bun.write(reportPath, serializeJson({ phase: "review", ...verdict, files }));
    if (!verdict.result.approve)
      throw new Error(`Catalogue review declined: ${verdict.result.reason}`);
  }
}
