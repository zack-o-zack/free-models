import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve(import.meta.dir, "../.next/server/app");
const files = (await readdir(output, { recursive: true })).filter(
  (file) => file === "index.html" || (file.startsWith("models/") && file.endsWith(".html")),
);
assert(files.length > 1, "Build the web app before running the SEO audit.");

const sitemap = await readFile(resolve(output, "sitemap.xml.body"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.equal(new Set(urls).size, urls.length, "Sitemap contains duplicate URLs");
assert.equal(urls.length, files.length, "Sitemap must cover every public page");
const titles = new Set<string>();
const descriptions = new Set<string>();
const canonicals = new Set<string>();
let modelLinks = new Set<string>();
let origin = "";

for (const file of files) {
  const html = await readFile(resolve(output, file), "utf8");
  let title = "";
  let h1Count = 0;
  let language = "";
  let faqAnswer = "";
  let json = "";
  const schemas: Record<string, unknown>[] = [];
  const canonical: string[] = [];
  const meta = new Map<string, string>();
  const links: string[] = [];
  const ids = new Set<string>();
  const rewriter = new HTMLRewriter()
    .on("html", {
      element: (element) => {
        language = element.getAttribute("lang") ?? "";
      },
    })
    .on("title", {
      text: (chunk) => {
        title += chunk.text;
      },
    })
    .on("h1", {
      element: () => {
        h1Count++;
      },
    })
    .on("[id]", {
      element: (element) => {
        ids.add(element.getAttribute("id") ?? "");
      },
    })
    .on("meta", {
      element: (element) => {
        meta.set(
          element.getAttribute("name") ?? element.getAttribute("property") ?? "",
          element.getAttribute("content") ?? "",
        );
      },
    })
    .on('link[rel="canonical"]', {
      element: (element) => {
        canonical.push(element.getAttribute("href") ?? "");
      },
    })
    .on("a[href]", {
      element: (element) => {
        links.push(element.getAttribute("href") ?? "");
      },
    })
    .on('#faq [data-slot="accordion-content"]', {
      text: (chunk) => {
        faqAnswer += chunk.text;
      },
    })
    .on('script[type="application/ld+json"]', {
      element: (element) => {
        json = "";
        element.onEndTag(() => {
          schemas.push(JSON.parse(json));
        });
      },
      text: (chunk) => {
        json += chunk.text;
      },
    });
  await rewriter.transform(new Response(html)).text();

  assert.equal(language, "en", `${file}: missing document language`);
  assert.equal(h1Count, 1, `${file}: expected one main heading`);
  assert(title && !titles.has(title), `${file}: missing or duplicate title`);
  titles.add(title);
  const description = meta.get("description") ?? "";
  assert(description && description.length <= 160, `${file}: missing or oversized description`);
  assert(!descriptions.has(description), `${file}: duplicate description`);
  descriptions.add(description);
  assert.equal(canonical.length, 1, `${file}: expected one canonical`);
  assert(urls.includes(canonical[0]), `${file}: canonical missing from sitemap`);
  assert(!canonicals.has(canonical[0]), `${file}: duplicate canonical`);
  canonicals.add(canonical[0]);
  origin ||= new URL(canonical[0]).origin;
  assert.equal(new URL(canonical[0]).origin, origin, `${file}: inconsistent origin`);
  assert.equal(meta.get("og:url"), canonical[0], `${file}: inconsistent social URL`);
  for (const key of [
    "og:title",
    "og:description",
    "og:image",
    "og:image:alt",
    "twitter:title",
    "twitter:description",
    "twitter:image",
  ]) {
    assert(meta.get(key), `${file}: missing ${key}`);
  }
  assert.equal(
    meta.get("twitter:card"),
    "summary_large_image",
    `${file}: missing large social card`,
  );
  assert.equal(meta.get("og:description"), description, `${file}: inconsistent social description`);
  assert.equal(new URL(meta.get("og:image") ?? "").origin, origin, `${file}: wrong image origin`);
  assert(!meta.get("robots")?.includes("noindex"), `${file}: production page blocks indexing`);
  for (const href of links) {
    if (href.startsWith("#") && href.length > 1) {
      assert(ids.has(decodeURIComponent(href.slice(1))), `${file}: broken anchor ${href}`);
    }
    if (href.startsWith("/models/")) {
      assert(urls.includes(new URL(href, origin).href), `${file}: broken model link ${href}`);
    }
  }
  if (file === "index.html") {
    modelLinks = new Set(links.filter((href) => href.startsWith("/models/")));
    assert(
      schemas.some((schema) => schema["@type"] === "WebSite"),
      "Missing site identity",
    );
    const catalogue = schemas.find((schema) => schema["@type"] === "CollectionPage");
    assert(catalogue, "Missing catalogue schema");
    const list = catalogue.mainEntity as { itemListElement: { url: string }[] };
    assert.deepEqual(
      list.itemListElement.map((item) => item.url),
      [...modelLinks].map((href) => new URL(href, origin).href),
      "Catalogue schema must match the visible model order",
    );
  } else {
    assert(
      faqAnswer.includes("API requests go directly to the provider"),
      `${file}: FAQ answers missing from HTML`,
    );
    const graph = schemas.flatMap(
      (schema) => (schema["@graph"] ?? []) as Record<string, unknown>[],
    );
    assert(
      graph.some((item) => item["@type"] === "BreadcrumbList"),
      `${file}: missing breadcrumbs`,
    );
    assert(
      graph.some((item) => item["@type"] === "WebPage" && item.url === canonical[0]),
      `${file}: missing page schema`,
    );
  }
}
assert.equal(
  modelLinks.size,
  files.length - 1,
  "Homepage must link to every model without JavaScript",
);
const robots = await readFile(resolve(output, "robots.txt.body"), "utf8");
assert(robots.includes("Allow: /"), "Production robots must allow crawling");
assert(
  robots.includes(`Sitemap: ${origin}/sitemap.xml`),
  "Robots must advertise the canonical sitemap",
);
assert(!robots.includes("Disallow: /"), "Production robots blocks crawling");
console.log(
  `SEO audit passed: ${files.length} pages, ${modelLinks.size} model links, unique metadata, social cards, JSON-LD, FAQ HTML, anchors, sitemap, and robots.`,
);
