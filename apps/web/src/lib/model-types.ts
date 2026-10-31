import type { ProviderCompliance } from "./provider-compliance";

export interface DesignArenaBenchmark {
  arena: string;
  category: string;
  elo: number | null;
  rank: number | null;
  winRate: number | null;
}

export interface ProviderDoc {
  overview?: string;
  models?: string;
  pricing?: string;
  rateLimit?: string;
}

export interface ModelConnection {
  provider: string;
  modelId: string;
  connection?: Record<string, unknown>;
  limits: string[];
  funding?: "no_credits" | "monthly_credits";
  compliance?: ProviderCompliance;
}

export interface ModelSummary {
  id: string;
  name: string;
  author: string;
  description: string;
  contextLength: number;
  created: number | null;
  inputModalities: string[];
  outputModalities: string[];
  providers: string[];
  providerNames: Record<string, string>;
  connections: ModelConnection[];
  providerDocs: Record<string, ProviderDoc>;
  supportedParameters: string[];
  supportsReasoning: boolean;
  supportsTools: boolean;
  isStealth: boolean;
  modelType: string | null;
  topics: string[];
  embeddingDimensions: number[];
  /** Paid list price per input token in USD; the free offers themselves cost nothing. */
  promptPrice: number | null;
  intelligenceScore: number | null;
  codingScore: number | null;
  agenticScore: number | null;
  designArena: DesignArenaBenchmark[];
}

export type CatalogueModel = Omit<ModelSummary, "connections" | "supportedParameters"> & {
  connections: Pick<ModelConnection, "provider" | "funding" | "compliance">[];
};
