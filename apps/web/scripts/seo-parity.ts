import assert from "node:assert/strict";
import { siteConfig, socialImageAlt } from "../src/lib/config";
import { contentSnippet, modelDescription } from "../src/lib/page-content";

interface SchemaItem {
  position: number;
  name: string;
  url?: string;
  item?: string;
}
interface Schema {
  "@type": string;
  "@graph"?: Schema[];
  name?: string;
  description?: string;
  url?: string;
  about?: { name: string; description: string };
  breadcrumb?: Schema;
  mainEntity?: { numberOfItems: number; itemListElement: SchemaItem[] };
  itemListElement?: SchemaItem[];
}

// HTMLRewriter exposes encoded source text; decode once, after collecting text chunks.
function decode(text: string): string {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) {
      return String.fromCodePoint(
        entity[1].toLowerCase() === "x"
          ? Number.parseInt(entity.slice(2), 16)
          : Number(entity.slice(1)),
      );
    }
    return entities[entity] ?? match;
  });
}
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

export async function readPage(html: string) {
  const page = {
    title: "",
    heading: "",
    subtitle: "",
    titleContext: "",
    description: "",
    language: "",
    faq: "",
    h1Count: 0,
    descriptionCount: 0,
    meta: new Map<string, string>(),
    canonicals: [] as string[],
    links: [] as string[],
    ids: new Set<string>(),
    schemas: [] as Schema[],
    breadcrumbs: [] as { name: string; href: string }[],
    models: [] as { name: string; href: string }[],
  };
  let json = "";
  const reader = new HTMLRewriter()
    .on("html", {
      element(e) {
        page.language = e.getAttribute("lang") ?? "";
      },
    })
    .on("title", {
      text(c) {
        page.title += c.text;
      },
    })
    .on("h1", {
      element() {
        page.h1Count++;
      },
      text(c) {
        page.heading += c.text;
      },
    })
    .on("h1 br", {
      element() {
        page.heading += " ";
      },
    })
    .on("[data-page-title-context]", {
      text(c) {
        page.titleContext += c.text;
      },
    })
    .on("[data-page-subtitle]", {
      text(c) {
        page.subtitle += c.text;
      },
    })
    .on("[data-page-description]", {
      element() {
        page.descriptionCount++;
      },
      text(c) {
        page.description += c.text;
      },
    })
    .on("[id]", {
      element(e) {
        page.ids.add(decode(e.getAttribute("id") ?? ""));
      },
    })
    .on("meta", {
      element(e) {
        page.meta.set(
          e.getAttribute("name") ?? e.getAttribute("property") ?? "",
          decode(e.getAttribute("content") ?? ""),
        );
      },
    })
    .on('link[rel="canonical"]', {
      element(e) {
        page.canonicals.push(decode(e.getAttribute("href") ?? ""));
      },
    })
    .on("a[href]", {
      element(e) {
        page.links.push(decode(e.getAttribute("href") ?? ""));
      },
    })
    .on('nav[aria-label="Breadcrumb"] a, nav[aria-label="Breadcrumb"] [aria-current="page"]', {
      element(e) {
        page.breadcrumbs.push({ name: "", href: decode(e.getAttribute("href") ?? "") });
      },
      text(c) {
        page.breadcrumbs[page.breadcrumbs.length - 1].name += c.text;
      },
    })
    .on('#models a[href^="/models/"]', {
      element(e) {
        page.models.push({ name: "", href: decode(e.getAttribute("href") ?? "") });
      },
      text(c) {
        page.models[page.models.length - 1].name += c.text;
      },
    })
    .on('#faq [data-slot="accordion-content"]', {
      text(c) {
        page.faq += c.text;
      },
    })
    .on('script[type="application/ld+json"]', {
      element(e) {
        json = "";
        e.onEndTag(() => {
          page.schemas.push(JSON.parse(json));
        });
      },
      text(c) {
        json += c.text;
      },
    });
  await reader.transform(new Response(html)).text();
  for (const key of [
    "title",
    "heading",
    "subtitle",
    "titleContext",
    "description",
    "faq",
  ] as const) {
    page[key] = normalize(decode(page[key]));
  }
  for (const item of [...page.models, ...page.breadcrumbs])
    item.name = normalize(decode(item.name));
  page.schemas = page.schemas.flatMap((schema) => schema["@graph"] ?? [schema]);
  return page;
}

