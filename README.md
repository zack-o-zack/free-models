# Free Model Catalogue

This repository builds a deterministic catalogue of free AI model offers. The first executable
slice contains the versioned public envelope and an empty model collection. Provider discovery and
human-owned model mapping are added in later tickets.

## Requirements

- [Bun 1.4.0](https://bun.sh/) (the exact package-manager version is pinned in `package.json`)
- Python's [pre-commit](https://pre-commit.com/) framework for Git hooks

## Install

```sh
bun install --frozen-lockfile
pre-commit install
```

On the first checkout, use `bun install` if the lockfile has not been created yet.

## Catalogue commands

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
bun run catalogue render --output ./free-models.json
bun run catalogue check --input ./free-models.json
```

Run all local checks:

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
