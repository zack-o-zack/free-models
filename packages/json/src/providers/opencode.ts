import { desluggifyModelId } from "../catalogue/canonical.ts";
import { type DiscoveredOffer, type JsonValue, jsonObjectSchema } from "../catalogue/schema.ts";
import { getCachedModelsDevRegistry, type ModelsDevRegistry } from "./models-dev.ts";
import type { ModelProvider } from "./provider.ts";

export const OPENCODE_ZEN_DOCUMENTATION_URL = "https://opencode.ai/docs/zen/";
export const OPENCODE_ZEN_MODELS_URL = "https://opencode.ai/zen/v1/models";

const ENDPOINT_HEADERS = ["Model", "Model ID", "Endpoint", "AI SDK Package"] as const;
const PRICING_HEADERS = ["Model", "Input", "Output", "Cached Read", "Cached Write"] as const;

interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

type FetchSource = (url: string, init?: RequestInit) => Promise<HttpResponse>;

export interface OpenCodeProviderOptions {
  readonly fetch?: FetchSource;
  readonly modelsDev?: ModelsDevRegistry | (() => Promise<ModelsDevRegistry>);
}

interface DocumentedOffer {
  readonly modelName: string;
  readonly modelId: string;
  readonly endpoint: string;
  readonly aiSdkPackage: string;
}

interface ParsedCell {
  readonly kind: "td" | "th";
  text: string;
}

type ParsedRow = ParsedCell[];
type ParsedTable = ParsedRow[];

interface BunHtmlRewriter {
  on(
    selector: string,
    handlers: HTMLRewriterTypes.HTMLRewriterElementContentHandlers,
  ): BunHtmlRewriter;
  transform(input: Response): Response;
}

type BunHtmlRewriterConstructor = new () => BunHtmlRewriter;

export class OpenCodeProvider implements ModelProvider {
  readonly id = "opencode";
  readonly name = "OpenCode";

  readonly #fetch: FetchSource;
  readonly #modelsDev?: ModelsDevRegistry | (() => Promise<ModelsDevRegistry>);

  constructor(options: OpenCodeProviderOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
    this.#modelsDev = options.modelsDev;
  }

  async discover(): Promise<readonly DiscoveredOffer[]> {
    const [documentationResponse, modelsResponse, modelsDev] = await Promise.all([
      this.#request(
        OPENCODE_ZEN_DOCUMENTATION_URL,
        "documentation",
        "text/html,application/xhtml+xml",
      ),
      this.#request(OPENCODE_ZEN_MODELS_URL, "models", "application/json"),
      this.#getModelsDev(),
    ]);
    const [documentation, modelsPayload] = await Promise.all([
      this.#readDocumentation(documentationResponse),
      this.#readModels(modelsResponse),
    ]);

    const documentedOffers = await parseOpenCodeDocumentation(documentation);
    const liveModels = parseOpenCodeModels(modelsPayload);

    const openCodeMeta = modelsDev.get(this.id);
    const env =
      openCodeMeta?.env && openCodeMeta.env.length > 0
        ? [...openCodeMeta.env]
        : ["OPENCODE_API_KEY"];

    return documentedOffers.map((documentedOffer) => {
      const liveModel = liveModels.get(documentedOffer.modelId);
      if (!liveModel) {
        throw new Error(
          `OpenCode Zen free model is missing from the live catalogue: ${documentedOffer.modelId}`,
        );
      }

      const protocol = protocolFromAiSdkPackage(documentedOffer.aiSdkPackage);

      return {
        model_id: documentedOffer.modelId,
        name: documentedOffer.modelName || desluggifyModelId(documentedOffer.modelId),
        connection: {
          ai_sdk_package: documentedOffer.aiSdkPackage,
          auth: { env },
          base_url: "https://opencode.ai/zen/v1",
          endpoint: documentedOffer.endpoint,
          protocol,
        },
      };
    });
  }

  async #getModelsDev(): Promise<ModelsDevRegistry> {
    if (this.#modelsDev) {
      return typeof this.#modelsDev === "function" ? await this.#modelsDev() : this.#modelsDev;
    }
    return getCachedModelsDevRegistry(this.#fetch);
  }

  async #request(url: string, source: string, accept: string): Promise<HttpResponse> {
    let response: HttpResponse;
    try {
      response = await this.#fetch(url, { headers: { Accept: accept } });
    } catch (error) {
      throw new Error(`OpenCode Zen ${source} request failed`, { cause: error });
    }

    if (!response.ok) {
      throw new Error(`OpenCode Zen ${source} request failed with HTTP status ${response.status}`);
    }
    return response;
  }

  async #readDocumentation(response: HttpResponse): Promise<string> {
    try {
      return await response.text();
    } catch (error) {
      throw new Error("OpenCode Zen documentation response could not be read", { cause: error });
    }
  }

  async #readModels(response: HttpResponse): Promise<unknown> {
    try {
      return await response.json();
    } catch (error) {
      throw new Error("OpenCode Zen models response is not valid JSON", { cause: error });
    }
  }
}

