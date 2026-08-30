import { OpenCodeProvider } from "./opencode.ts";
import { OpenRouterProvider } from "./openrouter.ts";
import { defineProviderRegistry } from "./provider.ts";

const openRouterProvider = new OpenRouterProvider();

export const providerRegistry = defineProviderRegistry(openRouterProvider, new OpenCodeProvider());

export const metadataProvider = openRouterProvider;
