# Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/). Releases are built from them
(see [RELEASING.md](RELEASING.md)).

```text
type(scope): description
```

- Types: `feat`, `fix`, `perf`, `revert`, `refactor`, `docs`, `test`, `style`, `build`, `ci`, `chore`.
- Scopes: `web`, `json`, `catalogue`, `deps`, `ci`, or a provider name.
- Description: imperative, lowercase, no period, first line ≤ 72 characters.
- Breaking change: add `!` (`feat(json)!: ...`) and a `BREAKING CHANGE:` footer.
- PR titles follow the same format.
- No AI attribution or `Co-Authored-By` trailers.
