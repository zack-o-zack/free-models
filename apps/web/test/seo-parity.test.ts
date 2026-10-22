import { describe, expect, test } from "bun:test";
import { assertContentParity, readPage } from "../scripts/seo-parity";
import { entityBreadcrumbs } from "../src/lib/catalogue-entities";
import { siteConfig, socialImageAlt } from "../src/lib/config";
import type { ModelSummary } from "../src/lib/model-types";
import { modelBreadcrumbs, modelDescription } from "../src/lib/page-content";
import { catalogueJsonLd, entityJsonLd, modelJsonLd, serializeJsonLd } from "../src/lib/seo";

const model = (id: string, created: number | null): ModelSummary =>
  ({
    id,
    name: id,
    author: "Maker",
    description: "A translation model.",
    created,
    isStealth: id.startsWith("stealth:"),
  }) as ModelSummary;

const models = [model("maker/unknown", null), model("maker/old", 10), model("maker/new", 20)];
const entity = { slug: "host", name: "Host", models };
const schema = entityJsonLd(entity, "providers");
const pageModel = { ...model("maker/seo", null), providers: ["host"] };
const pageModelSchema = modelJsonLd(pageModel);

function fixture() {
  const escapeHtml = Bun.escapeHTML;
  const canonical = schema.url;
  const title = `${entity.name} – Free AI Models & API Provider | ${siteConfig.name}`;
  return `<html lang="en"><head><title>${title}</title>
    <link rel="canonical" href="${canonical}">
    <meta name="description" content="${escapeHtml(schema.description)}">
    ${["og", "twitter"]
      .map(
        (prefix) => `
      <meta property="${prefix}:title" content="${escapeHtml(title)}">
      <meta property="${prefix}:description" content="${escapeHtml(schema.description)}">
      <meta property="${prefix}:image:alt" content="${escapeHtml(socialImageAlt)}">`,
      )
      .join("")}
    <script type="application/ld+json">${serializeJsonLd(schema)}</script></head>
    <body><main><nav aria-label="Breadcrumb">
      <a href="/">Home</a><a href="/providers">Providers</a><span aria-current="page">Host</span>
    </nav><p data-page-title-context>Free AI Models &amp; API Provider</p><h1>Host</h1><p data-page-description>${schema.description}</p>
    <a href="/models/maker/old">Featured old model outside catalogue</a>
    <section id="models">${[models[2], models[1], models[0]].map((item) => `<a href="/models/${item.id}">${item.name}</a>`).join("")}</section>
    </main></body></html>`;
}

async function verify(html: string) {
  assertContentParity(await readPage(html), "providers/host.html");
}

async function verifyModel(html: string) {
  assertContentParity(await readPage(html), "models/maker/seo.html");
}

function modelFixture() {
  const escapeHtml = Bun.escapeHTML;
  const page = pageModelSchema["@graph"][0];
  const canonical = page.url;
  const description = modelDescription(pageModel);
  const title = `${pageModel.name} Free API & Benchmarks | ${siteConfig.name}`;
  return `<html lang="en"><head><title>${title}</title>
    <link rel="canonical" href="${canonical}">
    <meta name="description" content="${escapeHtml(description)}">
    ${["og", "twitter"]
      .map(
        (prefix) => `
      <meta property="${prefix}:title" content="${escapeHtml(title)}">
      <meta property="${prefix}:description" content="${escapeHtml(description)}">
      <meta property="${prefix}:image:alt" content="${escapeHtml(socialImageAlt)}">`,
      )
      .join("")}
    <script type="application/ld+json">${serializeJsonLd(pageModelSchema)}</script></head>
    <body><main><nav aria-label="Breadcrumb">
      <a href="/#models">Models</a><a href="/publishers/maker">Maker</a><a href="/models/maker/seo" aria-current="page">maker/seo</a>
    </nav><section data-page-provider-count="1"><h1>maker/seo</h1><p data-page-description>A translation model.</p></section></main></body></html>`;
}

describe("Rendered SEO parity", () => {
  test("accepts matching content and ignores hero links outside the catalogue", async () => {
    await verify(fixture());
  });

  test("accepts model API title suffixes and provider-aware descriptions", async () => {
    await verifyModel(modelFixture());
  });

  test("rejects a metadata-only benchmark promise", async () => {
    await expect(
      verify(
        fixture().replace(
          'name="description" content="',
          'name="description" content="Compare benchmarks. ',
        ),
      ),
    ).rejects.toThrow("description differs from visible content");
  });

  test("rejects a missing visible breadcrumb in schema", async () => {
    const html = fixture().replace(
      serializeJsonLd(schema),
      serializeJsonLd({
        ...schema,
        breadcrumb: {
          ...schema.breadcrumb,
          itemListElement: schema.breadcrumb.itemListElement.filter(
            (item) => item.name !== "Providers",
          ),
        },
      }),
    );
    await expect(verify(html)).rejects.toThrow("schema breadcrumbs differ");
  });

  test("rejects insertion-order schema even when membership is correct", async () => {
    const html = fixture().replace(
      serializeJsonLd(schema),
      serializeJsonLd({
        ...schema,
        mainEntity: {
          ...schema.mainEntity,
          itemListElement: [...schema.mainEntity.itemListElement]
            .reverse()
            .map((item, index) => ({ ...item, position: index + 1 })),
        },
      }),
    );
    await expect(verify(html)).rejects.toThrow("schema list differs");
  });

  test("rejects stale social image alternative text", async () => {
    await expect(
      verify(fixture().replaceAll(Bun.escapeHTML(socialImageAlt), "Compare benchmarks")),
    ).rejects.toThrow("image description differs");
  });

  test("decodes escaped UI and metadata text once", async () => {
    await verify(
      fixture()
        .replaceAll("Host", "Host &amp; Co")
        .replace(
          /<script[^>]*>[\s\S]*?<\/script>/,
          `<script type="application/ld+json">${serializeJsonLd(schema).replaceAll("Host", "Host & Co")}</script>`,
        ),
    );
  });
});

describe("Shared content rules", () => {
  test("model breadcrumbs include known publishers and omit undisclosed publishers", () => {
    expect(modelBreadcrumbs(models[0]).map((item) => item.name)).toEqual([
      "Models",
      "Maker",
      "maker/unknown",
    ]);
    const stealth = model("stealth:hidden", null);
    expect(modelBreadcrumbs(stealth).map((item) => item.name)).toEqual([
      "Models",
      "stealth:hidden",
    ]);
    expect(modelJsonLd(stealth)["@graph"][1].itemListElement).toHaveLength(2);
    expect(entityBreadcrumbs(entity, "providers").map((item) => item.name)).toEqual([
      "Home",
      "Providers",
      "Host",
    ]);
  });

  test("all catalogue schemas use newest-first order with missing dates last", () => {
    const original = [...models];
    expect(catalogueJsonLd(models).mainEntity.itemListElement.map((item) => item.name)).toEqual([
      "maker/new",
      "maker/old",
      "maker/unknown",
    ]);
    expect(models).toEqual(original);
  });
});
