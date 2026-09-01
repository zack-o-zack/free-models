export const MODELS_DEV_API_URL = "https://models.dev/api.json";

export interface ModelsDevProvider {
  readonly id: string;
  readonly env?: readonly string[];
  readonly api?: string;
  readonly npm?: string;
  readonly name?: string;
}

export type ModelsDevRegistry = ReadonlyMap<string, ModelsDevProvider>;

interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

type FetchSource = (url: string, init?: RequestInit) => Promise<HttpResponse>;

let cachedRegistryPromise: Promise<ModelsDevRegistry> | undefined;

export async function fetchModelsDevRegistry(
  fetchSource: FetchSource = fetch,
): Promise<ModelsDevRegistry> {
  let response: HttpResponse;
  try {
    response = await fetchSource(MODELS_DEV_API_URL, {
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    throw new Error("models.dev request failed", { cause: error });
  }

  if (!response.ok) {
    throw new Error(`models.dev request failed with HTTP status ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("models.dev response is not valid JSON", { cause: error });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("models.dev response is malformed: expected a JSON object");
  }

  const registry = new Map<string, ModelsDevProvider>();
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const entry = value as Record<string, unknown>;
      const env = Array.isArray(entry.env)
        ? entry.env.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0,
          )
        : undefined;

      const api = typeof entry.api === "string" ? entry.api : undefined;
      const npm = typeof entry.npm === "string" ? entry.npm : undefined;
      const name = typeof entry.name === "string" ? entry.name : undefined;

      registry.set(key, {
        id: typeof entry.id === "string" ? entry.id : key,
        ...(env ? { env } : {}),
        ...(api !== undefined ? { api } : {}),
        ...(npm !== undefined ? { npm } : {}),
        ...(name !== undefined ? { name } : {}),
      });
    }
  }

  return registry;
}

export function getCachedModelsDevRegistry(
  fetchSource: FetchSource = fetch,
): Promise<ModelsDevRegistry> {
  if (!cachedRegistryPromise) {
    cachedRegistryPromise = fetchModelsDevRegistry(fetchSource);
  }
  return cachedRegistryPromise;
}

export function resetCachedModelsDevRegistry(): void {
  cachedRegistryPromise = undefined;
}
