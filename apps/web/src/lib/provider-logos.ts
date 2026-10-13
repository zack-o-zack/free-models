import type { ProviderDoc } from "@/lib/model-types";

const publisherWebsites: Record<string, string> = {
  ai4bharat: "https://ai4bharat.iitm.ac.in/",
  aisingapore: "https://aisingapore.org/",
  baai: "https://bge.baai.ac.cn/",
  "black-forest-labs": "https://bfl.ai/",
  canopylabs: "https://canopylabs.ai/",
  cohere: "https://cohere.com/",
  deepgram: "https://deepgram.com/",
  deepseek: "https://www.deepseek.com/",
  "dots-studio": "https://dots-studio.com/",
  "fish-audio": "https://fish.audio/",
  google: "https://ai.google.dev/",
  hexgrad: "https://github.com/hexgrad/kokoro",
  huggingface: "https://huggingface.co/",
  "ibm-granite": "https://www.ibm.com/granite",
  inclusionai: "https://www.inclusion-ai.org/",
  leonardo: "https://leonardo.ai/",
  liquid: "https://www.liquid.ai/",
  meta: "https://ai.meta.com/",
  "meta-llama": "https://www.llama.com/",
  microsoft: "https://www.microsoft.com/",
  minimax: "https://minimaxi.com/",
  mistral: "https://mistral.ai/",
  mistralai: "https://mistral.ai/",
  moondream: "https://moondream.ai/",
  moonshotai: "https://www.moonshot.ai/",
  "myshell-ai": "https://myshell.ai/",
  nvidia: "https://www.nvidia.com/en-us/",
  openai: "https://openai.com/",
  pfnet: "https://www.pfnet.co.jp/",
  "pipecat-ai": "https://www.pipecat.ai/",
  poolside: "https://poolside.ai/",
  qwen: "https://qwen.ai/",
  rekaai: "https://www.reka.ai/",
  stepfun: "https://www.stepfun.com/",
  tencent: "https://www.tencentcloud.com/",
  thinkingmachines: "https://thinkingmachines.ai/",
  xiaomi: "https://www.mi.com/",
  "z-ai": "https://z.ai/",
};

export const providerNames: Record<string, string> = {
  ai4bharat: "AI4Bharat",
  aisingapore: "AI Singapore",
  baai: "BAAI",
  bazaarlink: "BazaarLink",
  "black-forest-labs": "Black Forest Labs",
  canopylabs: "Canopy Labs",
  cloudflare: "Cloudflare",
  cohere: "Cohere",
  deepgram: "Deepgram",
  deepseek: "DeepSeek",
  "dots-studio": "Dots Studio",
  "fish-audio": "Fish Audio",
  gemini: "Gemini",
  google: "Google",
  groq: "Groq",
  hexgrad: "Hexgrad",
  huggingface: "Hugging Face",
  "ibm-granite": "IBM Granite",
  inclusionai: "InclusionAI",
  kilo: "Kilo",
  leonardo: "Leonardo",
  liquid: "Liquid",
  meta: "Meta",
  "meta-llama": "Meta Llama",
  microsoft: "Microsoft",
  minimax: "MiniMax",
  mistral: "Mistral",
  mistralai: "Mistral AI",
  moondream: "Moondream",
  moonshotai: "Moonshot AI",
  "myshell-ai": "MyShell",
  nvidia: "NVIDIA",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  opencode: "OpenCode",
  pfnet: "PFNet",
  "pipecat-ai": "Pipecat",
  poolside: "Poolside",
  qwen: "Qwen",
  rekaai: "Reka AI",
  requesty: "Requesty",
  routeway: "Routeway",
  stepfun: "StepFun",
  tencent: "Tencent",
  tokenrouter: "TokenRouter",
  thinkingmachines: "Thinking Machines",
  xiaomi: "Xiaomi",
  "z-ai": "Z.ai",
};

export function getProviderName(providerSlug: string, liveNames?: Record<string, string>): string {
  const normalizedSlug = providerSlug.toLowerCase();
  return (
    liveNames?.[normalizedSlug] ??
    providerNames[normalizedSlug] ??
    providerNames[normalizedSlug.split(":", 1)[0]] ??
    providerSlug
  );
}

export function publisherFaviconUrl(publisherSlug: string, size: 64 | 128 = 64): string | null {
  const website = publisherWebsites[publisherSlug.toLowerCase()];
  return faviconUrl(website, size);
}

export function providerFaviconUrl(docs?: ProviderDoc, size: 64 | 128 = 64): string | null {
  for (const url of [docs?.overview, docs?.models, docs?.pricing, docs?.rateLimit]) {
    const favicon = faviconUrl(url, size);
    if (favicon) return favicon;
  }
  return null;
}

function faviconUrl(website: string | undefined, size: 64 | 128): string | null {
  if (!website) return null;
  try {
    if (!["https:", "http:"].includes(new URL(website).protocol)) return null;
  } catch {
    return null;
  }

  const params = new URLSearchParams({
    client: "SOCIAL",
    type: "FAVICON",
    fallback_opts: "TYPE,SIZE,URL",
    url: website,
    size: String(size),
  });

  return `https://t0.gstatic.com/faviconV2?${params.toString()}`;
}
