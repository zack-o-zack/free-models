# SEO audit — 9 September 2026

The workspace audit covers the homepage and all 185 generated model pages. The fixes preserve static generation and use the existing catalogue. The production domain was not supplied, so live hosting, search index coverage, and Search Console could not be audited. No deployment was performed.

## Fixed

| Area | Finding | Change |
| --- | --- | --- |
| Canonicals | Public pages had no canonical URLs; site configuration pointed to GitHub. | Added one canonical per page from a configurable website origin. Search/filter query strings are excluded. GitHub remains a repository link. |
| Search snippets | Model descriptions ranged from 29 to 276 characters and could repeat the missing-description placeholder. | Added unique model-specific titles and concise descriptions for all public pages. |
| Crawl discovery | No sitemap or robots endpoint. | Added static `/sitemap.xml` and `/robots.txt`, covering the homepage and every generated model URL. No fabricated modification dates. |
| Social sharing | No Open Graph or Twitter cards. | Added page-specific social metadata and a static 1200 × 630 branded PNG, including image alternative text. Model pages explicitly include the image to avoid nested metadata replacement. |
| Structured data | No machine-readable site, catalogue, or breadcrumb information. | Added WebSite, CollectionPage/ItemList, WebPage, and BreadcrumbList JSON-LD. The catalogue order matches the initial visible list. Catalogue text is escaped before serialization into HTML. |
| FAQ content | Collapsed answers were absent from the page DOM and actual HTML elements. | Kept FAQ panels mounted, preserving the accordion interaction and exposing answers in the generated HTML. |
| Navigation | Breadcrumb ended at the publisher rather than the current model; provider headings skipped levels. | Breadcrumb now identifies the current model. Provider sections have headings, with connection labels as paragraphs. |
| Missing pages | Generic framework error screen. | Added a branded 404 with a catalogue link. Verified HTTP 404 and `noindex` for unknown pages and model URLs. |
| Icons | Default framework favicon remained. | Replaced it with the existing FM mark and added an Apple touch icon and SVG title. |
| Images | Small logos requested 256px images; PFNet's favicon request returned 404. | Requested 64px list logos and 128px hero logos; used PFNet's official favicon. |
| Rendering | Every card was painted in a large catalogue. | Added off-screen rendering containment and disabled automatic model-card route prefetching. All model links remain in the initial HTML. |
| Accessibility | Low-contrast tab count and accessible names that omitted visible values. | Increased count opacity and included visible metric/provider labels in accessible names. |

The schema describes the comparison site and its visible content. It does not invent reviews, ratings, prices, author identities, or unsupported search actions.

## Validation

- Production build generated all routes statically: 186 public HTML pages plus framework and metadata routes (194 generated entries).
- `bun run --filter web seo:check` checks every public page for a single main heading, unique titles/descriptions/canonicals, social cards, sitemap coverage, JSON-LD, FAQ answers, model links, local anchors, and crawler rules. It also verifies catalogue schema order against the rendered links.
- All 185 model pages are linked directly from the homepage HTML, without requiring search, scrolling events, or JavaScript execution to discover their URLs.
- TypeScript and Biome checks pass for the web source, scripts, tests, and package manifest.
- Five SEO regression tests pass, including encoded routes, stealth IDs, bounded descriptions, and hostile JSON-LD text.
- Repository test run: 76 passed; one existing catalogue workflow test exceeded its default 5-second timeout during concurrent build work. Its complete eight-test suite passed on rerun with a 15-second timeout.
- HTTP checks: homepage, sitemap, robots, social PNG, favicon, and touch icon return 200; unknown routes return 404 with `noindex`; model trailing-slash URLs redirect with 308.
- Browser checks: search filters work; FAQ answers expand; 320px, 390px, and desktop layouts do not overflow horizontally; the social PNG renders at 1200 × 630.
- Configuration checks cover an unset origin, an indexable production origin, a non-indexable Vercel preview, and rejection of a URL with a path.

Mobile Lighthouse results from local production builds:

| Measurement | Homepage before | Homepage after | Model detail after |
| --- | ---: | ---: | ---: |
| SEO | 100 | 100 | 100 |
| Accessibility | 97 | 100 | 100 |
| Best practices | 96 | 100 | 100 |
| Performance | 79 | 80 | 89 |
| Largest contentful paint | 4.1s | 3.8s | 3.6s |
| Total blocking time | 310ms | 360ms | 100ms |
| Cumulative layout shift | 0 | 0 | 0.014 |
| Total transfer | 766 KiB | 602 KiB | — |

These are individual lab runs, not field Core Web Vitals or a ranking prediction. The slight performance-score difference is within normal run-to-run variability; transfer size is materially lower. The homepage still has substantial client hydration work for its 185 interactive cards. Lighthouse's SEO category already passed before this work; it does not detect all canonical, sitemap, structured-data, or content-discovery gaps found by the full-page audit.

Local raw reports are in `.scratch/seo/lighthouse-before.json`, `lighthouse-after.json`, and `lighthouse-model.json`. That directory is intentionally untracked.

## Production setup still required

1. Set `NEXT_PUBLIC_SITE_URL` to the final public HTTPS origin **before building**, for example `https://your-real-domain.com`. See `apps/web/.env.example`. This origin is baked into the static metadata, sitemap, and JSON-LD. Setting it only when starting an already-built server will not update those files.
2. Build and check:

   ```sh
   bun run --filter web build
   bun run --filter web seo:check
   ```

3. Deploy, then verify the real host's HTTP-to-HTTPS and alternate-host redirects, TLS, response headers, sitemap, robots rules, and social-image URLs. The audit used the reserved `https://seo-audit.example` origin only as a local production test fixture; never deploy that build.
4. Verify the domain in Google Search Console and Bing Webmaster Tools, submit `/sitemap.xml`, and inspect representative model pages. Check crawl/index coverage and real-user Core Web Vitals after deployment.
5. Review missing or stale model descriptions in the supplied catalogue and publish a new static build when catalogue data changes. Provider content, availability, quotas, benchmark values, and documentation links were not independently re-researched or rewritten.

Unconfigured local builds emit `noindex, nofollow` and disallow crawling. Vercel preview builds do the same even when a production origin is configured. On other preview hosts, leave `NEXT_PUBLIC_SITE_URL` unset. The production SEO check intentionally fails against such non-indexable builds.

## Reference basis

Canonical URLs are emitted in HTML and matched to sitemap entries, following [Google's canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls). The sitemap omits speculative timestamps, consistent with [Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). Site identity and breadcrumbs follow the [site-name](https://developers.google.com/search/docs/appearance/site-names) and [breadcrumb](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) documentation. The implementation was also checked against the installed Next.js 16.3.3 metadata, robots, sitemap, and ImageResponse documentation.
