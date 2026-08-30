export interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type FetchSource = (url: string, init?: RequestInit) => Promise<HttpResponse>;

interface BunHtmlRewriter {
  on(
    selector: string,
    handlers: HTMLRewriterTypes.HTMLRewriterElementContentHandlers,
  ): BunHtmlRewriter;
  transform(input: Response): Response;
}

type BunHtmlRewriterConstructor = new () => BunHtmlRewriter;

export async function fetchText(
  fetchSource: FetchSource,
  url: string,
  sourceName: string,
  init: RequestInit = {},
): Promise<string> {
  let response: HttpResponse;
  try {
    response = await fetchSource(url, init);
  } catch (error) {
    throw new Error(`${sourceName} request failed`, { cause: error });
  }
  if (!response.ok) {
    throw new Error(`${sourceName} request failed with HTTP status ${response.status}`);
  }
  try {
    return await response.text();
  } catch (error) {
    throw new Error(`${sourceName} response could not be read`, { cause: error });
  }
}

export async function fetchJson(
  fetchSource: FetchSource,
  url: string,
  sourceName: string,
  init: RequestInit = {},
): Promise<unknown> {
  let response: HttpResponse;
  try {
    response = await fetchSource(url, init);
  } catch (error) {
    throw new Error(`${sourceName} request failed`, { cause: error });
  }
  if (!response.ok) {
    throw new Error(`${sourceName} request failed with HTTP status ${response.status}`);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${sourceName} response is not valid JSON`, { cause: error });
  }
}

export function createHtmlRewriter(): BunHtmlRewriter {
  const htmlRewriterConstructor: unknown = Reflect.get(globalThis, "HTMLRewriter");
  if (typeof htmlRewriterConstructor !== "function") {
    throw new Error("Bun HTMLRewriter is unavailable");
  }
  return new (htmlRewriterConstructor as BunHtmlRewriterConstructor)();
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
