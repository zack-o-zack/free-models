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
This uses the configured provider secrets and reviewer inference, saves a `discovered-catalogue` artifact, and does
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

The daily discovery workflow repairs and reviews catalogue proposals before merging them.
It runs entirely in GitHub Actions. Review inference uses the OpenCode Go subscription first, then
free reviewer tiers (described below); discovery also uses the provider keys listed above. It needs
repository Actions settings to permit creating pull requests and a token with contents,
pull-request and Actions write permissions. No external agent service is configured.

1. Copy the default-branch catalogue as the trusted baseline, then discover current free offers.
   A provider whose discovery fails keeps its committed snapshot and is reported to repair.
2. Restore any committed identity or mapping that was edited or removed. Automation only adds
   identities and mappings; renames go through a reviewed code change.
3. Hold back providers that failed discovery, disappeared, lost more than 20% of their offers, or
   changed a connection. A held provider keeps its committed snapshot and is recorded in
   `catalogue/held-providers.json`. If the same anomaly persists for three days, it is accepted.
4. Derive identity candidates from namespaced provider IDs, existing reviewed identities and
   agreeing existing mappings. Ask a reviewer model to approve each single-candidate mapping
   on its own. Approved mappings are applied through an atomic file transaction. Ambiguous,
   declined or unreviewed offers are left out of the proposal and retried on the next run.
5. Reconcile, refresh metadata, and ask a reviewer model to review the catalogue change.
   Snapshots, identities and mappings are reviewed as a raw diff, split into parts of at most
   120,000 characters; every part must be approved. Refreshed metadata is copied from upstream
   registries, so it is summarized per field path with examples instead of reviewed line by line.
6. Run `bun run check:catalogue`, then create or update `automation/free-model-catalogue`. The PR
   body lists every restore, hold, accepted change, mapping and deferred offer.
7. Recheck repository, bot ownership, branch, head SHA, base SHA, file scope and requested-change
   reviews before fast-forwarding the default branch to that exact validated commit. GitHub marks
   the PR indirectly merged. The update is never forced; branch protection still applies.
8. Explicitly dispatch the existing merged-catalogue workflow, which independently validates
   and publishes to R2. This avoids relying on push events generated by `GITHUB_TOKEN`.

Reviewers are tiered by provider. The OpenCode Go subscription is tried first with DeepSeek V4 Pro,
then Claude Haiku 5.5. It uses the same `OPENCODE_API_KEY` as OpenCode free models, so the key
must belong to a workspace subscribed to Go, and DeepSeek needs the **Global** region enabled in
the workspace privacy settings. Requests send their own user agent and one `x-opencode-session`
per review request, as Go requires. Go models are fixed in code, not taken from the catalogue.
Free OpenCode models follow. The remaining free tiers are ordered by their most intelligent model: NVIDIA (`NVIDIA_API_KEY`), Gemini
(`GEMINI_API_KEY`), Mistral (`MISTRAL_FREE_API_KEY`, a Free-mode organization key) and Cohere
(`COHERE_TRIAL_API_KEY`, the trial key, never a paid production key). A tier without its secret
is skipped, so NVIDIA and Gemini are optional.

Each free tier offers its two most intelligent chat models, ranked by the reviewed baseline's
Artificial Analysis intelligence index. Upstream publishes the index for only some models, so
unscored chat models rank after scored ones, by context length. A candidate must be in the
baseline catalogue with a mapping and chat metadata, and this run's discovery must still list it
free with the same connection. Providers that
failed discovery or are held back supply no reviewers. A model whose catalogued context length is
too small for the prompt is skipped. An auth, billing or quota error (401, 402, 403 or 429) skips
that provider for the rest of the run, so an exhausted Go allowance falls back to free OpenCode
models. Only fixed endpoints are called and redirects are rejected. Apart from the Go
subscription, no paid model is used. Provider pricing changes after discovery remain outside
repository control.

Model responses cannot execute commands, select arbitrary URLs, change credentials, or authorize
merges. Each inference call has a 60-second timeout, or 180 seconds for OpenCode Go models, which reason before answering. A model that times out is skipped for the rest of the run. Replies may wrap the JSON in prose or code fences; only the outermost object is parsed. A valid rejection stops the phase rather than
shopping for approval. Each review request has an eight-call hard ceiling; when every tier fails,
work is deferred to the next daily run. The agent report and PR body record every reviewer attempt and
its outcome.

The workflow stops automatic merge only when more than half of the providers fail discovery in one
run, the reviewed diff needs more than four parts, the final review rejects a part, or validation
fails.
Changes to metadata still use the existing refresh policy, which may retain stale metadata when
upstream enrichment fails. These are catalogue repairs; the agent does not rewrite broken provider code.

Failed review/validation leaves one proposal and uploads catalogue and agent evidence for
14 days. The workflow fails visibly and retries from the latest default branch the next day.
Human commits on the automation branch are preserved and stop regeneration. A force-with-lease
prevents overwriting concurrent branch updates. Any `CHANGES_REQUESTED` review blocks merging
until dismissed, even if a later review approved.

Merging uses GitHub's non-forced Git reference update rather than a squash merge. A concurrent
base update makes the fast-forward fail atomically, so the workflow cannot merge an unvalidated
combination of new base code and catalogue data. This requires the Actions token to be allowed to
fast-forward the default branch. Rules requiring all updates to use the PR merge endpoint will
block it; the workflow does not bypass those rules or change repository settings. In that case,
use a merge queue integration before enabling unattended operation. See GitHub's
[reference-update semantics](https://docs.github.com/en/rest/git/refs#update-a-reference) and
[indirect merges](https://docs.github.com/en/pull-requests/reference/pull-request-merges).
The workflow's validation runs in the scheduler because token-created PR checks can require approval.

To test a proposed implementation without pushes or merges, dispatch **Discover free models** on
its branch with `dry_run=true`. A dry run still calls reviewer inference, including the OpenCode Go subscription, and uses provider secrets.
To stop unattended merges, disable this workflow in GitHub Actions. The standalone OpenCode PR
reviewer skips catalogue automation PRs; its separate interactive configuration is unchanged.
