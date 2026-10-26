import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { publisherAliases, publisherWebsites } from "../src/lib/provider-logos";

// Refresh explicitly; builds and visitors use the checked-in assets without upstream requests.
const cataloguePath =
  process.argv[2] ?? fileURLToPath(new URL("../.generated/free-models.json", import.meta.url));
const catalogue = await Bun.file(cataloguePath).json();
const websites = new Map<string, string>();
function addWebsite(value: unknown) {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:")
      websites.set(url.hostname, url.origin);
  } catch {
    /* Ignore missing or malformed catalogue documentation URLs. */
  }
}
Object.values(publisherWebsites).forEach(addWebsite);
for (const model of catalogue.models) {
  for (const provider of Object.values(model.providers) as { doc?: Record<string, string> }[]) {
    const docs = provider.doc;
    addWebsite(docs?.overview ?? docs?.models ?? docs?.pricing ?? docs?.rate_limit);
  }
}

const assets = new URL("../public/brand-logos/", import.meta.url);
const manifestFile = new URL("../src/lib/brand-logos.json", import.meta.url);
await mkdir(assets, { recursive: true });
const manifest: Record<string, string> = (await Bun.file(manifestFile).exists())
  ? await Bun.file(manifestFile).json()
  : {};
const sources = new Map(
  [...websites.entries()].map(([host, website]) => {
    const params = new URLSearchParams({
      client: "SOCIAL",
      type: "FAVICON",
      fallback_opts: "TYPE,SIZE,URL",
      url: website,
      size: "128",
    });
    return [host, `https://t0.gstatic.com/faviconV2?${params}`];
  }),
);
for (const model of catalogue.models) {
  const rawSlug = model.id.split("/")[0].toLowerCase();
  const slug = publisherAliases[rawSlug] ?? rawSlug;
  if (
    publisherWebsites[slug] ||
    publisherWebsites[rawSlug] ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  )
    continue;
  const name = slug.replace(
    /(^|-)([a-z])/g,
    (_: string, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`,
  );
  sources.set(`publisher:${slug}`, `https://openrouter.ai/images/icons/${name}.svg`);
}
const queue = [...sources.entries()];
let failures = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let item = queue.pop(); item; item = queue.pop()) {
      const [host, source] = item;
      try {
        const response = await fetch(source, {
          signal: AbortSignal.timeout(15000),
        });
        let bytes = new Uint8Array(await response.arrayBuffer());
        const type = response.headers.get("content-type")?.split(";")[0];
        const extension = (
          {
            "image/svg+xml": "svg",
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/webp": "webp",
            "image/x-icon": "ico",
            "image/vnd.microsoft.icon": "ico",
          } as Record<string, string>
        )[type ?? ""];
        if (!response.ok || !extension || !bytes.length)
          throw new Error(`HTTP ${response.status}, ${type}`);
        if (extension === "svg") {
          const svg = new TextDecoder().decode(bytes);
          if (!/<title[\s>]/i.test(svg)) {
            bytes = new TextEncoder().encode(
              svg.replace(
                /(<svg\b[^>]*>)/i,
                `$1<title>${Bun.escapeHTML(host.replace("publisher:", ""))} logo</title>`,
              ),
            );
          }
        }
        const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
        const filename = `${hash}.${extension}`;
        await Bun.write(new URL(filename, assets), bytes);
        manifest[host] = `/brand-logos/${filename}`;
      } catch (error) {
        failures++;
        console.warn(
          `Logo unavailable for ${host}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }),
);
await Bun.write(
  manifestFile,
  `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2)}\n`,
);
console.log(
  `${Object.keys(manifest).length} local logos; ${failures} unavailable (initials fallback).`,
);
