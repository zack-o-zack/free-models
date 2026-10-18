import { expect, test } from "bun:test";
import { toCatalogueModel } from "../src/lib/catalogue-model";
import { getProviderFundingLabel } from "../src/lib/model-funding";
import type { ModelSummary } from "../src/lib/model-types";

test("catalogue payload preserves mixed funding labels without shipping API setup details", () => {
  const model: ModelSummary = {
    id: "maker/model",
    name: "Model",
    author: "Maker",
    contextLength: 1000,
    created: 1,
    inputModalities: ["text"],
    outputModalities: ["text"],
    providers: ["host"],
    providerNames: {},
    providerDocs: {},
    supportsReasoning: false,
    supportsTools: true,
    isStealth: false,
    intelligenceScore: null,
    codingScore: null,
    agenticScore: null,
    designArena: [],
    description: "Searchable description",
    supportedParameters: ["tools"],
    connections: (["no_credits", "monthly_credits", "no_credits"] as const).map((funding) => ({
      provider: "host",
      funding,
      modelId: "upstream-id",
      connection: { base_url: "https://host.test/v1", auth: { env: ["HOST_API_KEY"] } },
      limits: ["Detailed usage terms"],
    })),
  };
  const catalogue = toCatalogueModel(model);
  expect(getProviderFundingLabel(catalogue.connections, "host")).toBe(
    getProviderFundingLabel(model.connections, "host"),
  );
  expect(catalogue.description).toBe(model.description);
  expect(JSON.stringify(catalogue)).not.toContain("HOST_API_KEY");
  expect(JSON.stringify(catalogue)).not.toContain("Detailed usage terms");
  expect(model.connections[0].connection).toBeDefined();
  expect(model.supportedParameters).toEqual(["tools"]);
});
