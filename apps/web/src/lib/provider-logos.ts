const providerWebsites: Record<string, string> = {
  ai4bharat: "https://ai4bharat.iitm.ac.in/",
  aisingapore: "https://aisingapore.org/",
  baai: "https://bge.baai.ac.cn/",
  bazaarlink: "https://bazaarlink.ai/",
  "black-forest-labs": "https://bfl.ai/",
  canopylabs: "https://canopylabs.ai/",
  cloudflare: "https://www.cloudflare.com/",
  cohere: "https://cohere.com/",
  deepgram: "https://deepgram.com/",
  deepseek: "https://www.deepseek.com/",
  "dots-studio": "https://dots-studio.com/",
  "fish-audio": "https://fish.audio/",
  gemini: "https://gemini.google.com/",
  google: "https://ai.google.dev/",
  groq: "https://groq.com/",
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
  openrouter: "https://openrouter.ai/",
  opencode: "https://opencode.ai/",
  pfnet: "https://www.pfnet.co.jp/",
  "pipecat-ai": "https://www.pipecat.ai/",
  poolside: "https://poolside.ai/",
  qwen: "https://qwen.ai/",
  rekaai: "https://www.reka.ai/",
  requesty: "https://www.requesty.ai/",
  tencent: "https://www.tencentcloud.com/",
  tokenrouter: "https://www.tokenrouter.com/",
  thinkingmachines: "https://thinkingmachines.ai/",
  xiaomi: "https://www.mi.com/",
  "z-ai": "https://z.ai/",
};

export const providerNames: Record<string, string> = {
  baai: "BAAI",
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
  "ibm-granite": "IBM Granite",
  inclusionai: "InclusionAI",
  liquid: "Liquid",
  meta: "Meta",
  "meta-llama": "Meta Llama",
  minimax: "MiniMax",
  mistral: "Mistral",
  mistralai: "Mistral AI",
  moonshotai: "Moonshot AI",
  nvidia: "NVIDIA",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  opencode: "OpenCode",
  poolside: "Poolside",
  qwen: "Qwen",
  rekaai: "Reka AI",
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

export function providerFaviconUrl(providerSlug: string): string | null {
  const normalizedSlug = providerSlug.toLowerCase();
  const website =
    providerWebsites[normalizedSlug] ?? providerWebsites[normalizedSlug.split(":", 1)[0]];

  if (!website) return null;

  const params = new URLSearchParams({
    client: "SOCIAL",
    type: "FAVICON",
    fallback_opts: "TYPE,SIZE,URL",
    url: website,
    size: "256",
  });

  return `https://t0.gstatic.com/faviconV2?${params.toString()}`;
}
