# Provider free-tier limits verification

Verified on 2026-09-01 (Asia/Kolkata) against live first-party pages and APIs. The
repository had no existing research-note convention, so this note lives under
`docs/research/`.

## Executive result

| Provider | Claim status | Live result |
| --- | --- | --- |
| Groq | Verified, with a catalogue-scope correction | The Free Plan table has 13 rows. Two are `groq/` routing endpoints, so this repository returns 11 concrete offers. The quoted GPT OSS and Whisper limits are exact. |
| Gemini | Partly verified; estimates must be removed | The live pricing parser finds 19 free-of-charge model IDs. Exact active RPM/TPM/RPD values are account/project-specific and exposed through AI Studio, not the public pricing page. The proposed `5–15 RPM` and `100–500 RPD` values are unsupported estimates. |
| NVIDIA Build | Limits verified; model count contradicted/stale | The live NVIDIA catalogue query returns 40 resources labelled `Free Endpoint`, not ~245. NVIDIA's live page payload says `Up to 40 rpm` and `10,000 requests per day`, with an explicit model/traffic variability warning. |
| Cloudflare Workers AI | Allocation and count verified; request conversion unsupported | The live pricing source yields 58 non-paid-only models and a shared 10,000-neuron daily free allocation. There is no model-independent “200–500 neurons per response”; consumption follows input/output units, so the request estimate should not be published as a limit. |
| Mistral | Public characterization verified; exact count and estimate unverified | Current official docs put exact organization/model limits behind the Admin Limits surface and an authenticated Admin API. They describe RPS, per-model TPM, and per-model monthly tokens. The stated 14 models and `~1 RPS / ~500K TPM` were not reproducible without the user's Free-mode organization and are not public defaults. |
| OpenRouter | Limits verified; model count contradicted/stale | The live models API has 24 concrete `:free` model IDs (excluding `openrouter/` routers), not ~50. Official sources confirm 20 RPM and 50 RPD below $10 all-time purchased credits, or 1,000 RPD at/above $10. |
| TokenRouter | Price fact verified; count contradicted under a price-based definition | The public pricing API currently has three zero-priced default-group rows. The repository returns one only because it additionally requires an ID ending in `-free`. No public numerical request cap was found; “unlimited-ish” is unsupported. |
| OpenCode Zen | Count/prices and numerical cap verified; original setup/cap claims corrected | The live Zen pricing source lists six free rows. OpenCode's official Go FAQ publishes 200 requests/day for Big Pickle and current promotional free models. The backend normally enforces this as a shared per-IP daily bucket; anonymous access is supported, so billing details are not universally required. |

## Evidence by provider

### Groq

