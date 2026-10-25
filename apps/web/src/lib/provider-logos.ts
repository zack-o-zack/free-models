import brandLogos from "@/lib/brand-logos.json";
import type { ProviderDoc } from "@/lib/model-types";

export const publisherAliases: Record<string, string> = {
  "bytedance-seed": "bytedance",
  minimaxai: "minimax",
  "preferred-networks": "pfnet",
  voyageai: "voyage",
  xai: "x-ai",
};

export const publisherWebsites: Record<string, string> = {
  ai4bharat: "https://ai4bharat.iitm.ac.in/",
  aisingapore: "https://aisingapore.org/",
  amazon: "https://aws.amazon.com/",
  "arcee-ai": "https://www.arcee.ai/",
  baai: "https://bge.baai.ac.cn/",
  baseten: "https://www.baseten.co/",
  "black-forest-labs": "https://bfl.ai/",
  browserbase: "https://www.browserbase.com/",
  bytedance: "https://www.volcengine.com/",
  callstack: "https://callstack.com/",
  canopylabs: "https://canopylabs.ai/",
  cohere: "https://cohere.com/",
  convaiinnovations: "https://www.convai.com/",
  "daily-co": "https://www.daily.co/",
  deepgram: "https://deepgram.com/",
  deepseek: "https://www.deepseek.com/",
  "dots-studio": "https://dots-studio.com/",
  exa: "https://exa.ai/",
  "fish-audio": "https://fish.audio/",
  google: "https://ai.google.dev/",
  hexgrad: "https://github.com/hexgrad/kokoro",
  huggingface: "https://huggingface.co/",
  "ibm-granite": "https://www.ibm.com/granite",
  inclusionai: "https://www.inclusion-ai.org/",
  "inference-net": "https://inference.net/",
  interfaze: "https://interfaze.ai/",
  ipd: "https://www.ipd.uw.edu/",
  leonardo: "https://leonardo.ai/",
  liquid: "https://www.liquid.ai/",
  meituan: "https://www.meituan.com/",
  meta: "https://ai.meta.com/",
  "meta-llama": "https://www.llama.com/",
  microsoft: "https://www.microsoft.com/",
  minimax: "https://minimaxi.com/",
  mistral: "https://mistral.ai/",
  mistralai: "https://mistral.ai/",
  mixedbread: "https://www.mixedbread.ai/",
  moondream: "https://moondream.ai/",
  moonshotai: "https://www.moonshot.ai/",
  morph: "https://morph.so/",
  "myshell-ai": "https://myshell.ai/",
  nvidia: "https://www.nvidia.com/en-us//",
  openai: "https://openai.com/",
  ornith: "https://ornith.ai/",
  parallel: "https://parallel.ai/",
  pfnet: "https://preferred.jp/",
  "pipecat-ai": "https://www.pipecat.ai/",
  poolside: "https://poolside.ai/",
  prodia: "https://prodia.com/",
  quiverai: "https://quiverai.com/",
  qwen: "https://qwen.ai/",
  reflection: "https://reflectionai.org/",
  rekaai: "https://www.reka.ai/",
  respan: "https://respan.ai/",
  routeway: "https://docs.routeway.ai/",
  scaledown: "https://scaledown.ai/",
  stepfun: "https://www.stepfun.com/",
  tako: "https://tako.com/",
  tencent: "https://www.tencentcloud.com/",
  thinkingmachines: "https://thinkingmachines.ai/",
  typesafe: "https://typesafe.ai/",
  upstage: "https://www.upstage.ai/",
  voyage: "https://www.voyageai.com/",
  "x-ai": "https://x.ai/",
  xiaomi: "https://www.mi.com/",
  "xingchen-agi": "https://xingchen.aliyun.com/",
  "z-ai": "https://z.ai/",
};

export const providerWebsites: Record<string, string> = {
  anyapi: "https://docs.anyapi.ai/",
  bazaarlink: "https://bazaarlink.ai/",
  cloudflare: "https://developers.cloudflare.com/",
  cohere: "https://docs.cohere.com/",
  commandcode: "https://commandcode.ai/",
  groq: "https://console.groq.com/",
  kilo: "https://kilo.ai/",
  llm7: "https://docs.llm7.io/",
  mistral: "https://docs.mistral.ai/",
  novita: "https://novita.ai/",
  nous: "https://portal.nousresearch.com/",
  nvidia: "https://docs.api.nvidia.com/",
  onomeo: "https://onomeo.com/",
  opencode: "https://opencode.ai/",
  openrouter: "https://openrouter.ai/",
  requesty: "https://docs.requesty.ai/",
  routeway: "https://docs.routeway.ai/",
  vercel: "https://vercel.com/",
  "z-ai": "https://docs.z.ai/",
};

