import type { ModelSummary } from "@/lib/model-types";

export const MODEL_CATALOGUE_URL = "https://static.zackozack.com/free-models.json";

interface RawModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  created?: number;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  providers: Record<string, RawProvider>;
  supported_parameters?: string[];
  reasoning?: {
    mandatory?: boolean;
  };
  benchmarks?: {
    artificial_analysis?: {
      agentic_index?: number | null;
      coding_index?: number | null;
      intelligence_index?: number | null;
    };
    design_arena?: Array<{
      arena: string;
      category: string;
      elo?: number | null;
      rank?: number | null;
      win_rate?: number | null;
    }>;
  };
}

interface RawProvider {
  offers?: RawOffer[];
}

interface RawOffer {
  model_id?: string;
  connection?: Record<string, unknown>;
}

interface RawCatalogue {
  models: RawModel[];
}

function humanizeAuthor(id: string): string {
  return id
    .split("/")[0]
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toModelSummary(model: RawModel): ModelSummary {
  const supportedParameters = model.supported_parameters ?? [];
  const providerEntries = Object.entries(model.providers);
  const connections = providerEntries.flatMap(([provider, details]) =>
    (details.offers ?? []).flatMap((offer) =>
      offer.model_id
        ? [
            {
              provider,
              modelId: offer.model_id,
              connection: offer.connection ?? {},
            },
          ]
        : [],
    ),
  );

  return {
    id: model.id,
    name: model.name,
    author: humanizeAuthor(model.id),
    description:
      model.description?.replace(/\[([^\]]+)\]\(<?[^)]+>?\)/g, "$1") ??
      "Model details are not yet available in the catalogue.",
    contextLength: model.context_length ?? 0,
    created: model.created ?? null,
    inputModalities: model.architecture?.input_modalities ?? [],
    outputModalities: model.architecture?.output_modalities ?? [],
    providers: providerEntries.map(([provider]) => provider),
    connections,
    supportedParameters,
    supportsReasoning:
      model.reasoning?.mandatory === true ||
      supportedParameters.some((parameter) => parameter.includes("reasoning")),
    supportsTools: supportedParameters.includes("tools"),
    isStealth: model.id.startsWith("stealth:"),
    intelligenceScore: model.benchmarks?.artificial_analysis?.intelligence_index ?? null,
    codingScore: model.benchmarks?.artificial_analysis?.coding_index ?? null,
    agenticScore: model.benchmarks?.artificial_analysis?.agentic_index ?? null,
    designArena: (model.benchmarks?.design_arena ?? []).map((benchmark) => ({
      arena: benchmark.arena,
      category: benchmark.category,
      elo: benchmark.elo ?? null,
      rank: benchmark.rank ?? null,
      winRate: benchmark.win_rate ?? null,
    })),
  };
}

export async function getModels(): Promise<ModelSummary[]> {
  const response = await fetch(MODEL_CATALOGUE_URL, { cache: "force-cache" });

  if (!response.ok) {
    throw new Error(`Model catalogue request failed with HTTP status ${response.status}`);
  }

  const catalogue = (await response.json()) as RawCatalogue;

  if (!Array.isArray(catalogue.models)) {
    throw new Error("Model catalogue response is malformed: expected a models array");
  }

  return catalogue.models.map(toModelSummary);
}