export async function parseOpenCodeDocumentation(html: string): Promise<DocumentedOffer[]> {
  const tables = await extractTables(html);
  const endpointRows = findTableRows(tables, ENDPOINT_HEADERS, "endpoint");
  const pricingRows = findTableRows(tables, PRICING_HEADERS, "pricing");

  const endpointsByName = new Map<string, DocumentedOffer>();
  const endpointModelIds = new Set<string>();
  for (const [index, row] of endpointRows.entries()) {
    assertNonemptyCells(row, `OpenCode Zen endpoint row ${index + 1}`);
    const [modelName, modelId, endpoint, aiSdkPackage] = row;
    if (endpointsByName.has(modelName)) {
      throw new Error(`OpenCode Zen endpoint table contains duplicate model name: ${modelName}`);
    }
    if (endpointModelIds.has(modelId)) {
      throw new Error(`OpenCode Zen endpoint table contains duplicate model ID: ${modelId}`);
    }
    endpointsByName.set(modelName, { modelName, modelId, endpoint, aiSdkPackage });
    endpointModelIds.add(modelId);
  }

  const pricingNames = new Set<string>();
  const freeModelNames: string[] = [];
  for (const [index, row] of pricingRows.entries()) {
    assertNonemptyCells(row, `OpenCode Zen pricing row ${index + 1}`);
    const [modelName, input, output, cachedRead, cachedWrite] = row;
    if (pricingNames.has(modelName)) {
      throw new Error(`OpenCode Zen pricing table contains duplicate model name: ${modelName}`);
    }
    pricingNames.add(modelName);

    if (input === "Free" && output === "Free") {
      if (![cachedRead, cachedWrite].every((value) => value === "Free" || value === "-")) {
        throw new Error(`OpenCode Zen free pricing row has a billable cache value: ${modelName}`);
      }
      freeModelNames.push(modelName);
    }
  }

  if (freeModelNames.length === 0) {
    throw new Error("OpenCode Zen pricing table contains no free models");
  }

  return freeModelNames.map((modelName) => {
    const endpoint = endpointsByName.get(modelName);
    if (!endpoint) {
      throw new Error(`OpenCode Zen free pricing row has no endpoint row: ${modelName}`);
    }
    return endpoint;
  });
}

export function parseOpenCodeModels(
  payload: unknown,
): ReadonlyMap<string, Record<string, JsonValue>> {
  const envelope = jsonObjectSchema.safeParse(payload);
  if (!envelope.success) {
    throw new Error("OpenCode Zen models response is malformed: expected a JSON-safe object");
  }
  if (envelope.data.object !== "list") {
    throw new Error('OpenCode Zen models response is malformed: expected object to equal "list"');
  }
  const models = envelope.data.data;
  if (!Array.isArray(models)) {
    throw new Error("OpenCode Zen models response is malformed: expected a data array");
  }

  const modelsById = new Map<string, Record<string, JsonValue>>();
  for (const [index, candidate] of models.entries()) {
    const modelResult = jsonObjectSchema.safeParse(candidate);
    if (!modelResult.success) {
      throw new Error(
        `OpenCode Zen models response is malformed: model at data.${index} is not a JSON-safe object`,
      );
    }
    const modelId = modelResult.data.id;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      throw new Error(
        `OpenCode Zen models response is malformed: model at data.${index} has no valid id`,
      );
    }
    if (modelsById.has(modelId)) {
      throw new Error(`OpenCode Zen models response contains duplicate model ID: ${modelId}`);
    }
    modelsById.set(modelId, modelResult.data);
  }
  return modelsById;
}

