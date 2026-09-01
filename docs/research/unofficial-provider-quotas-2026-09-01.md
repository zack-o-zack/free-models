# Unofficial and empirically observed provider quotas

Checked on 2026-09-01 (Asia/Kolkata). The literature review uses public,
unauthenticated sources. This note also records the minimal Gemini, Mistral, and
TokenRouter requests that the parent session had already made with the user's
authorization. This research task did not read local API keys or make additional
authenticated requests.

## Result

Unofficial limits can be useful, but they are not interchangeable with provider
limits. The catalogue should retain the provider-declared state and add a
separate, timestamped observation. Otherwise an account-specific screenshot or
one 429 response will look like a universal entitlement.

| Provider | Best unofficial result | Confidence | Safe catalogue treatment |
| --- | --- | --- | --- |
| Gemini API | Recent public reports cluster around 5 RPM / 250k TPM / 20 RPD for some Flash models and 15 RPM / 250k TPM / 500 RPD for `gemini-3.1-flash-lite`. A current successful response exposed no quota headers. | Medium for the cited models and dates; unknown globally | Keep `account_specific`; add model-specific dashboard observations with date and project scope. |
| Mistral API | The authorized session probe returned 50 RPM and 50k TPM for `mistral-small-latest`, but no daily/monthly maximum. An older public probe found monthly model pools. | High for that organization at that time; unknown globally | Keep `account_specific`; ingest headers for the authenticated organization. Do not invent an RPD value. |
| TokenRouter (`tokenrouter.com`) | Multiple users reported 8 RPM for the temporary `z-ai/glm-5.3-free` promotion. A current successful response exposed no quota headers, and no daily or total ceiling was found. | Low for 8 RPM; unknown for every longer window | Keep `unpublished`; attach 8 RPM only as a short-lived, dated community observation. |
| OpenCode Zen | The official baseline is already 200 requests/day. Source code implies 400/day temporarily for a new IP on the default limiter, until 1,400 lifetime requests; private model overrides remain undiscoverable. | High for code behavior; unknown applicability per deployed model | Publish the shared 200/day per-IP baseline. Keep the new-IP multiplier as conditional source inference, not the default quota. |

## Evidence classes

Use these terms consistently:

- **Declared:** a provider publishes the number as product policy or returns it
  from an official quota endpoint.
- **Account-specific observed:** a dashboard or authenticated response reports
  the number for one project, organization, key, or IP.
- **Inferred:** source code or repeated failures reveal likely limiter behavior,
  but deployed configuration is not public.
- **Unknown:** there is no numerical evidence for the time window in question.

A numerical observation can be exact for the observed account while still being
non-portable. `exact` describes the measurement; it must not imply a global
provider promise.

## Gemini API

### Provider-declared facts

Google's current [rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits)
says that limits are evaluated per project, vary by model and account status, and
that active values must be viewed in AI Studio. RPD resets at midnight Pacific.
The public page no longer supplies a stable inference-limit table.

