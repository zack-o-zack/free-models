import { z } from "zod";
import { createHtmlRewriter } from "./source.ts";

const pageModelsSchema = z
  .array(
    z.object({
      copyString: z.string().regex(/^[a-z0-9._-]+\/[a-z0-9._-]+$/),
      displayName: z.string().trim().min(1),
      type: z.enum([
        "chat",
        "image",
        "embedding",
        "transcription",
        "realtime",
        "reranking",
        "speech",
        "tool",
        "decision",
        "video",
      ]),
      availableToFreeTier: z.boolean(),
      isFree: z.boolean().optional(),
    }),
  )
  .min(1);

export type VercelCatalogueModel = z.infer<typeof pageModelsSchema>[number];

export async function parseVercelCatalogue(html: string): Promise<VercelCatalogueModel[]> {
  const scripts: string[] = [];
  let current = "";
  await createHtmlRewriter()
    .on("script", {
      element(element) {
        current = "";
        element.onEndTag(() => {
          scripts.push(current);
        });
      },
      text(chunk) {
        current += chunk.text;
      },
    })
    .transform(new Response(html))
    .text();

  // Next.js may split a Flight row across script tags. Decode data, never execute scripts.
  const flight = scripts
    .flatMap((script) => {
      const match = script.trim().match(/^self\.__next_f\.push\((\[.*\])\);?$/s);
      if (!match) return [];
      const chunk: unknown = JSON.parse(match[1] ?? "");
      return Array.isArray(chunk) && chunk[0] === 1 && typeof chunk[1] === "string"
        ? [chunk[1]]
        : [];
    })
    .join("");
  const catalogues: VercelCatalogueModel[][] = [];
  for (const line of flight.split("\n")) {
    const match = line.match(/^[a-f0-9]+:(\[.*\])$/);
    if (!match) continue;
    let row: unknown;
    try {
      row = JSON.parse(match[1] ?? "");
    } catch {
      continue;
    }
    if (
      !Array.isArray(row) ||
      row[0] !== "$" ||
      !row[3] ||
      typeof row[3] !== "object" ||
      !("models" in row[3])
    )
      continue;
    catalogues.push(pageModelsSchema.parse(row[3].models));
  }
  if (catalogues.length !== 1)
    throw new Error("Vercel catalogue has no unique model eligibility list");
  const models = catalogues[0] ?? [];
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.copyString))
      throw new Error(`Vercel catalogue contains duplicate ID: ${model.copyString}`);
    seen.add(model.copyString);
  }
  return models;
}