export function assertContentParity(page: Awaited<ReturnType<typeof readPage>>, file: string) {
  const check = (value: unknown, message: string) => assert(value, `${file}: ${message}`);
  const equal = (actual: unknown, expected: unknown, message: string) =>
    assert.deepEqual(actual, expected, `${file}: ${message}`);
  const isModel = file.startsWith("models/");
  const isDirectory = file === "providers.html" || file === "publishers.html";
  const canonical = page.canonicals[0];
  equal(page.h1Count, 1, "expected one visible main heading");
  equal(page.descriptionCount, 1, "expected one visible page description");
  check(page.heading && page.description, "missing visible title or description");
  const heading =
    [page.heading, page.subtitle].filter(Boolean).join(" ") +
    (page.titleContext ? ` — ${page.titleContext}` : "");
  equal(page.title, `${heading} | ${siteConfig.name}`, "title differs from visible heading");
  const description = isModel
    ? modelDescription({ name: page.heading, description: page.description })
    : contentSnippet(page.description);
  equal(page.meta.get("description"), description, "description differs from visible content");
  for (const prefix of ["og", "twitter"]) {
    equal(
      page.meta.get(`${prefix}:title`),
      page.title,
      `${prefix} title differs from visible heading`,
    );
    equal(
      page.meta.get(`${prefix}:description`),
      description,
      `${prefix} description differs from visible content`,
    );
    equal(
      page.meta.get(`${prefix}:image:alt`),
      socialImageAlt,
      `${prefix} image description differs from image copy`,
    );
  }
  if (file === "_not-found.html") {
    equal(page.canonicals.length, 0, "404 must not advertise a canonical public page");
    check(page.meta.get("robots")?.includes("noindex"), "404 must not be indexable");
    equal(page.schemas.length, 0, "404 must not describe a catalogue page");
    return;
  }
  const schema = page.schemas.find(
    (item) => item["@type"] === (isModel ? "WebPage" : "CollectionPage"),
  );
  if (!isDirectory) {
    check(schema, "missing page schema");
    equal(schema?.name, heading, "schema name differs from visible heading");
    equal(schema?.description, description, "schema description differs from visible content");
    equal(schema?.url, canonical, "schema URL differs from canonical");
  }
  if (isModel) {
    equal(schema?.about?.name, page.heading, "model schema name differs from UI");
    equal(
      normalize(schema?.about?.description ?? ""),
      page.description,
      "model schema description differs from UI",
    );
  }
  if (page.breadcrumbs.length > 0 || isModel || (!isDirectory && file !== "index.html")) {
    const breadcrumb =
      page.schemas.find((item) => item["@type"] === "BreadcrumbList") ?? schema?.breadcrumb;
    equal(
      breadcrumb?.itemListElement,
      page.breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item:
          item.href === "/"
            ? new URL(canonical).origin
            : item.href
              ? new URL(item.href, canonical).href
              : canonical,
      })),
      "schema breadcrumbs differ from visible trail",
    );
  }
  if (!isModel && !isDirectory) {
    check(page.models.length > 0, "missing visible catalogue");
    equal(
      schema?.mainEntity?.numberOfItems,
      page.models.length,
      "schema count differs from visible list",
    );
    equal(
      schema?.mainEntity?.itemListElement,
      page.models.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: new URL(item.href, canonical).href,
      })),
      "schema list differs from visible names, order, or URLs",
    );
  }
  if (file === "index.html") {
    const website = page.schemas.find((item) => item["@type"] === "WebSite");
    equal(website?.name, siteConfig.name, "missing site identity");
    equal(website?.description, page.description, "site description differs from visible content");
  }
}
