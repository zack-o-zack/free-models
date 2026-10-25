export interface ProviderCompliance {
  readonly zdr: boolean;
  readonly noTraining: boolean;
  readonly dataRetention: boolean;
  readonly countries: readonly string[];
  readonly description?: string;
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

/**
 * Provider-level compliance, ZDR, training policies, and hosting footprint.
 * Evaluated per provider, reflecting their platform and free/trial tier guarantees.
 */
export const providerCompliance: Record<string, ProviderCompliance> = {
  opencode: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US", "EU"],
    description: "Zero data retention on paid & select free models; US & EU hosted",
  },
  gemini: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    description: "Unpaid quota is retained and used to train Google models",
  },
  openrouter: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US"],
    description: "Zero data retention parameter supported; prompt logging opt-in only",
  },
  nvidia: {
    zdr: false,
    noTraining: false,
    dataRetention: true,
    countries: ["US"],
    description: "Trial API logs interactions and uses inputs/outputs for model training",
  },
  vercel: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US", "EU"],
    description: "Zero data retention enforced at gateway and compliant upstream providers",
  },
  groq: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US"],
    description: "Zero data retention on LPU inference; does not train on customer data",
  },
  cloudflare: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US", "EU"],
    description: "Ephemeral in-memory inference on Workers AI; no model training",
  },
  mistral: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["FR", "EU"],
    description: "European hosting with zero data retention available",
  },
  cohere: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["CA", "US"],
    description: "Enterprise privacy controls with no training on prompts",
  },
  novita: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US"],
  },
  nous: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US"],
  },
  commandcode: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US"],
  },
  kilo: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US"],
  },
  llm7: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US"],
  },
  routeway: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US"],
  },
  requesty: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US", "EU"],
  },
  bazaarlink: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US"],
  },
  onomeo: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US"],
  },
  anyapi: {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["US"],
  },
  "z-ai": {
    zdr: true,
    noTraining: true,
    dataRetention: false,
    countries: ["CN"],
  },
};

export function getProviderCompliance(provider: string): ProviderCompliance | undefined {
  const key = provider.toLowerCase().trim();
  return providerCompliance[key];
}
