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

Canonical IDs normally use the OpenRouter-style `owner/model` form. Temporary models whose public
identity is deliberately hidden use `stealth:<campaign-id>`, allowing offers from multiple providers
to share one identity without assigning ownership to any provider.

Rebuild the unresolved report after reviewing mappings:

```sh
bun run catalogue:reconcile
```

Refresh canonical model metadata from the registered metadata source:

```sh
bun run catalogue:enrich
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

## OpenRouter discovery

The registered `openrouter` adapter reads the official models catalogue without an API key and
requests all output modalities. It publishes only concrete model IDs ending in `:free`; the
`openrouter/free` meta-router is excluded inside the adapter. Each offer keeps the documented
`https://openrouter.ai/api/v1` base URL as connection data and preserves every other model field
from the upstream response under `metadata`.

Anonymous catalogue access is a current upstream behavior, not a permanence guarantee. Discovery
fails clearly if the request, response envelope, model identity, JSON safety, or model-ID uniqueness
contract changes.

## OpenCode Zen discovery

The registered `opencode` adapter reads the official Zen documentation and anonymous live model
catalogue. A free offer is accepted only when its pricing row marks input and output as `Free`, its
model name matches exactly one endpoint row, and that row's model ID matches exactly one live model.
The adapter copies the documented endpoint and AI SDK package into `connection` without adding an
inferred protocol. Remaining live model fields are preserved under `metadata`, except for the
response-generated `created` timestamp, which is omitted because it changes between equivalent
catalogue responses.

This strict join includes provider-declared free offers without a `-free` suffix, such as Big Pickle.
Discovery fails when either table changes shape, identities become ambiguous, a documented free row
does not join, or the live model response is malformed.

## Canonical model metadata

Each published model in `free-models.json` carries a `metadata` field maintained by an independent
metadata source. The source role is decoupled from offer providers: OpenRouter currently fills it,
but either side can be swapped without touching the other. Enrichment resolves every currently free
canonical model against the source catalogue by exact identifier, then exact canonical slug, then a
base-normalized identifier match that deterministically picks the lexically smallest upstream
variant when several collapse onto one base. Variant suffixes are never stripped from stealth
campaign identities. The result is stored in a committed
`catalogue/metadata/<source>.json` snapshot.

The published `metadata` object uses a fixed field set: `architecture`, `benchmarks`,
`context_length`, `created`, `description`, `hugging_face_id`, `knowledge_cutoff`, `reasoning`, and
`supported_parameters`. Values are copied verbatim from the source without per-field type
enforcement; fields the source did not publish are `null`. Models the source cannot resolve publish
`metadata: null`. No annotations, hints, or timestamps are added to the published values.

Benchmark values are source-published scores mirrored as of the snapshot date. They are indicative
only and carry no cross-model comparability guarantee. Enrichment never fails the catalogue: when
the source is unreachable or returns an unexpected shape, the last approved snapshot stays
authoritative and the transaction continues.

The check command validates canonical records, provider snapshots, mappings, the unresolved report,
the public schema, and the byte-for-byte deterministic render. Run all local checks with:

```sh
bun run check
```

Individual quality commands are `bun run format`, `bun run format:check`, `bun run lint`,
`bun run typecheck`, and `bun test`.

## GitHub automation

The discovery workflow runs once per day and can also be started manually for a model launch. It
uses the fixed `automation/free-model-catalogue` branch and updates one pull request only when the
normalized catalogue changes. Existing commits on that branch are retained, so maintainers can add
canonical models and mappings directly to the pull request. If unresolved offers remain, the public
catalogue is not regenerated and pull-request validation stays red until those identities are
reviewed.

This automation becomes operational only after this private repository has a GitHub remote and
GitHub Actions is allowed to create branches and pull requests with `GITHUB_TOKEN`. Configure the
repository's workflow permissions for read and write access and allow GitHub Actions to create pull
requests. The workflows themselves grant read access to validation jobs and grant write access only
to the scheduled discovery job.

Provider APIs and documentation are used with the accepted risk that their terms, schemas, and
anonymous-access policies can change. `free-models.json` is a reviewed observation of provider
catalogues, not a guarantee of availability or completeness. The repository is intended to remain
private; only the generated `free-models.json` artifact is designed for public exposure.

## Pre-commit behaviour

The hook pipeline runs Biome safe formatting and lint fixes before the pinned aislop staged-file
scan. If Biome modifies a staged file, pre-commit stops the commit. Review the change, stage it
again, and rerun the commit. This prevents an automatic fix from entering a commit without review.

Run the same hooks against every tracked file when changing tool configuration:

```sh
pre-commit run --all-files
```
