# Security exception

Approved on 2026-10-13: GHSA-vfj7-8cjw-p6xm (CVE-2026-93687), `braces@3.0.3`.

The advisory has no published fixed version. `bun why braces` traces it through
`micromatch` and `fast-glob` to ESLint and shadcn tooling. These tools process
repository-controlled glob patterns; the web application does not accept user
glob patterns or import braces at runtime. The remaining risk is stack exhaustion
if a tooling caller supplies a deeply nested brace pattern.

`scripts/quality-gate.ts` accepts exactly this advisory message from aislop 0.18.1.
The finding remains visible in the report. All other errors, audit failures,
and scores below the existing threshold of 70 still fail. Tests cover these
conditions. The exception expires automatically on 2026-11-13.

Upgrade the dependency and remove the wrapper once `bun audit` no longer reports
the advisory. Do not replace this exception with a blanket security suppression.

Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
