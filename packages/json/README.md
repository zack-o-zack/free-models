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
This uses the configured provider secrets and free inference, saves a `discovered-catalogue` artifact, and does
not push an automation branch or open a catalogue pull request. Download the artifact to review
snapshots and unresolved IDs. The scheduled run repairs, reviews, validates and merges eligible changes automatically.

```sh
gh workflow run catalogue-discovery.yml --ref <branch> -f dry_run=true
```

Run `bun run check` for offline quality and catalogue validation. Run `bun audit` after dependency
updates. Live discovery requires `COHERE_API_KEY`, `MISTRAL_FREE_API_KEY`, and `TOKENROUTER_API_KEY`.
A successful discovery checks catalogue availability and pricing; it does not make inference calls.

### Novita AI and Vercel AI Gateway

Discovery uses the public model APIs and needs no credentials. Novita offers must have zero
input and output prices, use non-tiered billing, and appear on its public
[pricing page](https://novita.ai/pricing). This excludes internal model IDs with placeholder
zero prices. Inference uses `NOVITA_API_KEY` with `https://api.novita.ai/openai`.

Vercel discovery includes language models with zero input, output, and any additional prices.
Inference uses `AI_GATEWAY_API_KEY` with `https://ai-gateway.vercel.sh/v1`. The
[$5 monthly credit allowance](https://vercel.com/docs/ai-gateway/pricing) applies only to eligible
models; it is not used to classify paid models as free. Non-chat endpoints are excluded.
Both providers have account- or model-dependent limits; offers direct users to their dashboards.
## Catalogue autopilot

The daily discovery workflow now repairs and reviews catalogue proposals before merging them.
It runs entirely in GitHub Actions and uses the existing `OPENCODE_API_KEY`. It needs repository
Actions settings to permit creating pull requests and a token with contents, pull-request and
Actions write permissions. No paid inference provider or external agent service is configured.

1. Copy the default-branch catalogue as the trusted baseline, then discover current free offers.
2. Derive identity candidates from namespaced provider IDs and existing reviewed identities.
   Short aliases require a matching namespaced ID. Ambiguous candidates stop the run.
3. Ask a free catalogue model to approve the proposed mappings. Apply schema-validated data
   through an atomic file transaction. Existing identities and mappings cannot be rewritten.
4. Reconcile, refresh metadata, and ask a free model to review the complete catalogue diff.
5. Run `bun run check`, then create or update `automation/free-model-catalogue`.
6. Recheck repository, bot ownership, branch, head SHA, base SHA, file scope and requested-change
   reviews before asking GitHub to merge that exact head. GitHub branch protection still applies.
7. Explicitly dispatch the existing merged-catalogue workflow, which independently validates
   and publishes to R2. This avoids relying on push events generated by `GITHUB_TOKEN`.

Each inference pool is the intersection of the baseline catalogue and a fresh OpenCode discovery.
Discovery verifies that input, output and cache pricing are free and the model is still live.
The agent uses only supported chat-completion endpoints on `opencode.ai`, rejects redirects,
and never falls back to a paid model. SystemOne and other protocols remain in the catalogue but
are excluded from inference until they have a tested adapter. There is no claim that all free
models have equal review quality. Free pricing is checked immediately before inference; provider
pricing changes during a request remain outside repository control.

Model responses cannot execute commands, select arbitrary URLs, change credentials, or authorize
merges. Identity review and final review each try at most three different free models, with a
60-second timeout per inference call. A valid rejection stops the phase rather than shopping
for approval. Each phase has a six-request hard ceiling for future retry extensions.

The workflow stops automatic merge on any unresolved identity, more than 40 proposed identities,
changes to existing connections, loss of a nonempty provider, removal of more than 20% of one
provider's offers, a diff over 140,000 characters, model rejection, or failed validation. Changes
to metadata still use the existing refresh policy, which may retain stale metadata when upstream
enrichment fails. These are catalogue repairs; the agent does not rewrite broken provider code.

Failed repair/review/validation leaves one proposal and uploads catalogue and agent evidence for
14 days. The workflow fails visibly and retries from the latest default branch the next day.
Discovery failures stop before creating a partial proposal. Human commits on the automation
branch are preserved and stop regeneration. A force-with-lease prevents overwriting concurrent
branch updates. Any `CHANGES_REQUESTED` review blocks merging until dismissed, even if a later
review approved. Provider outages or unfamiliar short aliases can still require intervention.

Enable strict up-to-date branch protection or a merge queue if other writers can update the base
concurrently: the API checks the head SHA atomically, but the separate base-SHA check cannot close
the last-instant race with a concurrent base push. Required reviews/checks are never bypassed; rules
that require human approval will intentionally prevent unattended merge. The workflow's validation
runs in the scheduler itself because token-created PR checks can require approval. Configure rules
to suit this dedicated catalogue automation before relying on unattended operation.

To test a proposed implementation without pushes or merges, dispatch **Discover free models** on
its branch with `dry_run=true`. A dry run still calls free inference and uses provider secrets.
To stop unattended merges, disable this workflow in GitHub Actions. The standalone OpenCode PR
reviewer skips catalogue automation PRs; its separate interactive configuration is unchanged.
