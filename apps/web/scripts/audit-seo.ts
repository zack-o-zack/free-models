import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CATALOGUE_PAGE_SIZE } from "../src/lib/catalogue-pagination";
import { assertContentParity, readPage } from "./seo-parity";

const output = resolve(import.meta.dir, "../.next/server/app");
const files = (await readdir(output, { recursive: true })).filter(
  (file) =>
    file === "index.html" ||
    /^(models|providers|publishers|catalogue|changelog)(\/.*)?\.html$/.test(file),
);
assert(files.length > 1, "Build the web app before running the SEO audit.");
const sitemap = await readFile(resolve(output, "sitemap.xml.body"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.equal(new Set(urls).size, urls.length, "Sitemap contains duplicate URLs");
assert.equal(urls.length, files.length, "Sitemap must cover every public page");
const titles = new Map<string, string[]>();
const pages = new Map<string, Awaited<ReturnType<typeof readPage>>>();
const modelLinks = new Set<string>();
const cataloguePages = new Map<number, Awaited<ReturnType<typeof readPage>>>();
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
  const catalogueMatch = file.match(/^catalogue\/(\d+)\.html$/);
  if (file === "index.html" || catalogueMatch) {
    cataloguePages.set(catalogueMatch ? Number(catalogueMatch[1]) : 1, page);
    for (const item of page.models) modelLinks.add(item.href);
    assert(
      page.models.length > 0 && page.models.length <= CATALOGUE_PAGE_SIZE,
      `${file}: initial catalogue must contain at most ${CATALOGUE_PAGE_SIZE} models`,
    );
  }
}
