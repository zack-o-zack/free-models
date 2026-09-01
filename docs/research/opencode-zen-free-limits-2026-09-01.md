# OpenCode Zen free-model limits

Verified on 2026-09-01 (Asia/Kolkata) against OpenCode's live documentation and
models endpoint, and against official repository commit
[`0428492`](https://github.com/anomalyco/opencode/commit/04284921ac8f657555b5a182f5ff055f471543e4)
from 2026-08-31.

## Conclusion

OpenCode Zen's zero-price models are **not unlimited**. Current official product
copy explicitly advertises **200 requests/day** for "Big Pickle plus promotional
models available at the time." The official backend implements that free-usage
rate limiting and returns HTTP 429 when it is exceeded.

The 200-request figure is public, but its representation needs care: the confirmed
limiter is keyed by source IP and the normal daily bucket is shared by models that
use the default limit. Private model configuration can define an override, and new
IPs can temporarily receive twice the default threshold. The catalogue must not
describe OpenCode as "unlimited-ish", "no hard cap", or merely "fair use."

## What is verified

| Question | Finding |
|---|---|
| Do limits exist? | **Yes.** The Zen request handler selects an IP/day limiter for models configured as anonymous and a key/minute limiter for other models. Both can return HTTP 429. |
| Is an exact free-model allowance public? | **Yes, at the product level:** 200 requests/day. Private configuration still controls the deployed base value and any model-specific overrides, so the public API cannot enumerate exceptions. |
| What is the free-limit scope? | The anonymous limiter is keyed by source IP. Depending on private model configuration, its daily counter can be shared across default models or separated using model-derived key material. The public sources do not reveal the current mapping for each free offer. |
| Is the reset observable? | **Only after rejection.** Zen's own limit errors can include `Retry-After`; the daily limiter calculates it to the next UTC day. The response does not expose the total or remaining allowance. |
| Can capacity also throttle a model? | **Yes.** Separate provider TPM, performance, and per-minute budget controls influence routing. Upstream 429 responses can also pass through Zen. These are capacity controls, not a user's free entitlement. |
| Is billing setup required for every free model? | **No.** The backend explicitly supports a public/anonymous path, and a live anonymous request to one current free model succeeded. Billing/credits and free-model rate limiting are separate paths. |
| Are monthly limits the free allowance? | **No.** The documented monthly workspace/member limits are user-configured spending safeguards. |

## Evidence

### 1. Zen has an explicit daily free-usage limiter

The official [`ipRateLimiter.ts`](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/ipRateLimiter.ts#L8-L47)
loads free limits, builds Redis keys from the request IP and current UTC date,
tracks successful attempts, and throws `FreeUsageLimitError` when the daily count
reaches the configured threshold. It calculates `Retry-After` as the number of
seconds until the next UTC day.

There is also a new-user multiplier in the default-model path: an IP considered
new receives twice the configured daily threshold until its lifetime count reaches
seven times that threshold. With the advertised 200-request base this is 400
requests/day until the lifetime counter reaches 1,400 requests, provided the model
uses the default rather than a private override. This is checked-in backend
behavior, not separately advertised product entitlement.

The request
[`handler.ts`](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/handler.ts#L114-L124)
chooses this IP limiter when a model's private configuration has
`allowAnonymous`; otherwise it uses the key limiter. Importantly, the limiter is
checked before API-key authentication and billing classification. Later, the
handler classifies an authenticated `allowAnonymous` model as free
([lines 808-816](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/handler.ts#L808-L816)).
Adding credits therefore does not, by itself, prove that a zero-price model bypasses
the free limiter.

For non-anonymous keyed models, the checked-in
[`keyRateLimiter.ts`](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/keyRateLimiter.ts#L6-L35)
has a default of 1,000 requests per minute, with an optional model override. That
number must **not** be copied onto the free-model offers: the current per-model
configuration determines which limiter applies, and that configuration is not
public.

### 2. OpenCode publishes a 200 requests/day product quota

The current official English product copy asks, "What is the difference between
free models and Go?" Its answer says that free models include Big Pickle and
current promotional models, "with a quota of 200 requests/day"; see
[`en.ts` lines 368-370](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/i18n/en.ts#L368-L370).
The Go route renders that answer in its FAQ
([`index.tsx` lines 281-283](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/go/index.tsx#L281-L283)).

This is authoritative support for a 200 requests/day catalogue value. It does not
say "200 per model" or "200 per account." The backend's default IP/date Redis key
shows that the ordinary implementation is a shared per-IP daily bucket.

### 3. Deployed values and model overrides remain private configuration

The checked-in
[`subscription.ts`](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/core/src/subscription.ts#L7-L50)
defines fields named `dailyRequests`, `dailyRequestsFallback`, and `promoTokens`,
but obtains their values by parsing the deployment resource `ZEN_LIMITS`. The
numeric values are not present in the repository.

Similarly, the model schema permits `allowAnonymous`, a model `rateLimit`, and
provider `tpmLimit` values, but loads the actual model records from deployment
resources `ZEN_MODELS1` through `ZEN_MODELS30`; see
[`model.ts`](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/core/src/model.ts#L21-L45)
and its
[resource-loading path](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/core/src/model.ts#L79-L112).
Consequently, the public source verifies the 200-request product quota and its
normal IP/day mechanism, but the API cannot prove that every current offer lacks a
private override. Discovery should treat the product quota as the advertised
baseline and must not invent per-model exceptions.

### 4. The public API does not expose limit totals or remaining usage

An anonymous GET of the live
[`/zen/v1/models`](https://opencode.ai/zen/v1/models) endpoint on 2026-09-01
returned HTTP 200 and model objects containing only `id`, `object`, `created`, and
`owned_by`. It returned no limit fields and no rate-limit total, remaining, or
reset headers. This matches the official
[`modelsHandler.ts`](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/modelsHandler.ts#L12-L30),
which emits only those fields.

Zen also scrubs upstream response headers, retaining only `Content-Type` and
`Cache-Control`; see
[`handler.ts` lines 288-295](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/handler.ts#L288-L295).
For Zen-generated rate-limit errors, it returns HTTP 429 and, when available, only
`Retry-After`
([lines 485-510](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/handler.ts#L485-L510)).
Thus an anonymous client can learn a reset delay after it is blocked, but cannot
derive the authoritative configured maximum or remaining allowance from the API.
The public 200-request value must come from the product copy, not response headers.
Exhausting a quota deliberately would still not reveal the configured total and
was not attempted.

### 5. Capacity throttling is separate from the free quota

Zen's routing code filters backing providers using private per-provider budget and
TPM settings before selecting a route; see
[`handler.ts` lines 588-610](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/handler.ts#L588-L610).
The
[`providerBudgetTracker.ts`](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/providerBudgetTracker.ts#L5-L16)
documents a per-provider, per-minute budget shared across models. Zen also handles
upstream HTTP 429 as a provider response and prefixes its message as an upstream
provider error
([handler lines 298-325](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/handler.ts#L298-L325)).

These controls explain why temporary unavailability or throttling need not mean
that a user's daily free counter is exhausted. They should not be converted into
an offer-level request quota.

### 6. Billing requirements and monthly spend limits are distinct

The live [Zen documentation](https://opencode.ai/docs/zen/) instructs users to add
billing details and says Zen is charged per request
([source lines 48-53](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/web/src/content/docs/zen.mdx#L48-L53)).
The same page marks the current zero-price models as available only for a limited
time
([lines 232-239](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/web/src/content/docs/zen.mdx#L232-L239)).
The Zen documentation itself does not repeat the request allowance; the Go FAQ is
the official source for the 200 requests/day figure.

The API handler deliberately converts the literal API key `public` to no key
([`handler.ts` lines 98-102](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/handler.ts#L98-L102)),
and permits a missing key for models configured `allowAnonymous`
([lines 674-678](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/console/app/src/routes/zen/util/handler.ts#L674-L678)).
On 2026-09-01, one minimal anonymous POST using `Authorization: Bearer public` and
`nemotron-3.5-lightning-free` returned HTTP 200 with cost `0` and no rate-limit
headers. This used one request from the anonymous quota. Therefore the generic Zen
onboarding instructions do not establish a payment-method requirement for every
free offer.

The documented
[monthly limits](https://opencode.ai/docs/zen/#monthly-limits) are values users set
for a workspace or member
([source lines 253-260](https://github.com/anomalyco/opencode/blob/04284921ac8f657555b5a182f5ff055f471543e4/packages/web/src/content/docs/zen.mdx#L253-L260)).
They are spending controls for billable use, not a provider-issued free quota and
must not be emitted as the free offer's limit.

## Catalogue recommendation

For every current OpenCode zero-price offer, emit the advertised limit as a shared
per-IP daily quota:

```json
{
  "status": "published",
  "scope": "ip",
  "shared": true,
  "bucket": "opencode-free-default",
  "source_url": "https://opencode.ai/go",
  "tiers": [
    {
      "name": "free models",
      "quotas": [
        {
          "metric": "requests",
          "period": "day",
          "max": 200,
          "qualifier": "exact"
        }
      ]
    }
  ]
}
```

The present catalogue schema cannot express this accurately. Add `ip` to `scope`
and add shared-quota identity (`shared` plus `bucket`, or an equivalent design)
before representing OpenCode. `account` is inaccurate, while attaching 200/day to
each `offer` without a shared bucket would incorrectly imply 200 requests for every
model.

The temporary new-IP multiplier may be recorded as explanatory/conditional
metadata if the schema can say that it applies only to models without a private
override. It should not replace the advertised 200-request baseline. If the
catalogue requires all conditional tiers to be generally documented rather than
inferred from backend source, omit the 400/day tier and retain it only as a note.

If explanatory metadata is supported, add a short machine-readable note such as
`shared_ip_quota_with_private_model_overrides_not_exposed`. Keep the following
facts out of numerical tiers:

- the keyed-model 1,000 RPM default, because it is not verified as the path used
  by each current free offer;
- provider TPM/budget routing controls;
- user-configured monthly spend limits; and
- `Retry-After`, because it is an observed reset delay after rejection, not an
  allowance.

A future provider parser should continue reading the free rows from the Zen docs,
but source the shared 200/day quota from the official Go product copy. If OpenCode
publishes model-specific overrides or exposes them through the API, discovery can
replace the baseline for those offers. An authenticated dashboard value should be
represented separately as an observed value with a timestamp.
