import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertContentParity, readPage } from "./seo-parity";

const output = resolve(import.meta.dir, "../.next/server/app");
const files = (await readdir(output, { recursive: true })).filter(
  (file) => file === "index.html" || /^(models|providers|publishers)(\/.*)?\.html$/.test(file),
);
assert(files.length > 1, "Build the web app before running the SEO audit.");
const sitemap = await readFile(resolve(output, "sitemap.xml.body"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.equal(new Set(urls).size, urls.length, "Sitemap contains duplicate URLs");
assert.equal(urls.length, files.length, "Sitemap must cover every public page");
const titles = new Map<string, string[]>();
const pages = new Map<string, Awaited<ReturnType<typeof readPage>>>();
let modelLinks = new Set<string>();
let origin = "";

for (const file of files) {
  const page = await readPage(await readFile(resolve(output, file), "utf8"));
  assert.equal(page.language, "en", `${file}: missing document language`);
  assert.equal(page.canonicals.length, 1, `${file}: expected one canonical`);
  const canonical = page.canonicals[0];
  assert(urls.includes(canonical), `${file}: canonical missing from sitemap`);
  assert(!pages.has(canonical), `${file}: duplicate canonical`);
  pages.set(canonical, page);
  origin ||= new URL(canonical).origin;
  assert.equal(new URL(canonical).origin, origin, `${file}: inconsistent origin`);
  assertContentParity(page, file);
  const titlePages = titles.get(page.title) ?? [];
  titlePages.push(file);
  titles.set(page.title, titlePages);
  const description = page.meta.get("description") ?? "";
  assert(description && description.length <= 160, `${file}: missing or oversized description`);

  assert.equal(page.meta.get("og:url"), canonical, `${file}: inconsistent social URL`);
  for (const prefix of ["og", "twitter"]) {
    const image = page.meta.get(`${prefix}:image`);
    assert(image, `${file}: missing ${prefix} image`);
    assert.equal(new URL(image).origin, origin, `${file}: wrong image origin`);
  }
  assert.equal(
    page.meta.get("twitter:card"),
    "summary_large_image",
    `${file}: missing large social card`,
  );
  assert(!page.meta.get("robots")?.includes("noindex"), `${file}: production page blocks indexing`);
  if (file === "index.html") modelLinks = new Set(page.models.map((item) => item.href));
  if (file.startsWith("models/")) {
    assert(
      page.faq.includes("API requests go directly to the provider"),
      `${file}: FAQ answers missing from HTML`,
    );
  }
}
for (const [canonical, page] of pages) {
  for (const href of page.links) {
    if (!href.startsWith("/") && !href.startsWith("#")) continue;
    const target = new URL(href, canonical);
    if (target.origin !== origin) continue;
    const hash = target.hash;
    target.hash = "";
    const targetUrl = target.pathname === "/" ? origin : target.href;
    const destination = pages.get(targetUrl);
    assert(destination, `${canonical}: broken internal link ${href}`);
    if (hash)
      assert(
        destination.ids.has(decodeURIComponent(hash.slice(1))),
        `${canonical}: broken anchor ${href}`,
      );
  }
}
assert.equal(
  modelLinks.size,
  files.filter((file) => file.startsWith("models/")).length,
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
  `SEO parity passed: ${files.length} pages, ${modelLinks.size} model links; visible titles/descriptions, social cards, schema content, breadcrumbs, list names/order/counts, internal links, FAQ HTML, sitemap, and robots.`,
);

for (const [title, routes] of titles) {
  if (routes.length > 1) console.log(`Shared visible title: ${title} (${routes.join(", ")})`);
}

const notFound = await readPage(await readFile(resolve(output, "_not-found.html"), "utf8"));
assertContentParity(notFound, "_not-found.html");
console.log("404 metadata matches its visible content and blocks indexing.");
