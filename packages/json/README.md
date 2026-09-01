# json

These five phases maintain the catalog:

The phases run in this order: discover, reconcile, refresh, render, and check.

## 1. Discover

Discover fetches free model offers from each registered provider and updates provider snapshots.
Later phases use these snapshots.

```sh
bun run catalogue:discover
```

Discovery reads Groq's free-plan rate-limit table (excluding the `groq/` routing
namespace), Gemini's per-model standard-tier pricing, NVIDIA Build's `Free Endpoint` catalogue
labels, and Cloudflare Workers AI's free-allocation model pricing without credentials. OpenRouter
discovery keeps concrete `:free` models only; its `openrouter/` routing namespace is never
included. TokenRouter discovery intersects its public,
zero-price `-free` models
with the models actively served to `TOKENROUTER_API_KEY` and records all supported endpoint types.
This excludes stale and imported pricing entries without limiting discovery to one API protocol.
Mistral discovery is account-scoped: set `MISTRAL_FREE_API_KEY` to an API key for an organization in
Free mode before running this command. Mistral keys inherit their organization's plan, so do not use
a key from a paid organization for catalogue discovery.

### Offer limits

Schema version 3 requires every offer to include a `limits` object:

```json
{
  "status": "published",
  "scope": "account",
  "source_url": "https://provider.example/limits",
  "tiers": [
    {
      "name": "free",
      "quotas": [
        {
          "metric": "requests",
          "period": "minute",
          "max": 20,
          "qualifier": "exact"
        }
      ]
    }
  ]
}
```

`status` distinguishes public numerical limits (`published`) from values that require the user's
authenticated account (`account_specific`) and values the provider does not publish
(`unpublished`). Non-published states have an empty `tiers` array; they do not mean unlimited.
`scope` identifies the shared quota boundary, so consumers must not multiply account, organization,
or project limits by the number of offers. A tier can include structured `eligibility`, as used for
OpenRouter's lifetime-credit threshold. `qualifier` distinguishes exact maxima from documented
upper bounds such as NVIDIA's “up to 40 RPM.”

## 2. Reconcile

Reconcile maps provider model IDs to reviewed canonical model IDs. It records each recognized offer
and reports offers without a reviewed mapping. This phase identifies the canonical model for each
provider offer.

```sh
bun run catalogue:reconcile
```

## 3. Refresh

Refresh adds current metadata to canonical model records. This phase keeps model descriptions and
other model information current.

```sh
bun run catalogue:refresh
```

## 4. Render

Render creates `free-models.json` in a deterministic way. It uses discovered offers, reviewed
mappings, and current model metadata. CI renders this file in a temporary workspace and uploads it
to the public CDN after a merge; the generated file is not committed to the repository.

```sh
bun run catalogue:render
```

## 5. Check

Check validates the catalog. It checks schemas, provider-to-canonical mappings, generated reports,
and the rendered JSON. Pass `--input` when the rendered file is in a temporary CI location.

```sh
bun run catalogue:check
```
