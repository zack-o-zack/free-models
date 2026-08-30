# Hosting the public JSON catalogue

Research date: 2026-08-30

## Context

The generated public artifact is about 143 KB. The current GitHub repository is private, while this
generated file is intended to be public. The useful hosting model is therefore a repeatable
deployment from the merged `main` branch, with a stable HTTPS URL, CDN delivery, correct JSON
metadata, and predictable cache invalidation.

## Recommendation

Use **Cloudflare R2 with the custom domain `static.zackozack.com`**. It is the literal object-upload
model needed here: the merged `main` workflow renders the JSON temporarily in GitHub Actions and
uploads it to the stable `free-models-cdn/free-models.json` object. The source repository stays
private, while the public URL is `https://static.zackozack.com/free-models.json`.

The workflow sets `Content-Type: application/json` and a five-minute public cache policy. JSON is not
cached by Cloudflare's default file-extension rules, so the R2 custom domain must have a Cache Rule
that marks this path eligible for caching. Overwriting the stable key can briefly serve the previous
response while edge cache entries expire; use a versioned key later if consumers need immutable
snapshots.

The equivalent manual upload is:

```text
wrangler r2 object put free-models-cdn/free-models.json \
  --file packages/json/free-models.json \
  --content-type application/json \
  --cache-control 'public, max-age=300, s-maxage=300'
```

Cloudflare's free R2 Standard tier includes 10 GB-month storage, 1 million Class A operations,
10 million Class B operations, and free Internet egress each month.

## Options compared

| Option | Fit for this repository | Important behavior |
| --- | --- | --- |
| **Cloudflare R2 + custom domain** | **Chosen** | Upload one object with Wrangler or an S3-compatible client. Free tier: 10 GB-month storage, 1M Class A requests, 10M Class B requests/month, and free Internet egress. A custom domain you control is required for Cloudflare Cache; JSON is not cached by file extension by default, so set a public cache header or Cache Rule. The free `r2.dev` URL is rate-limited and intended for development. |
| **Cloudflare Pages** | Good alternative | Private/public Git repositories are supported. Free static requests are unlimited; the free plan allows 500 builds/month, 20,000 files/site, and 25 MiB per file. Assets are served from Cloudflare's distributed network, with ETags and `Access-Control-Allow-Origin: *` by default. |
| **Public mirror + jsDelivr** | Best zero-cost CDN for public/open-source data | Push the JSON to a public GitHub repository, then use `https://cdn.jsdelivr.net/gh/<owner>/<repo>@<commit>/free-models.json`. Exact commit URLs are effectively immutable; branch URLs are cached for about 12 hours and aliases such as `@latest` for up to 7 days. It is not a direct upload service and cannot read the current private repository. |
| **GitHub Pages** | Simple, but requires a public mirror on GitHub Free | A public repository can publish the file at a stable `github.io` URL. GitHub documents a 1 GB published-site limit and a soft 100 GB/month bandwidth limit. A private repository requires GitHub Pro/Team/Enterprise, and the published site is public. GitHub does not document per-file response-header control, so it is less suitable when explicit CORS or cache headers matter. |

## R2 upload pattern

For the object-upload workflow, use the stable key and set the MIME type and cache policy when
uploading:

```sh
wrangler r2 object put <bucket>/free-models.json \
  --file packages/json/free-models.json \
  --content-type application/json \
  --cache-control 'public, max-age=300, s-maxage=300'
```

The workflow uses the stable key for the simple public URL. Do not rely on overwriting the same R2
key for immediate global replacement: with a cached custom domain, the old response may remain
available until its TTL expires or the URL is purged. A safer future pattern is
`v/<git-sha>/free-models.json` for immutable snapshots plus a short-lived `latest` object or alias.

Cloudflare's default CDN rules do not cache JSON by extension. The upload's `Cache-Control` metadata
or a Cache Rule must opt the JSON path into caching.

## jsDelivr pattern

If exposing the generated file through a small public mirror repository is acceptable, use an
exact commit or release tag for consumers that need reproducibility:

```text
https://cdn.jsdelivr.net/gh/<owner>/<public-repo>@<commit-sha>/free-models.json
```

Use a branch or alias only for a convenience “latest” URL. Its cache delay makes it a poor sole
source when the catalogue must reflect a merge quickly. A GitHub Action can copy the generated
file to the public mirror after the private repository's validation succeeds.

## Sources

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) — private/public repository support and automatic deployments.
- [Cloudflare Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/) — unlimited free static asset requests.
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/) — build, file-count, and file-size limits.
- [Cloudflare Pages serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/) — Tiered Cache, ETags, default headers, and asset TTL behavior.
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/) — storage, operation, and egress allowances.
- [Cloudflare R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) — custom domains, caching, and `r2.dev` limitations.
- [Cloudflare R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/) — stale cached responses after overwriting an object.
- [Cloudflare R2 upload objects](https://developers.cloudflare.com/r2/objects/upload-objects/) — Wrangler uploads and HTTP metadata flags.
- [Cloudflare Wrangler GitHub Action](https://github.com/cloudflare/wrangler-action/blob/main/README.md) — GitHub Actions authentication and commands.
- [Cloudflare default cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/) — JSON is not cached by extension by default and cache rules/headers can opt it in.
- [jsDelivr GitHub CDN](https://www.jsdelivr.com/github) — free CDN for public/open-source GitHub files.
- [jsDelivr project documentation](https://github.com/jsdelivr/jsdelivr) — URL form, file limits, and branch/alias/commit caching behavior.
- [jsDelivr Terms of Use](https://github.com/jsdelivr/jsdelivr/blob/master/Terms%20of%20Use.md) — restrictions relevant to using the service as a general-purpose file host.
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) — availability and bandwidth/site limits.
- [GitHub Pages publishing](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) — public-repository requirement on GitHub Free and MIME handling.
