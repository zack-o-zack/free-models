# json

Five phases maintain the catalog. Run them in this order: discover, reconcile, refresh, render, and check.

## 1. Discover

Discover fetches free model offers from each registered provider and updates provider snapshots.
Later phases use these snapshots.

```sh
bun run catalogue:discover
```

Some providers need an API key. The command stops and names the missing key when the key is absent. Set the key and run the command again. Each discovered offer records its trial limits.

### Z.ai

Z.ai discovery reads the public [pricing tables](https://docs.z.ai/guides/overview/pricing)
and includes models only when input, output, and cache prices are all free. Discovery does not
need credentials; inference uses `ZAI_API_KEY` with `https://api.z.ai/api/paas/v4`.
The pricing page does not publish numeric rate limits, so offers direct users to their account
console instead of assuming a quota.

### AnyAPI

AnyAPI discovery follows the public [model catalogue](https://anyapi.ai/ai-models) pagination
and includes cards explicitly marked Free. It reads API model IDs from the linked detail pages;
these IDs also determine offer names and canonical mappings because catalogue labels can be stale.
Discovery needs no credentials. Inference uses `ANYAPI_KEY` with `https://api.anyapi.ai/v1`.
The free plan includes 100k ANY Tokens per day and limited API calls. ANY Tokens are provider
credits, not model tokens; the published pricing does not specify a numeric request quota.

### Offer limits

Schema version 4 requires every offer to include a `limits` object:

```json
{
  "terms": ["20 req / min", "250k tok / min"]
}
```

Terms use short units: `req` for requests, `tok` for tokens, `min` for minutes, and `k` or `m` for
thousands or millions. Token quotas are normalized to forms such as `250k tok / min`. Limits that
providers express in other units stay in those units because request, neuron, and audio usage cannot
be converted to tokens without workload-specific assumptions. A term that applies only under a
condition keeps the condition as parenthetical text in a separate term.

## 2. Reconcile

Reconcile maps each provider model ID to a reviewed canonical model ID. It reports offers without a reviewed mapping.

```sh
bun run catalogue:reconcile
```

## 3. Refresh

Refresh updates canonical model records with current metadata.

```sh
bun run catalogue:refresh
```

## 4. Render

Render builds `free-models.json` from discovered offers, reviewed
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

## Verify live discovery in GitHub Actions

Run **Discover free models** manually with `dry_run` enabled and select the repair branch.
This uses the configured provider secrets, saves a `discovered-catalogue` artifact, and does
not push an automation branch or open a catalogue pull request. Download the artifact to review
snapshots and unresolved IDs. The scheduled run continues to propose changes for review.

```sh
gh workflow run catalogue-discovery.yml --ref <branch> -f dry_run=true
```

Run `bun run check` for offline quality and catalogue validation. Run `bun audit` after dependency
updates. Live discovery requires `COHERE_API_KEY`, `MISTRAL_FREE_API_KEY`, and `TOKENROUTER_API_KEY`.
A successful discovery checks catalogue availability and pricing; it does not make inference calls.
