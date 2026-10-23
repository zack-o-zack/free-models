import { AnyApiProvider } from "./anyapi.ts";
import { BazaarLinkProvider } from "./bazaarlink.ts";
import { CloudflareProvider } from "./cloudflare.ts";
import { CohereProvider } from "./cohere.ts";
import { CommandCodeProvider } from "./commandcode.ts";
import { GeminiProvider } from "./gemini.ts";
import { GroqProvider } from "./groq.ts";
import { KiloProvider } from "./kilo.ts";
import { LLM7Provider } from "./llm7.ts";
import { MistralProvider } from "./mistral.ts";
import { NousProvider } from "./nous.ts";
import { NovitaProvider } from "./novita.ts";
import { NvidiaProvider } from "./nvidia.ts";
import { OnomeoProvider } from "./onomeo.ts";
import { OpenCodeProvider } from "./opencode.ts";
import { OpenRouterProvider } from "./openrouter.ts";
import { defineProviderRegistry } from "./provider.ts";
import { RequestyProvider } from "./requesty.ts";
import { RoutewayProvider } from "./routeway.ts";
import { TokenRouterProvider } from "./tokenrouter.ts";
import { VercelProvider } from "./vercel.ts";
import { ZaiProvider } from "./zai.ts";

const openRouterProvider = new OpenRouterProvider();

export const providerRegistry = defineProviderRegistry(
  openRouterProvider,
  new OpenCodeProvider(),
  new GroqProvider(),
  new MistralProvider(),
  new GeminiProvider(),
  new NvidiaProvider(),
  new CloudflareProvider(),
  new CohereProvider(),
  new TokenRouterProvider(),
  new RequestyProvider(),
  new RoutewayProvider(),
  new BazaarLinkProvider(),
  new KiloProvider(),
  new LLM7Provider(),
  new ZaiProvider(),
  new AnyApiProvider(),
  new NovitaProvider(),
  new VercelProvider(),
  new NousProvider(),
  new OnomeoProvider(),
  new CommandCodeProvider(),
);

export const metadataProvider = openRouterProvider;
