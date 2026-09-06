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
  name?: string;
  offers?: RawOffer[];
  doc?: {
    overview?: string;
    models?: string;
    pricing?: string;
    rate_limit?: string;
  };
}

interface RawOffer {
  model_id?: string;
  connection?: Record<string, unknown>;
  limits?: {
    terms?: string[];
  };
}

interface RawCatalogue {
  models: RawModel[];
}

const publisherNames: Record<string, string> = {
  ai4bharat: "AI4Bharat",
  aisingapore: "AI Singapore",
  baai: "BAAI",
  deepseek: "DeepSeek",
  huggingface: "Hugging Face",
  "ibm-granite": "IBM Granite",
  inclusionai: "InclusionAI",
  minimax: "MiniMax",
  mistralai: "Mistral AI",
  moonshotai: "Moonshot AI",
  "myshell-ai": "MyShell",
  nvidia: "NVIDIA",
  openai: "OpenAI",
  pfnet: "PFNet",
  "pipecat-ai": "Pipecat",
  rekaai: "Reka AI",
  thinkingmachines: "Thinking Machines",
  "z-ai": "Z.ai",
};

function humanizeAuthor(id: string, name?: string): string {
  if (id.startsWith("stealth:")) {
    return "Stealth";
  }

  const publisher = id.split("/")[0];
  if (publisherNames[publisher]) {
    return publisherNames[publisher];
  }

  if (name?.includes(":")) {
    const candidate = name.split(":")[0].trim();
    if (candidate.length > 0 && candidate.length < 30) {
      return candidate;
    }
  }

  return publisher.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
              limits: offer.limits?.terms ?? [],
            },
          ]
        : [],
    ),
  );

  return {
    id: model.id,
    name: model.name,
    author: humanizeAuthor(model.id, model.name),
    description:
      model.description?.replace(/\[([^\]]+)\]\(<?[^)]+>?\)/g, "$1") ??
      "Model details are not yet available in the catalogue.",
    contextLength: model.context_length ?? 0,
    created: model.created ?? null,
    inputModalities: model.architecture?.input_modalities ?? [],
    outputModalities: model.architecture?.output_modalities ?? [],
    providers: providerEntries.map(([provider]) => provider),
    providerNames: Object.fromEntries(
      providerEntries
        .filter(([, details]) => typeof details.name === "string" && details.name.length > 0)
        .map(([provider, details]) => [provider, details.name as string]),
    ),
    connections,
    providerDocs: Object.fromEntries(
      providerEntries
        .filter(([, details]) => details.doc)
        .map(([provider, details]) => [
          provider,
          {
            overview: details.doc?.overview,
            models: details.doc?.models,
            pricing: details.doc?.pricing,
            rateLimit: details.doc?.rate_limit,
          },
        ]),
    ),
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
  // Production builds pin the catalogue snapshot (SSG + force-cache).
  // In dev, always refetch so catalogue updates show without a restart.
  const init =
    process.env.NODE_ENV === "development"
      ? { cache: "no-store" as const }
      : { cache: "force-cache" as const };
  const response = await fetch(MODEL_CATALOGUE_URL, init);

  if (!response.ok) {
    throw new Error(`Model catalogue request failed with HTTP status ${response.status}`);
  }

  const catalogue = (await response.json()) as RawCatalogue;

  if (!Array.isArray(catalogue.models)) {
    throw new Error("Model catalogue response is malformed: expected a models array");
  }

  return catalogue.models.map(toModelSummary);
}