async function extractTables(html: string): Promise<ParsedTable[]> {
  const tables: ParsedTable[] = [];
  let currentTable: ParsedTable | undefined;
  let currentRow: ParsedRow | undefined;
  let currentCell: ParsedCell | undefined;

  try {
    const transformed = createHtmlRewriter()
      .on("table", {
        element(element) {
          currentTable = [];
          tables.push(currentTable);
          element.onEndTag(() => {
            currentTable = undefined;
          });
        },
      })
      .on("tr", {
        element(element) {
          if (!currentTable) {
            throw new Error("table row appeared outside a table");
          }
          currentRow = [];
          currentTable.push(currentRow);
          element.onEndTag(() => {
            currentRow = undefined;
          });
        },
      })
      .on("th, td", {
        element(element) {
          if (!currentRow || (element.tagName !== "th" && element.tagName !== "td")) {
            throw new Error("table cell appeared outside a row");
          }
          currentCell = { kind: element.tagName, text: "" };
          currentRow.push(currentCell);
          element.onEndTag(() => {
            currentCell = undefined;
          });
        },
        text(chunk) {
          if (currentCell) {
            currentCell.text += chunk.text;
          }
        },
      })
      .transform(new Response(html));
    await transformed.text();
  } catch (error) {
    throw new Error("OpenCode Zen documentation HTML is malformed", { cause: error });
  }

  return tables;
}

function createHtmlRewriter(): BunHtmlRewriter {
  const htmlRewriterConstructor: unknown = Reflect.get(globalThis, "HTMLRewriter");
  if (typeof htmlRewriterConstructor !== "function") {
    throw new Error("Bun HTMLRewriter is unavailable");
  }
  return new (htmlRewriterConstructor as BunHtmlRewriterConstructor)();
}

function findTableRows(
  tables: ParsedTable[],
  expectedHeaders: readonly string[],
  tableName: string,
): string[][] {
  const matches = tables.filter((table) => {
    const header = table[0];
    if (!header) {
      return false;
    }
    return (
      header.every((cell) => cell.kind === "th") &&
      equalStrings(
        header.map((cell) => normalizeCellText(cell.text)),
        expectedHeaders,
      )
    );
  });
  if (matches.length !== 1) {
    throw new Error(
      `OpenCode Zen documentation must contain exactly one ${tableName} table with columns: ${expectedHeaders.join(", ")}`,
    );
  }

  const matchedTable = matches[0];
  if (!matchedTable) {
    throw new Error(`OpenCode Zen ${tableName} table could not be read`);
  }
  const rows = matchedTable.slice(1);
  if (rows.length === 0) {
    throw new Error(`OpenCode Zen ${tableName} table contains no rows`);
  }
  return rows.map((row, index) => {
    if (row.length !== expectedHeaders.length || row.some((cell) => cell.kind !== "td")) {
      throw new Error(
        `OpenCode Zen ${tableName} table row ${index + 1} must contain exactly ${expectedHeaders.length} cells`,
      );
    }
    return row.map((cell) => normalizeCellText(cell.text));
  });
}

function assertNonemptyCells(
  row: string[],
  description: string,
): asserts row is [string, string, string, string, ...string[]] {
  if (row.some((value) => value.length === 0)) {
    throw new Error(`${description} contains an empty cell`);
  }
}

function normalizeCellText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function equalStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

const AI_SDK_PACKAGE_PROTOCOLS: Readonly<Record<string, string>> = {
  "@ai-sdk/openai": "openai",
  "@ai-sdk/openai-compatible": "openai",
  "@ai-sdk/anthropic": "anthropic",
  "@ai-sdk/google": "google",
};

export function protocolFromAiSdkPackage(aiSdkPackage: string): string {
  const normalized = aiSdkPackage.trim().toLowerCase();
  const protocol = AI_SDK_PACKAGE_PROTOCOLS[normalized];
  if (!protocol) {
    throw new Error(`OpenCode Zen encountered unsupported AI SDK package: ${aiSdkPackage}`);
  }
  return protocol;
}
