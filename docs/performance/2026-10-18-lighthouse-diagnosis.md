# Mobile Lighthouse measurements — 18 October 2026

Measured with Lighthouse 13.5.0 and Chrome 155.0.8059.82. Production baseline targets https://free-models.zackozack.com/; other runs target a production Next.js build at http://localhost:3110/. Each row is one run, not a statistically established median. Runs were sequential. Default mobile simulated throttling is the acceptance method; the devtools run is a separate diagnostic and cannot establish a PageSpeed 100 result.

| Build/run | Throttling | Performance | FCP ms | LCP ms | TBT ms | Total transfer KiB |
|---|---|---:|---:|---:|---:|---:|
| baseline | simulate | 84 | 1729 | 3754 | 21 | 613.6 |
| local-before | simulate | 87 | 1811 | 3844 | 7 | 615.9 |
| inline | simulate | 88 | 1657 | 3815 | 18 | 671.4 |
| compact | simulate | 88 | 1656 | 3792 | 9 | 649.7 |
| filters | simulate | 88 | 1658 | 3790 | 19 | 632.3 |
| fonts | simulate | 87 | 2107 | 3764 | 20 | 632.1 |
| devtools | devtools | 100 | 873 | 873 | 58 | 632.3 |

## Findings supported by the reports

- The default simulated mobile LCP is the main remaining score loss. In `filters`, it is 3,790 ms with metric score 0.55; at its 25% category weight this loses 11.25 points. FCP is 1,658 ms. TBT is 19 ms and CLS is 0.000055, so long tasks and layout shifts do not explain the remaining performance score.
- The LCP element is the text heading `h1#hero-title` (“Make more.”), not a model logo or hero image. The local unthrottled trace records this paint at 108 ms, including 29 ms TTFB and 78 ms render delay. The report's 3,790 ms result is the simulated mobile estimate; these are different measurements.
- Inlining CSS removes three stylesheet requests and improves local FCP from 1,811 to 1,657 ms. LCP changes from 3,844 to 3,815 ms. Total transfer rises from 616 to 671 KiB. This experiment supports a modest FCP improvement, not a solution to LCP.
- Compact catalogue props plus environment-correct analytics reduce total transfer from 671 to 650 KiB. Deferring filter widgets reduces it to 632 KiB, including 286 KiB of JavaScript in 15 requests. LCP remains approximately 3.79 s. These changes save bytes but do not establish a material LCP improvement.
- The filters run transfers 142 KiB of document, 112 KiB of fonts, 81 KiB of other responses (principally route prefetch), and 12 KiB of images. Lighthouse identifies approximately 50 KiB of unused JavaScript, with an estimated 200 ms LCP opportunity. This opportunity estimate is not a measured saving.
- Removing font preloads and using optional font display worsens FCP from 1,658 to 2,107 ms. That experiment was rejected and the font settings restored.
- Actual DevTools throttling paints FCP and LCP at 873 ms, TBT 58 ms, CLS 0.00445, and scores 100. This diagnostic shows a large sensitivity to throttling methodology. It is not evidence that the default PageSpeed score has reached 100.
- Three production HTTP probes returned CDN HIT with TTFB 509/120/176 ms. The sample is too small to characterize real-user percentiles or establish a persistent backend bottleneck.

## Next controlled experiment

Hypothesis: the eager interactive catalogue graph and full catalogue props add network work counted in simulated LCP. Keep the first 40 cards and pagination as server-rendered HTML, then load catalogue controls and full static catalogue data when the section approaches the viewport. Preserve all crawlable model links, batch size 40, and the existing 500 ms batch loading state.

This is a proposed fix, not a demonstrated result. Compare the same production build with the same default mobile audit settings before and after; repeat at least three times. Record transferred JS/document bytes, FCP/LCP/TBT/CLS, and verify search, filters, pagination, provider links and scroll loading. Reject the experiment if it merely changes audit timing or degrades the user flow. Measure a deployed preview separately before claiming a production improvement.

## Reproduction and raw evidence

```sh
npx --yes lighthouse@13.5.0 http://localhost:3110/ --chrome-flags='--headless --no-sandbox' --output=json --output-path=/tmp/free-models-lighthouse-check.json --quiet
```

Raw reports at diagnosis time: `/tmp/free-models-lighthouse-{baseline,local-before,inline,compact,filters,fonts,devtools}.json`. The devtools trace and network log use the `/tmp/free-models-lighthouse-devtools-0` prefix. These temporary paths are local evidence; this document preserves their key results.
