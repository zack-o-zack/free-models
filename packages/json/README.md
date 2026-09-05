# json

These five phases maintain the catalog:

The phases run in this order: discover, reconcile, refresh, render, and check.

## 1. Discover

Discover fetches free model offers from each registered provider and updates provider snapshots.
Later phases use these snapshots.

```sh
bun run catalogue:discover
```

Some providers need an API key. The command stops and names the missing key when the key is absent. Set the key and run the command again. Each discovered offer records its trial limits.

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
be converted to tokens without workload-specific assumptions. OpenRouter keeps its credit-dependent
daily alternatives as parenthetical text in separate terms.

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
