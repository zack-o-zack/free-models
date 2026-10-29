export interface ProviderCompliance {
  readonly zdr: boolean;
  readonly noTraining: boolean;
  readonly dataRetention: boolean;
  readonly countries: readonly string[];
  readonly subprocessors?: readonly string[];
  readonly description?: string;
  readonly edge?: boolean;
  readonly conditional?: boolean;
}

export const countryNames: Record<string, string> = {
  US: "United States",
  EU: "European Union",
  FR: "France",
  CA: "Canada",
  SG: "Singapore",
  CN: "China",
  JP: "Japan",
  DE: "Germany",
  GB: "United Kingdom",
  CH: "Switzerland",
};

export function countryCodeToFlag(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (code === "EU") return "🇪🇺";
  if (code.length !== 2) return code;
  const offset = 127397;
  return String.fromCodePoint(code.charCodeAt(0) + offset, code.charCodeAt(1) + offset);
}

export function getCountryName(code: string): string {
  return countryNames[code.toUpperCase()] ?? code.toUpperCase();
}

/** Per-region tooltip label for edge-hosted inference. */
export function edgeGpuRegionLabel(code: string): string {
  return `Edge GPUs in ${getCountryName(code)} (${code.toUpperCase()})`;
}

/**
 * Verified provider-level baseline policies audited against official Terms of Service.
 * Only providers with primary-source legal documentation are included here.
 * Unverified providers are omitted to fail-closed and avoid false privacy promises.
 */
export const providerCompliance: Record<string, ProviderCompliance> = {
  opencode: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US", "EU"],
    description: "Zero data retention with US and EU hosting",
  },
  gemini: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    subprocessors: ["google"],
    description: "Prompts and outputs are logged, reviewed, and used to train models",
  },
  openrouter: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    description: "Free models retain data unless routed through zero-retention endpoints",
  },
  nvidia: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    subprocessors: ["nvidia"],
    description: "Trial interactions are retained and monitored on US servers",
  },
  vercel: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US", "EU"],
    description: "Upstream providers may retain data unless training is disabled",
    conditional: true,
  },
  groq: {
    zdr: false,
    noTraining: true,
    dataRetention: true,
    countries: ["US"],
    subprocessors: ["groq", "google"],
    description: "Logs kept up to 30 days unless zero retention is enabled",
  },
  cloudflare: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US", "EU"],
    subprocessors: ["cloudflare"],
    edge: true,
    description: "Zero data retention and no model training on edge GPUs",
  },
  mistral: {
    zdr: false,
    noTraining: true,
    dataRetention: true,
    countries: ["FR", "EU"],
    subprocessors: ["mistral"],
    description: "Logs kept up to 30 days unless zero retention is enabled",
  },
  cohere: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    subprocessors: ["cohere", "google"],
    description: "Trial prompts are logged for 30 days and may be used to train models",
  },
  onomeo: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: [],
    subprocessors: ["onomeo", "cloudflare", "railway"],
    description: "Keeps 30-day excerpts and upstream providers may train",
    conditional: true,
  },
  kilo: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: [],
    subprocessors: ["kilo", "openrouter"],
    description: "Free models may log prompts and outputs",
    conditional: true,
  },
  requesty: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: [],
    subprocessors: ["requesty", "aws"],
    description: "Free plan logs up to 30 days and may train on prompts",
  },
  routeway: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: [],
    subprocessors: ["routeway", "aws", "google"],
    description: "Upstream providers may retain or use prompts",
    conditional: true,
  },
  novita: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US"],
    subprocessors: ["novita", "aws"],
    description: "API content is not retained and not used for model training",
  },
  nous: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: [],
    subprocessors: ["nous"],
    description: "Prompts and completions may be logged and used for training",
  },
  "z-ai": {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["SG"],
    subprocessors: ["zhipu"],
    description: "Zero data retention and no model training with Singapore hosting",
  },
  zai: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["SG"],
    subprocessors: ["zhipu"],
    description: "Zero data retention and no model training with Singapore hosting",
  },
  anyapi: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: [],
    subprocessors: [],
    description: "Retention policies vary by upstream provider",
    conditional: true,
  },
  bazaarlink: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: [],
    subprocessors: [],
    description: "Upstream providers may retain or use prompts",
    conditional: true,
  },
  commandcode: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: [],
    subprocessors: [],
    description: "Free models retain prompts up to 30 days",
  },
  llm7: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: [],
    subprocessors: ["cloudflare"],
    description: "Responses may be cached up to 5 minutes",
    conditional: true,
  },
};

