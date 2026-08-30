import { CloudflareProvider } from "./cloudflare.ts";
import { GeminiProvider } from "./gemini.ts";
import { GroqProvider } from "./groq.ts";
import { MistralProvider } from "./mistral.ts";
import { NvidiaProvider } from "./nvidia.ts";
import { OpenCodeProvider } from "./opencode.ts";
import { OpenRouterProvider } from "./openrouter.ts";
import { defineProviderRegistry } from "./provider.ts";

const openRouterProvider = new OpenRouterProvider();

export const providerRegistry = defineProviderRegistry(
  openRouterProvider,
  new OpenCodeProvider(),
  new GroqProvider(),
  new MistralProvider(),
  new GeminiProvider(),
  new NvidiaProvider(),
  new CloudflareProvider(),
);

export const metadataProvider = openRouterProvider;
