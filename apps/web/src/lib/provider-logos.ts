const providerWebsites: Record<string, string> = {
  baai: "https://bge.baai.ac.cn/",
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
  "ibm-granite": "https://www.ibm.com/granite",
  inclusionai: "https://www.inclusion-ai.org/",
  liquid: "https://www.liquid.ai/",
  meta: "https://ai.meta.com/",
  "meta-llama": "https://www.llama.com/",
  minimax: "https://minimaxi.com/",
  mistral: "https://mistral.ai/",
  mistralai: "https://mistral.ai/",
  moonshotai: "https://www.moonshot.ai/",
  nvidia: "https://www.nvidia.com/en-us/",
  openai: "https://openai.com/",
  openrouter: "https://openrouter.ai/",
  opencode: "https://opencode.ai/",
  poolside: "https://poolside.ai/",
  qwen: "https://qwen.ai/",
  rekaai: "https://www.reka.ai/",
  tencent: "https://www.tencentcloud.com/",
  tokenrouter: "https://www.tokenrouter.com/",
  thinkingmachines: "https://thinkingmachines.ai/",
  xiaomi: "https://www.mi.com/",
  "z-ai": "https://z.ai/",
};

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