/**
 * Model-specific compliance overrides where individual models diverge from provider defaults.
 */
export const modelComplianceOverrides: Record<string, Partial<ProviderCompliance>> = {
  "opencode:recursive/flint-v1.0": {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    description: "Preview model retains prompts and outputs",
  },
  "opencode:nvidia/nemotron-3.5-super-vl": {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    subprocessors: ["nvidia"],
    description: "NVIDIA trial endpoint logs interactions on US servers",
  },
  "opencode:nemotron-3.5-super-vl-free": {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    subprocessors: ["nvidia"],
    description: "NVIDIA trial endpoint logs interactions on US servers",
  },
  "opencode:nemotron-3.5-lightning-free": {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    subprocessors: ["nvidia"],
    description: "NVIDIA trial endpoint logs interactions on US servers",
  },
  "opencode:flint-40b-free": {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    description: "Preview model retains prompts and outputs",
  },
  "opencode:beam-free": {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    description: "Preview model retains prompts and outputs",
  },
  "opencode:big-pickle": {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    description: "Preview model retains prompts and outputs",
  },
  "opencode:mimo-v2.6-flash-free": {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    description: "Preview model retains prompts and outputs",
  },
  "mistral:labs-leanstral-1-5": {
    noTraining: false,
    description: "Labs models may use prompts and outputs for training",
  },
  "mistral:labs-leanstral-1-5-1": {
    noTraining: false,
    description: "Labs models may use prompts and outputs for training",
  },
  "mistral:mistralai/leanstral-1-5": {
    noTraining: false,
    description: "Labs models may use prompts and outputs for training",
  },
};

export function getProviderCompliance(provider: string): ProviderCompliance | undefined {
  return providerCompliance[provider.toLowerCase()];
}

export function isConditionalCompliance(compliance: ProviderCompliance): boolean {
  return !compliance.zdr && compliance.conditional === true;
}

export function getModelProviderCompliance(
  modelId: string,
  provider: string,
  connectionCompliance?: ProviderCompliance,
): ProviderCompliance | undefined {
  if (connectionCompliance) {
    return connectionCompliance;
  }

  const base = getProviderCompliance(provider);
  if (!base) return undefined;

  const key = `${provider.toLowerCase()}:${modelId.toLowerCase()}`;
  const override = modelComplianceOverrides[key];
  if (!override) return base;

  return {
    ...base,
    ...override,
  };
}

export interface ModelComplianceTarget {
  readonly id?: string;
  readonly connections?: readonly {
    readonly provider: string;
    readonly compliance?: ProviderCompliance;
  }[];
}

/** Returns whether a model has at least one connection with verified Zero Data Retention. */
export function modelHasZdr(
  model: ModelComplianceTarget,
  allowedProviders?: readonly string[],
): boolean {
  const connections = model.connections ?? [];
  const activeConnections =
    allowedProviders && allowedProviders.length > 0
      ? connections.filter((c) => allowedProviders.includes(c.provider))
      : connections;

  return activeConnections.some((c) => {
    const compliance = getModelProviderCompliance(model.id ?? "", c.provider, c.compliance);
    return compliance?.zdr === true;
  });
}

/** Returns the set of all country/region codes where the model is hosted. */
export function getModelCountries(
  model: ModelComplianceTarget,
  allowedProviders?: readonly string[],
): string[] {
  const connections = model.connections ?? [];
  const activeConnections =
    allowedProviders && allowedProviders.length > 0
      ? connections.filter((c) => allowedProviders.includes(c.provider))
      : connections;

  const countries = new Set<string>();
  for (const c of activeConnections) {
    const compliance = getModelProviderCompliance(model.id ?? "", c.provider, c.compliance);
    if (compliance?.countries) {
      for (const country of compliance.countries) {
        countries.add(country);
      }
    }
  }
  return Array.from(countries);
}
