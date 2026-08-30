# free-models

This monorepo builds and maintains a deterministic catalogue of free AI model offers. It uses
[Bun workspaces](https://bun.sh/docs/install/workspaces): shared tooling lives at the root and
each package under `packages/` owns its sources, tests, and data.

## Layout

- `packages/json` — the catalogue application. Provider adapters discover free offers, maintainers
  review canonical identities, and the package renders the public `free-models.json` artefact. See
  [`packages/json/README.md`](packages/json/README.md) for the catalogue workflow.

## Requirements

- [Bun 1.4.0](https://bun.sh/) (the exact package-manager version is pinned in `package.json`)
- Python's [pre-commit](https://pre-commit.com/) framework for Git hooks

## Install

```sh
bun install --frozen-lockfile
pre-commit install
```

On the first checkout, use `bun install` if the lockfile has not been created yet.

## Workspace commands

Package scripts run from the root through Bun's `--filter`:

```sh
bun run --filter json catalogue:discover
```

The catalogue scripts are also aliased at the root (`bun run catalogue:discover`,
`bun run catalogue:reconcile`, `bun run catalogue:refresh`, `bun run catalogue:render`, and
`bun run catalogue:check`), so existing automation and habits keep working unchanged.

## Quality gates

Biome formatting and linting run over the whole repository from the root. Type checking and tests
are delegated to the workspace packages:

```sh
bun run format        # apply formatting
bun run format:check  # check formatting
bun run lint          # lint
bun run typecheck     # type-check the workspace packages
bun test              # run every test in the repository
bun run quality       # all of the above plus the aislop scan
bun run check         # quality gates plus catalogue validation
```

## GitHub automation

The discovery workflow runs once per day and can also be started manually for a model launch. It
uses the fixed `automation/free-model-catalogue` branch and updates one pull request only when the
normalized catalogue changes. Existing commits on that branch are retained, so maintainers can add
canonical models and mappings directly to the pull request. If unresolved offers remain, the public
catalogue is not regenerated and pull-request validation stays red until those identities are
reviewed. After resolution, scheduled automation refreshes metadata before rendering and includes
canonical registry changes in the generated update. Pull-request checks and the merged workflow's
catalogue validation job run offline reconciliation, rendering, and validation, so changing
upstream metadata cannot make a reviewed commit fail nondeterministically. After those checks pass,
the merged workflow's separate publish job uploads the rendered file to R2.

This automation becomes operational only after this private repository has a GitHub remote and
GitHub Actions is allowed to create branches and pull requests with `GITHUB_TOKEN`. Configure the
repository's workflow permissions for read and write access and allow GitHub Actions to create pull
requests. The workflows themselves grant read access to validation jobs and grant write access only
to the scheduled discovery job. Scheduled discovery also requires a `MISTRAL_FREE_API_KEY`
repository secret. The key must belong to a Mistral organization that is still in Free mode; the
provider uses that organization's current model catalogue as the free-model boundary.

Provider APIs and documentation are used with the accepted risk that their terms, schemas, and
anonymous-access policies can change. The generated catalogue is a reviewed observation of provider
catalogues, not a guarantee of availability or completeness. The repository is intended to remain
private; the merged-catalogue workflow renders the public JSON temporarily in CI and uploads it to
[`https://static.zackozack.com/free-models.json`](https://static.zackozack.com/free-models.json).
That publish job requires the repository secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`. It also applies a read-only wildcard CORS policy so browser applications
can fetch the public JSON.

## Pre-commit behaviour

The hook pipeline runs Biome safe formatting and lint fixes before the pinned aislop staged-file
scan. If Biome modifies a staged file, pre-commit stops the commit. Review the change, stage it
again, and rerun the commit. This prevents an automatic fix from entering a commit without review.

Run the same hooks against every tracked file when changing tool configuration:

```sh
pre-commit run --all-files
```