**Status: verified.** The official [Groq rate-limits page](https://console.groq.com/docs/rate-limits)
defines RPM, RPD, TPM, TPD, ASH, and ASD, says limits apply at organization
level, and currently exposes 13 Free Plan rows. Live parsing produced:

- `openai/gpt-oss-120b`: 30 RPM, 1K RPD, 8K TPM, 200K TPD.
- `whisper-large-v3`: 20 RPM, 2K RPD, 7.2K ASH, 28.8K ASD.

The page cautions that its table is a high-level summary and that exact current
organization limits are visible in the authenticated Limits page. The repository's
[`GroqProvider.discover()`](../../packages/json/src/providers/groq.ts) deliberately
removes `groq/compound` and `groq/compound-mini`; therefore 13 source rows become
11 returned concrete offers.

**Programmatic source:** continue parsing the public table. Retain its per-model
measurements, record `scope: organization`, and retain the source warning. Parse
abbreviated values (`1K`, `7.2K`) into numbers while preserving the source text if
lossless normalization is not guaranteed.

### Gemini

**Status: free price rows verified; rate estimates unsupported/login-walled.** The
official [Gemini pricing page](https://ai.google.dev/gemini-api/docs/pricing?hl=en)
currently yields 19 model IDs whose standard-tier input and output are both “Free
of charge.” The official [rate-limits documentation](https://ai.google.dev/gemini-api/docs/rate-limits)
says limits are evaluated per project, vary by model, usage tier, and account
status, are not guaranteed, and that active values are viewed in Google AI Studio.

The public pricing page does verify a different quota: Gemini 2.5 Flash Search
grounding is free up to 500 RPD, shared with Flash-Lite. That is a grounding-tool
quota, not the model inference RPD. The proposed `~5–15 RPM` and `~100–500 RPD`
inference numbers have no current first-party support and should not be shipped.

**Programmatic source:** the public pricing table can establish zero-price status
and specific tool quotas. Do not convert those into inference rate limits. Without
an authenticated AI Studio source, return an explicit unavailable/dynamic state
with `scope: project`, not an estimate.

### NVIDIA Build

**Status: account limits verified; count contradicted/stale.** The repository's
official NGC catalogue query uses
[`api.ngc.nvidia.com/v2/search/catalog/resources/ENDPOINT`](https://api.ngc.nvidia.com/v2/search/catalog/resources/ENDPOINT?q=%7B%22query%22%3A%22orgName%3A%5C%22qc69jvmznzxy%5C%22%22%2C%22page%22%3A0%2C%22pageSize%22%3A100%2C%22scoredSize%22%3A100%2C%22groupBy%22%3A%22resourceType%22%2C%22filters%22%3A%5B%5D%2C%22orderBy%22%3A%5B%7B%22field%22%3A%22score%22%2C%22value%22%3A%22DESC%22%7D%5D%7D&group-labels-by-labelset=true)
with `orgName:"qc69jvmznzxy"`, then selects the first-party label
`nimType = Free Endpoint`. The live query returned 104 endpoint resources in total
and 40 labelled free, across two pages. This exactly matches a live run of
`NvidiaProvider.discover()` and the current snapshot; ~245 is no longer correct.

The dehydrated first-party payload on [build.nvidia.com](https://build.nvidia.com/)
currently contains:

```json
{
  "requestsPerMinute": "Up to 40 rpm",
  "requestsPerDay": "10,000 requests per day"
}
```

Its adjacent details state that limits may vary by model and shared-user traffic
may cause throttling. Thus these are account-wide upper bounds, not guaranteed
per-model capacity.

**Programmatic source:** parse the public Build payload (or a stable first-party
endpoint if NVIDIA exposes one) and attach the shared values to each offer with
`scope: account`, `shared: true`, and `qualifier: up_to`. Do not describe them as
per-offer independent budgets.

### Cloudflare Workers AI

**Status: allocation and model count verified; request estimate unsupported.** The
official machine-readable [Workers AI pricing Markdown](https://developers.cloudflare.com/workers-ai/platform/pricing/index.md)
states a free allocation of 10,000 neurons per day, reset at 00:00 UTC, shared by
Workers Free and Workers Paid. It also names paid-billing-only models. The current
repository parser yields 58 models after excluding those rows.

Cloudflare publishes per-model unit rates rather than a fixed request charge. For
example, `@cf/meta/llama-3.1-8b-instruct` is currently 25,608 neurons per million
input tokens and 75,147 per million output tokens. A request with 1,000 input and
1,000 output tokens would therefore use about 100.8 neurons; another token mix or
model can differ greatly. The asserted generic `200–500 neurons per response` and
“dozens-to-hundreds” conversion are not provider limits and should not be emitted.

**Programmatic source:** retain the shared daily neuron allocation plus each
model's published unit schedule. Consumers can estimate workload-specific request
counts; the catalogue should not invent one.

### Mistral

**Status: exact values authenticated/dynamic; proposed estimate unsupported.** The
official [Mistral Usage and limits documentation](https://docs.mistral.ai/admin/billing-usage/usage-limits)
says Free mode includes usage within limits shown in the authenticated Admin
Limits page. Completion limits include requests per second and per-model tokens
per minute. Mistral's [rate-limit help article](https://help.mistral.ai/en/articles/698531-why-am-i-hitting-api-rate-limits-and-how-do-i-increase-them)
adds per-model tokens per month and says limits are organization-wide and Free mode
has the lowest limits.

Mistral now also documents an authenticated
[`GET /v1/admin/rate-limit`](https://docs.mistral.ai/api/endpoint/beta/admin/billing)
response containing `requests_per_second` and `tokens_limits_by_model` with
`tokens_per_minute` and `tokens_per_month`. This requires an Admin API key; a
standard model API key does not grant Admin API access. The public docs also mention
`X-RateLimit-Remaining`, but that remaining-value header is not a substitute for
the full configured maxima.

No credential was available in this research session. Consequently, the stated 14
Free-mode models and `~1 RPS / ~500K TPM` cannot be independently verified. The
current repository snapshot contains 54 active IDs returned through its Free-mode
credential, so “14” also conflicts with the repository's latest checked-in
discovery evidence. It may reflect an older account or a narrower manual model
definition.

**Programmatic source:** when an Admin API key is available, read the Admin rate
limit endpoint and join the model token map onto offers while retaining the
organization-wide RPS. Otherwise return authenticated/dynamic-unavailable status.
Do not encode the old 1 RPS value as a default.

### OpenRouter

**Status: limits verified; count contradicted/stale.** The official
[limits documentation](https://openrouter.ai/docs/api_reference/limits) and
[FAQ](https://openrouter.ai/docs/faq) describe a global free-model pool. Current
first-party guidance gives:

| All-time credits purchased | RPM | RPD |
| --- | ---: | ---: |
| Less than $10 | 20 | 50 |
| At least $10 | 20 | 1,000 |

The live official [models API](https://openrouter.ai/api/v1/models?output_modalities=all)
contains 24 concrete IDs ending in `:free` after excluding `openrouter/` router IDs.
Thus ~50 is stale today. The limit values are shared across free models/account,
not granted separately to every offer. Upstream-provider rate limiting can still
occur.

**Programmatic source:** the public docs provide the two conditional shared limit
profiles. The authenticated `GET /api/v1/key` reports whether the key is on the
free tier and usage information, but its `rate_limit` object is deprecated. Attach
both documented profiles to every free offer unless discovery has authenticated
account state that selects one.

### TokenRouter

**Status: zero price verified; provider count claim too narrow; cap unpublished.**
The public first-party [pricing API](https://api.tokenrouter.com/api/pricing)
currently returns 133 rows. Three default-group rows have zero input price under
the API's `quota_type` semantics:

- `z-ai/glm-5.3-free`
- `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- `stealth/ox-alpha`

The repository selects only `z-ai/glm-5.3-free` because
[`parseTokenRouterPricing()`](../../packages/json/src/providers/tokenrouter.ts)
also requires the model ID to end with the literal suffix `-free`. That makes “one”
correct for the repository's current native-free rule, but not for the provider's
current zero-price catalogue. The public [TokenRouter models page](https://www.tokenrouter.com/models/)
also exposes free-named models, while the authenticated `/v1/models` endpoint is
needed to establish live availability for a particular account.

No numerical free-model request cap was found in the first-party API or docs.
TokenRouter says higher RPM/TPM limits depend on models, capacity, usage, commercial
terms, and technical feasibility. “Unlimited-ish” is therefore unsupported.

**Programmatic source:** keep zero-price metadata distinct from limits. Return an
explicit unpublished/unknown limit state unless TokenRouter adds a first-party cap
field or authenticated limit endpoint. Separately decide whether catalogue policy
means “all active zero-price rows” or only native IDs ending in `-free`.

### OpenCode Zen

**Status: free rows and a 200 requests/day product quota verified.** The live
[OpenCode Zen documentation](https://opencode.ai/docs/zen/)
currently has six rows whose input/output/cache-read values are `Free` and whose
cache-write is `Free` or `-`:

- `big-pickle`
- `mimo-v2.5-free`
- `ling-3.0-flash-fin-free`
- `nemotron-3-ultra-free`
- `nemotron-3.5-lightning-free`
- `muse-spark-1.2-contributor-free`

All six are also present in the public [Zen models API](https://opencode.ai/zen/v1/models).
OpenCode's official [Go product copy](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/i18n/en.ts#L368-L370)
publishes 200 requests/day for Big Pickle and promotional free models. Its
[backend limiter](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/ipRateLimiter.ts#L8-L47)
normally implements the allowance as a shared per-IP daily bucket that resets at
midnight UTC. New IPs can temporarily receive twice the default threshold, while
private model configuration can override the baseline.

The backend supports anonymous access for models configured `allowAnonymous`, so
the generic Zen onboarding instruction to add billing details is not a universal
requirement for every free offer. The models API publishes neither the daily
limit nor model-specific overrides. A 429 can expose `Retry-After`, but not total
or remaining quota. See the focused
[OpenCode limits verification](./opencode-zen-free-limits-2026-09-01.md) for the
full source trace.

Search indexes briefly showed an additional `hy3-free` row from a different cached
version, but fresh fetches of both `opencode.ai/docs/zen/` and
`dev.opencode.ai/docs/zen/` produced the six-row table above. The discovery source
must therefore be treated as volatile and re-read rather than hard-coded.

**Programmatic source:** retain the exact zero-price columns and verify IDs against
the models API as the provider already does. Attach the advertised 200 requests/day
baseline only after the schema can express `scope: ip` and a shared bucket across
OpenCode free offers. Do not represent it as 200 independent requests per model.

## Implications for a structured `limits` object

The evidence does not support one flat per-model numeric shape. The object must
preserve scope, sharing, conditionality, and absence of published data. At minimum,
the representation needs to distinguish:

- **Per-model limits:** Groq model rows; Mistral per-model token limits when
  authenticated.
- **Shared provider/account/project limits:** NVIDIA, Cloudflare, OpenRouter, and
  Mistral RPS.
- **Conditional profiles:** OpenRouter's all-time credit threshold.
- **Usage budgets versus traffic rates:** Cloudflare neurons/day is a consumption
  quota, not RPM; Gemini grounding quotas are tool quotas, not model inference RPD.
- **Dynamic or unavailable values:** Gemini and Mistral authenticated organization
  state.
- **Unpublished values:** TokenRouter and OpenCode. These require an explicit state,
  not `null` interpreted as unlimited and not an estimate.

Every emitted fact should carry a first-party `source_url`; volatile/authenticated
facts should also carry an observation timestamp. Copying a shared limit onto each
offer is acceptable only if the object clearly says `shared: true` and identifies
the shared scope, so clients do not multiply the quota by the offer count.

## Recommended confidence labels

- `documented`: a public first-party source gives the exact value.
- `observed`: an authenticated first-party response gives the account's value.
- `dynamic`: first-party docs say the value varies and an authenticated lookup is
  required.
- `unpublished`: the provider publishes no numerical value.
- `estimate`: reserved for a separately presented workload calculation; never use
  it as an enforceable provider limit.
