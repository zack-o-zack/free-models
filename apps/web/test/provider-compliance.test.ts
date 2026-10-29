import { describe, expect, test } from "bun:test";
import {
  countryCodeToFlag,
  edgeGpuRegionLabel,
  getCountryName,
  getModelCountries,
  getModelProviderCompliance,
  getProviderCompliance,
  isConditionalCompliance,
  modelHasZdr,
} from "@/lib/provider-compliance";

describe("model.provider compliance resolution", () => {
  test("resolves default provider-level compliance", () => {
    const mistral = getProviderCompliance("mistral");
    expect(mistral).toBeDefined();
    expect(mistral?.zdr).toBe(false);
    expect(mistral?.noTraining).toBe(true);
    expect(mistral?.dataRetention).toBe(true);
    expect(mistral?.countries).toContain("FR");
    expect(mistral?.countries).toContain("EU");

    const groq = getProviderCompliance("groq");
    expect(groq).toBeDefined();
    expect(groq?.zdr).toBe(false);
    expect(groq?.noTraining).toBe(true);
    expect(groq?.dataRetention).toBe(true);
    expect(groq?.countries).toEqual(["US"]);

    const cohere = getProviderCompliance("cohere");
    expect(cohere).toBeDefined();
    expect(cohere?.zdr).toBe(false);
    expect(cohere?.noTraining).toBe(false);
    expect(cohere?.dataRetention).toBe(true);
    expect(cohere?.countries).toEqual(["US"]);

    const onomeo = getProviderCompliance("onomeo");
    expect(onomeo).toBeDefined();
    expect(onomeo?.zdr).toBe(false);
    expect(onomeo?.noTraining).toBe(false);
    expect(onomeo?.dataRetention).toBe(true);
    expect(onomeo?.countries).toEqual([]);
    expect(onomeo?.conditional).toBe(true);

    const kilo = getProviderCompliance("kilo");
    expect(kilo).toBeDefined();
    expect(kilo?.zdr).toBe(false);
    expect(kilo?.noTraining).toBe(false);
    expect(kilo?.dataRetention).toBe(true);
    expect(kilo?.countries).toEqual([]);
    expect(kilo?.conditional).toBe(true);

    const requesty = getProviderCompliance("requesty");
    expect(requesty).toBeDefined();
    expect(requesty?.zdr).toBe(false);
    expect(requesty?.noTraining).toBe(false);
    expect(requesty?.dataRetention).toBe(true);
    expect(requesty?.countries).toEqual([]);
    expect(requesty?.conditional).toBeUndefined();

    const routeway = getProviderCompliance("routeway");
    expect(routeway).toBeDefined();
    expect(routeway?.zdr).toBe(false);
    expect(routeway?.noTraining).toBe(false);
    expect(routeway?.dataRetention).toBe(true);
    expect(routeway?.countries).toEqual([]);
    expect(routeway?.subprocessors).toEqual(["routeway", "aws", "google"]);
    expect(routeway?.conditional).toBe(true);

    const cloudflare = getProviderCompliance("cloudflare");
    expect(cloudflare).toBeDefined();
    expect(cloudflare?.zdr).toBe(true);
    expect(cloudflare?.noTraining).toBe(true);
    expect(cloudflare?.edge).toBe(true);
    expect(cloudflare?.description).toContain("edge");
  });

  test("resolves model.provider specific differentiation under the same provider", () => {
    // OpenCode: Free preview models retain data and host in US
    const previewModel = getModelProviderCompliance("recursive/flint-v1.0", "opencode");
    expect(previewModel).toBeDefined();
    expect(previewModel?.zdr).toBe(false);
    expect(previewModel?.dataRetention).toBe(true);
    expect(previewModel?.noTraining).toBe(false);
    expect(previewModel?.countries).toEqual(["US"]);

    // OpenCode: NVIDIA trial proxy models retain data and do NOT have EU data residency
    const nemotronModel = getModelProviderCompliance("nvidia/nemotron-3.5-super-vl", "opencode");
    expect(nemotronModel).toBeDefined();
    expect(nemotronModel?.zdr).toBe(false);
    expect(nemotronModel?.dataRetention).toBe(true);
    expect(nemotronModel?.noTraining).toBe(false);
    expect(nemotronModel?.countries).toEqual(["US"]);
    expect(nemotronModel?.countries).not.toContain("EU");

    const nemotronOffer = getModelProviderCompliance("nemotron-3.5-super-vl-free", "opencode");
    expect(nemotronOffer).toBeDefined();
    expect(nemotronOffer?.zdr).toBe(false);
    expect(nemotronOffer?.dataRetention).toBe(true);
    expect(nemotronOffer?.noTraining).toBe(false);
    expect(nemotronOffer?.countries).toEqual(["US"]);
    expect(nemotronOffer?.countries).not.toContain("EU");

    // OpenCode: Standard free models guarantee ZDR and US & EU hosting
    const standardModel = getModelProviderCompliance("glm-5.3-flash-free", "opencode");
    expect(standardModel).toBeDefined();
    expect(standardModel?.zdr).toBe(true);
    expect(standardModel?.dataRetention).toBe(false);
    expect(standardModel?.noTraining).toBe(true);
    expect(standardModel?.countries).toContain("US");
    expect(standardModel?.countries).toContain("EU");
  });

  test("marks Mistral Labs models as eligible for training", () => {
    const labsModel = getModelProviderCompliance("labs-leanstral-1-5", "mistral");

    expect(labsModel).toBeDefined();
    expect(labsModel?.zdr).toBe(false);
    expect(labsModel?.noTraining).toBe(false);
    expect(labsModel?.dataRetention).toBe(true);
    expect(labsModel?.countries).toEqual(["FR", "EU"]);
    expect(labsModel?.description).toContain("Labs models");
  });

  test("prioritizes connection compliance from the catalogue payload", () => {
    const customConnectionCompliance = {
      zdr: true,
      noTraining: true,
      dataRetention: false,
      countries: ["DE", "EU"],
      description: "Custom enterprise EU endpoint",
      edge: true,
    };

    const resolved = getModelProviderCompliance(
      "custom/model",
      "gemini",
      customConnectionCompliance,
    );
    expect(resolved).toEqual(customConnectionCompliance);
    expect(resolved?.edge).toBe(true);
  });

  test("distinguishes conditional privacy from verified ZDR", () => {
    expect(
      isConditionalCompliance({
        zdr: false,
        noTraining: false,
        dataRetention: true,
        countries: [],
        conditional: true,
      }),
    ).toBe(true);
    expect(
      isConditionalCompliance({
        zdr: true,
        noTraining: true,
        dataRetention: false,
        countries: [],
        conditional: true,
      }),
    ).toBe(false);
  });

  test("converts ISO codes to flag emojis correctly", () => {
    expect(countryCodeToFlag("US")).toBe("🇺🇸");
    expect(countryCodeToFlag("EU")).toBe("🇪🇺");
    expect(countryCodeToFlag("FR")).toBe("🇫🇷");
    expect(countryCodeToFlag("CA")).toBe("🇨🇦");
    expect(countryCodeToFlag("CN")).toBe("🇨🇳");
  });

  test("resolves friendly country names", () => {
    expect(getCountryName("US")).toBe("United States");
    expect(getCountryName("EU")).toBe("European Union");
    expect(getCountryName("FR")).toBe("France");
  });

  test("labels edge GPU hosting per region", () => {
    expect(edgeGpuRegionLabel("US")).toBe("Edge GPUs in United States (US)");
    expect(edgeGpuRegionLabel("eu")).toBe("Edge GPUs in European Union (EU)");
  });

  test("evaluates modelHasZdr across connections and with provider scoping", () => {
    const model = {
      id: "deepseek/deepseek-chat",
      connections: [
        {
          provider: "groq",
          compliance: { zdr: false, noTraining: true, dataRetention: true, countries: ["US"] },
        },
        {
          provider: "cloudflare",
          compliance: {
            zdr: true,
            noTraining: true,
            dataRetention: false,
            countries: ["US", "EU"],
          },
        },
      ],
    };

    expect(modelHasZdr(model)).toBe(true);
    expect(modelHasZdr(model, ["groq"])).toBe(false);
    expect(modelHasZdr(model, ["cloudflare"])).toBe(true);
    expect(modelHasZdr(model, ["novita"])).toBe(false);
  });

  test("evaluates getModelCountries across connections and with provider scoping", () => {
    const model = {
      id: "mistral/mistral-large",
      connections: [
        {
          provider: "mistral",
          compliance: {
            zdr: false,
            noTraining: true,
            dataRetention: true,
            countries: ["FR", "EU"],
          },
        },
        {
          provider: "openrouter",
          compliance: { zdr: false, noTraining: false, dataRetention: true, countries: ["US"] },
        },
      ],
    };

    expect(getModelCountries(model)).toEqual(["FR", "EU", "US"]);
    expect(getModelCountries(model, ["mistral"])).toEqual(["FR", "EU"]);
    expect(getModelCountries(model, ["openrouter"])).toEqual(["US"]);
  });
});
