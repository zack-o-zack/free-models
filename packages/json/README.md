# json

This package builds a deterministic catalogue of free AI model offers. Provider adapters find
offers, while maintainers explicitly decide which provider IDs represent the same canonical model.
It renders the public `free-models.json` catalogue.

Run commands from this directory, or from the monorepo root through `bun run --filter json
<script>` (the root also aliases every `catalogue:*` script). Paths below are relative to this
directory. See the [root README](../../README.md) for repository-level requirements, install,
quality gates, and automation.

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

Rebuild the unresolved report after reviewing mappings. This command is offline and deterministic:

```sh
bun run catalogue:reconcile
```

When every current offer is resolved, refresh top-level canonical model metadata through the
registered OpenRouter metadata provider:

```sh
bun run catalogue:refresh
```

Metadata refresh is the networked part of the workflow. The provider receives all active canonical
models in one batch and may reuse their resolved offer metadata. `id` and `name` remain
maintainer-owned. Every other canonical field is generated and is replaced by a successful refresh.
If OpenRouter fails or omits a model, refresh warns and retains that model's complete stale record so
publication can continue.

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
bun run catalogue refresh --workspace ./temporary-workspace
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

The same adapter is explicitly registered as the canonical metadata provider. It reuses complete
metadata from a current, reviewed OpenRouter offer. For an active model offered only by another
provider, it looks for an exact OpenRouter model ID matching the reviewed canonical ID. It does not
add, remove, or interpret `:free` suffixes.

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

The public catalogue uses schema version 2. Each model requires `id`, `name`, and `providers`, and
may contain additional JSON-safe top-level fields copied from its canonical record. Rendering and
checking are offline: the check command validates canonical records, provider snapshots, mappings,
the unresolved report, the public schema, and the byte-for-byte deterministic render. Run all local
checks from the monorepo root with:

```sh
bun run check
```

Package-local quality commands are `bun run typecheck` and `bun test`; formatting, linting, and the
aislop scan run over the whole repository from the root.