export const providerNames: Record<string, string> = {
  ai4bharat: "AI4Bharat",
  aisingapore: "AI Singapore",
  amazon: "Amazon",
  anyapi: "AnyAPI",
  "arcee-ai": "Arcee AI",
  baai: "BAAI",
  baseten: "Baseten",
  bazaarlink: "BazaarLink",
  "black-forest-labs": "Black Forest Labs",
  browserbase: "Browserbase",
  bytedance: "ByteDance",
  "bytedance-seed": "ByteDance Seed",
  callstack: "Callstack",
  canopylabs: "Canopy Labs",
  cloudflare: "Cloudflare",
  cohere: "Cohere",
  commandcode: "CommandCode",
  convaiinnovations: "Convai",
  "daily-co": "Daily",
  deepgram: "Deepgram",
  deepseek: "DeepSeek",
  "dots-studio": "Dots Studio",
  exa: "Exa",
  "fish-audio": "Fish Audio",
  gemini: "Gemini",
  google: "Google",
  groq: "Groq",
  hexgrad: "Hexgrad",
  huggingface: "Hugging Face",
  "ibm-granite": "IBM Granite",
  inclusionai: "InclusionAI",
  "inference-net": "Inference.net",
  interfaze: "Interfaze",
  ipd: "IPD",
  kilo: "Kilo",
  leonardo: "Leonardo",
  liquid: "Liquid",
  llm7: "LLM7",
  meituan: "Meituan",
  meta: "Meta",
  "meta-llama": "Meta Llama",
  microsoft: "Microsoft",
  minimax: "MiniMax",
  minimaxai: "MiniMax",
  mistral: "Mistral",
  mistralai: "Mistral AI",
  mixedbread: "Mixedbread",
  moondream: "Moondream",
  moonshotai: "Moonshot AI",
  morph: "Morph",
  "myshell-ai": "MyShell",
  novita: "Novita",
  nous: "Nous Research",
  nvidia: "NVIDIA",
  onomeo: "Onomeo",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  opencode: "OpenCode",
  ornith: "Ornith",
  parallel: "Parallel",
  pfnet: "PFNet",
  "pipecat-ai": "Pipecat",
  poolside: "Poolside",
  prodia: "Prodia",
  quiverai: "QuiverAI",
  qwen: "Qwen",
  recursive: "Recursive",
  reflection: "Reflection AI",
  rekaai: "Reka AI",
  requesty: "Requesty",
  respan: "Respan",
  routeway: "Routeway",
  scaledown: "ScaleDown",
  stepfun: "StepFun",
  tako: "Tako",
  tencent: "Tencent",
  tokenrouter: "TokenRouter",
  thinkingmachines: "Thinking Machines",
  typesafe: "TypeSafe",
  upstage: "Upstage",
  vercel: "Vercel",
  voyage: "Voyage AI",
  voyageai: "Voyage AI",
  "x-ai": "xAI",
  xiaomi: "Xiaomi",
  "xingchen-agi": "Xingchen AGI",
  "z-ai": "Z.ai",
};

export function getProviderName(providerSlug: string, liveNames?: Record<string, string>): string {
  const normalizedSlug = providerSlug.toLowerCase();
  const canonical = publisherAliases[normalizedSlug] ?? normalizedSlug;
  return (
    liveNames?.[normalizedSlug] ??
    providerNames[normalizedSlug] ??
    providerNames[canonical] ??
    providerNames[normalizedSlug.split(":", 1)[0]] ??
    providerSlug
  );
}

export function publisherFaviconUrl(publisherSlug: string): string | null {
  const rawSlug = publisherSlug.toLowerCase();
  const slug = publisherAliases[rawSlug] ?? rawSlug;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const manifest = brandLogos as Record<string, string>;
  const directLogo = manifest[`publisher:${slug}`] ?? manifest[`publisher:${rawSlug}`];
  if (directLogo) return directLogo;

  const website = publisherWebsites[slug] ?? publisherWebsites[rawSlug] ?? providerWebsites[slug];
  const favicon = faviconUrl(website);
  if (favicon) return favicon;

  return manifest[`provider:${slug}`] ?? null;
}

export function providerFaviconUrl(docs?: ProviderDoc): string | null {
  for (const url of [docs?.overview, docs?.models, docs?.pricing, docs?.rateLimit]) {
    const favicon = faviconUrl(url);
    if (favicon) return favicon;
  }
  return null;
}

export function providerLogoUrl(providerSlug: string, docs?: ProviderDoc): string | null {
  if (docs) {
    const docFavicon = providerFaviconUrl(docs);
    if (docFavicon) return docFavicon;
  }
  const slug = providerSlug.toLowerCase();
  const website = providerWebsites[slug];
  return (
    faviconUrl(website) ??
    (brandLogos as Record<string, string>)[`provider:${slug}`] ??
    publisherFaviconUrl(providerSlug) ??
    null
  );
}

function faviconUrl(website: string | undefined): string | null {
  if (!website) return null;
  try {
    const url = new URL(website);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    return (brandLogos as Record<string, string>)[url.hostname] ?? null;
  } catch {
    return null;
  }
}
