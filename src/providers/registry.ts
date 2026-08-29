import { defineProviderRegistry } from "./provider.ts";

// Production provider instances are appended here. Tickets 03 and 04 add the initial adapters.
export const providerRegistry = defineProviderRegistry();
