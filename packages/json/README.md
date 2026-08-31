# json

These five phases maintain the catalog:

The phases run in this order: discover, reconcile, refresh, render, and check.

## 1. Discover

Discover fetches free model offers from each registered provider and updates provider snapshots.
Later phases use these snapshots.

```sh
bun run catalogue:discover
```

Discovery reads Groq's free-plan rate-limit table, Gemini's per-model standard-tier pricing,
NVIDIA Build's `Free Endpoint` catalogue labels, and Cloudflare Workers AI's free-allocation model
pricing without credentials. TokenRouter discovery intersects its public, zero-price `-free` models
with the models actively served to `TOKENROUTER_API_KEY`. This excludes stale and imported pricing
entries. Mistral discovery is account-scoped: set `MISTRAL_FREE_API_KEY` to an API key for an
organization in Free mode before running this command. Mistral keys inherit their organization's
plan, so do not use a key from a paid organization for catalogue discovery.

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
