import { OpenCodeProvider } from "./opencode.ts";
import { OpenRouterProvider } from "./openrouter.ts";
import { defineProviderRegistry } from "./provider.ts";

export const providerRegistry = defineProviderRegistry(
  new OpenRouterProvider(),
  new OpenCodeProvider(),
);
