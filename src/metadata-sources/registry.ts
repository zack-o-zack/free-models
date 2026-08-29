import { defineMetadataSourceRegistry } from "./metadata-source.ts";
import { OpenRouterMetadataSource } from "./openrouter.ts";

export const metadataSourceRegistry = defineMetadataSourceRegistry(new OpenRouterMetadataSource());
