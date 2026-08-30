# json

These five phases maintain the catalog:

The phases run in this order: discover, reconcile, refresh, render, and check.

## 1. Discover

Discover fetches free model offers from each registered provider and updates provider snapshots.
Later phases use these snapshots.

```sh
bun run catalogue:discover
```

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
mappings, and current model metadata. This file is the public catalog.

```sh
bun run catalogue:render
```

## 5. Check

Check validates the catalog. It checks schemas, provider-to-canonical mappings, generated reports,
and the rendered JSON. It also checks that `free-models.json` matches the current catalog data.

```sh
bun run catalogue:check
```
