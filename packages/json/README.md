# json

Five phases maintain the catalog. Run them in this order: discover, reconcile, refresh, render, and check.

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
