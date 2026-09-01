export interface DesignArenaBenchmark {
  arena: string;
  category: string;
  elo: number | null;
  rank: number | null;
  winRate: number | null;
}

export interface ModelConnection {
  provider: string;
  modelId: string;
  connection?: Record<string, unknown>;
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
  connections: ModelConnection[];
  supportedParameters: string[];
  supportsReasoning: boolean;
  supportsTools: boolean;
  isStealth: boolean;
  intelligenceScore: number | null;
  codingScore: number | null;
  agenticScore: number | null;
  designArena: DesignArenaBenchmark[];
}