The public [pricing page](https://ai.google.dev/gemini-api/docs/pricing)
identifies free-of-charge inference models, but its numerical RPD entries concern
features such as grounding. Those values are not ordinary inference quotas.

### Public observations

Recent independent reports are reasonably consistent for a subset of models:

| Model or family | RPM | TPM | RPD | Evidence and caution |
| --- | ---: | ---: | ---: | --- |
| `gemini-3.1-flash-lite` | 15 | 250,000 | 500 | A late-August developer report describes reading these values in AI Studio and changing an application's guard from 1,000 to 450; a June community thread independently reports the same dashboard values. See the [failure log](https://note.com/limber_salvia154/n/ne1fba0b32966?hl=en) and [community comparison](https://www.reddit.com/r/better_claw/comments/1ue95bf/every_free_llm_provider_ranked_by_how_fast_the/). |
| `gemini-3.5-flash`, `gemini-3-flash`, `gemini-2.5-flash` | 5 | 250,000 | 20 | A July/August article transcribes an AI Studio table with these values, and separate users report the 20-RPD behavior. See the [AI Studio table transcription](https://tilnote.io/pages/6a51b3398d9a59d14c1c174c) and [Gemini API discussion](https://www.reddit.com/r/GeminiCLI/comments/1uh0w4f/what_is_going_on_with_the_free_tier_gemini_api/). |
| `gemini-2.5-flash-lite` | 10 | 250,000 | 20 | Present in the same dashboard transcription. Other older pages still say 1,000 RPD, demonstrating why a timestamp is mandatory. |
| Gemma 4 26B/31B | 15 | Reported unlimited | 1,500 | Present in the same dashboard transcription and June community report, but not publicly declared by Google. Treat `unlimited` as an observed dashboard label, not a guarantee. |

These observations conflict with older public tables and with some third-party
pages that still claim 250, 1,000, or 1,500 RPD for the same Flash-Lite family.
That conflict supports Google's current account-specific representation; it does
not justify averaging the values.

The parent session's authorized minimal request to
`gemini-3.5-flash-lite` on 2026-09-01 succeeded but returned no quota-total,
remaining, or reset headers. A normal successful inference call therefore cannot
confirm the reported dashboard values. The authenticated AI Studio limits page,
or a naturally occurring 429 whose `google.rpc.QuotaFailure` contains a
`quotaValue`, remains the stronger account-specific source.

Gemini CLI OAuth quotas are a separate product surface. For example, Google CLI
maintainers have discussed 1,000 aggregate model requests/day, while also saying
that per-model Pro quotas are lower and dynamic. Those numbers must not be copied
to Gemini API-key offers. See the [maintainer discussion](https://github.com/google-gemini/gemini-cli/discussions/4122)
and [quota clarification](https://github.com/google-gemini/gemini-cli/issues/13222).

### Recommendation

For the models above, an observation can be shipped as a hint with
`scope: project`, `source_kind: dashboard_report`, `observed_at`, and medium
confidence. Models without a current observation remain unknown. The catalogue
should never fill all Gemini free models from a single family's values.

## Mistral API

### Provider-declared facts

Mistral's current [usage and limits documentation](https://docs.mistral.ai/admin/billing-usage/usage-limits)
defines organization-wide requests per second, per-model tokens per minute, and
per-model tokens per month. Its [help article](https://help.mistral.ai/en/articles/698531-why-am-i-hitting-api-rate-limits-and-how-do-i-increase-them)
explicitly names tokens per month as the overall consumption cap. Therefore a
missing daily request number is not evidence of an undocumented RPD quota; the
long-window limiter may be monthly tokens instead.

The authenticated Admin API can return `requests_per_second` and
`tokens_limits_by_model`, while ordinary inference responses expose useful
`X-RateLimit-*` headers. This is the reliable programmatic route for each
organization.

### Public observations

The parent session's authorized minimal request to `mistral-small-latest` on
2026-09-01 returned these account-specific headers:

- 50 requests/minute;
- 50,000 tokens/minute;
- query cost 18 tokens; and
- no daily or monthly limit header.

This is an exact observation for that organization and request, but not a public
Free-mode default. The absence of a monthly header also does not prove that the
organization has no monthly cap; it means that response did not expose one.

A detailed February 2026 [community header probe](https://www.reddit.com/r/MistralAI/comments/1rc8rwf/mistral_api_quota_and_rate_limits_pools_analysis/)
reported:

- a global 1 request/second gate;
- a shared standard pool of 50,000 tokens/minute and 4,000,000 tokens/month;
- separate model pools, including 375,000 TPM for `mistral-medium-2508`,
  1,000,000 TPM and 10,000,000 tokens/month for `devstral-2512`, and several
  legacy pools with much larger monthly ceilings; and
- aliases sharing counters with their canonical model.

The report documented the response header names and minimal-request method, which
makes it substantially stronger than a quota list without provenance. It is
still an old snapshot. A late-August [follow-up report](https://www.reddit.com/r/MistralAI/comments/1vlxpgl/verifying_free_model_limits_as_of_august_2026/)
says new header probing produced different/current results, but publishes the
numbers only in an image and explicitly says monthly values were unavailable.
This is enough to show continued variability, not enough to replace the February
table with new universal values.

### Recommendation

Do not manufacture a daily cap. At discovery time, parse authenticated response
headers into an organization-scoped observation and prefer the Admin rate-limit
endpoint when an Admin key is available. Store pool identity because multiple
offers may consume the same counter. A public community observation should be
clearly stale after a short TTL, such as seven days.

## TokenRouter (`api.tokenrouter.com`)

### Provider-declared facts

The public [model page](https://www.tokenrouter.com/models/z-ai/glm-5.3-free/)
and unauthenticated [`/api/pricing`](https://api.tokenrouter.com/api/pricing)
currently show `z-ai/glm-5.3-free` at zero input/output price. The pricing row
contains no RPM, TPM, daily quota, reset, or remaining fields. TokenRouter's
public FAQ says higher rate limits depend on model, capacity, usage, and commercial
terms, but gives no base number.

The live page labels the model a "LIMITED OFFER," but does not publish an end
date in the model or pricing payload. Discovery should therefore treat both the
model and any observation about it as volatile.

The public `/api/status` payload and current web application bundle expose generic
rate-limit configuration features, not the deployed value for this model.

### Public observations

In an August 30-31 [community thread](https://www.reddit.com/r/opencodeCLI/comments/1w2vwjo/glm_53_is_completely_free_on_tokenrouter/),
the original tester and another user independently reported an 8 RPM ceiling.
No contributor provides evidence for a daily, monthly, token, or total-request
ceiling.

The only defensible unofficial statement is therefore **observed 8 RPM during the
promotion**. `unlimited`, `unlimited-ish`, and `no daily cap` are all stronger than
the evidence.

The parent session's authorized minimal request to `z-ai/glm-5.3-free` on
2026-09-01 succeeded but returned no quota-total, remaining, or reset headers.
It confirms that the offer worked for that key at that time, but it does not
confirm 8 RPM or any longer-window allowance.

Do not confuse this provider with `tokenrouter.io`. That separate BYOK gateway
publishes a 1,000 gateway-requests/month Free plan, but it is not the
`api.tokenrouter.com` service used by this repository.

### Recommendation

Keep the declared limit status `unpublished`. Add an observation containing 8
requests/minute, community source, observation date, low confidence, and a short
expiry because the provider labels the model a limited offer. Keep every longer
time window unknown.

## OpenCode Zen

### Provider-declared facts

OpenCode's official product copy publishes 200 requests/day for Big Pickle and
current promotional free models. The checked-in backend normally enforces the
allowance using an IP plus UTC date. This is declared product policy, so OpenCode
must no longer be represented as unpublished or unlimited. The complete source
trace is in [the focused OpenCode note](./opencode-zen-free-limits-2026-09-01.md).

### Source-code inference and the private boundary

The official [`ipRateLimiter.ts`](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/ipRateLimiter.ts#L8-L47)
temporarily doubles the default daily threshold for a new IP until its lifetime
counter reaches seven times the normal threshold. With the advertised baseline,
that implies 400 requests/day until 1,400 lifetime requests.

That behavior applies only to the default path. Deployment resources named
`ZEN_LIMITS` and `ZEN_MODELS*` supply the real base value, anonymous-model mapping,
and private per-model overrides. The public models endpoint omits those fields.
No public unauthenticated method can enumerate the deployed override for each
offer.

### Recommendation

Publish 200 requests/day as the shared, per-IP baseline. Record the 400/day
new-IP behavior only as `source_inference` with a condition such as
`default_limiter && lifetime_requests < 1400`. Do not attach it as an unconditional
tier. Private overrides remain unknown until OpenCode exposes them or a specific
account/IP observes a rejection boundary.

## Catalogue representation

Retain the current declared object and add observations rather than replacing it:

```json
{
  "status": "account_specific",
  "scope": "project",
  "source_url": "https://ai.google.dev/gemini-api/docs/rate-limits",
  "tiers": [],
  "observations": [
    {
      "source_kind": "dashboard_report",
      "source_url": "https://note.com/limber_salvia154/n/ne1fba0b32966?hl=en",
      "observed_at": "2026-08-30T00:00:00Z",
      "confidence": "medium",
      "scope": "project",
      "applies_to": ["gemini-3.1-flash-lite"],
      "quotas": [
        { "metric": "requests", "period": "minute", "max": 15 },
        { "metric": "tokens", "period": "minute", "max": 250000 },
        { "metric": "requests", "period": "day", "max": 500 }
      ]
    }
  ]
}
```

The present schema also needs `month` as a quota period for Mistral, `ip` as a
scope for OpenCode, and a shared `bucket` identity. Without those, even a correct
number can be represented with the wrong reset period or multiplied once per
offer by consumers.

Useful observation fields are:

- `source_kind`: `authenticated_header`, `dashboard`, `dashboard_report`,
  `rejection_boundary`, `source_inference`, or `community_report`;
- `observed_at` and optional `expires_at`;
- `confidence`: `high`, `medium`, or `low`;
- `scope`, `bucket`, and `shared`;
- `applies_to` model IDs;
- `quotas`; and
- a machine-readable `condition` for conditional behavior.

Never silently promote an observation into `status: published`. A 429 boundary
also needs its request count, concurrency, token sizes, and reset evidence; without
those, it is an incident report rather than a measured quota.

## Practical acquisition order

For an unpublished provider, use this sequence:

1. Read official static pages, API payloads, and open source for hidden but public
   constants.
2. With user authorization, inspect authenticated quota endpoints and response
   headers using one minimal request.
3. If the maximum remains unknown, collect a normal-usage 429 and `Retry-After`;
   do not deliberately exhaust the allowance by default.
4. Use a bounded probe only with explicit authorization and a request/token cap.
5. Store the result as a timestamped observation, never as a universal promise.
