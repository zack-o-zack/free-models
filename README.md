# Free Model Catalogue

This repository builds a deterministic catalogue of free AI model offers. Provider adapters find
offers, while maintainers explicitly decide which provider IDs represent the same canonical model.

## Requirements

- [Bun 1.4.0](https://bun.sh/) (the exact package-manager version is pinned in `package.json`)
- Python's [pre-commit](https://pre-commit.com/) framework for Git hooks

## Install

```sh
bun install --frozen-lockfile
pre-commit install
```

On the first checkout, use `bun install` if the lockfile has not been created yet.

## Catalogue workflow

Run every registered provider and update its normalized snapshot:

```sh
bun run catalogue:discover
```

New provider model IDs appear in `catalogue/unresolved.json`. Define reviewed IDs and display names
in `catalogue/canonical-models.json`, then map each provider model in
`catalogue/mappings/<provider>.json`. Mapping files contain only provider-to-canonical identity:

```json
{
  "provider": "example",
  "mappings": {
    "provider-model-id": "owner/model"
  }
}
```

Rebuild the unresolved report after reviewing mappings:

```sh
bun run catalogue:reconcile
```

Rendering fails while any active offer remains unresolved. Once reconciliation produces an empty
provider map, render the public catalogue:

Render the catalogue to `free-models.json`:

```sh
bun run catalogue:render
```

Validate the generated catalogue at runtime:

```sh
bun run catalogue:check
```

The underlying CLI also accepts explicit paths:

```sh
bun run catalogue discover --workspace ./temporary-workspace
bun run catalogue reconcile --workspace ./temporary-workspace
bun run catalogue render --output ./free-models.json
bun run catalogue check --input ./free-models.json
```

The check command validates canonical records, provider snapshots, mappings, the unresolved report,
the public schema, and the byte-for-byte deterministic render. Run all local checks with:

```sh
bun run check
```

Individual quality commands are `bun run format`, `bun run format:check`, `bun run lint`,
`bun run typecheck`, and `bun test`.

## Pre-commit behaviour

The hook pipeline runs Biome safe formatting and lint fixes before the pinned aislop staged-file
scan. If Biome modifies a staged file, pre-commit stops the commit. Review the change, stage it
again, and rerun the commit. This prevents an automatic fix from entering a commit without review.

Run the same hooks against every tracked file when changing tool configuration:

```sh
pre-commit run --all-files
```
