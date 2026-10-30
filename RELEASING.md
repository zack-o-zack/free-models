# Releasing

`packages/json` and `apps/web` are released separately, on their own tags (`json-v*` and `web-v*`).
Releases are automatic. Every push to `main` runs `scripts/release.ts` from
`.github/workflows/release.yml`. For each package, the script reads the
[Conventional Commits](https://www.conventionalcommits.org/) that touched the package path since
its last tag, and publishes a GitHub release when at least one commit is releasable:

| Commit                                  | Version bump                 |
| --------------------------------------- | ---------------------------- |
| `fix:`, `perf:`, `revert:`              | patch                        |
| `feat:`                                 | minor                        |
| `!` or a `BREAKING CHANGE:` footer      | major (minor before 1.0.0)   |
| `chore:`, `docs:`, `refactor:`, `test:` | no release, not in the notes |

The first release of a package uses the version in its `package.json`. Later versions come from
the latest tag, so `package.json` versions are not bumped.

Catalogue data updates (`chore: update free model catalogue`) do not cause a release. Each json
release includes the rendered `free-models.json` as an asset and is the repository's latest
release, so `releases/latest/download/free-models.json` always points to the newest json release.

## Preview

To preview the next releases without publishing them:

```sh
bun scripts/release.ts --dry-run
```
