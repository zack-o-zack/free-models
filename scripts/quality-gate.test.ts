import { expect, test } from "bun:test";
import { acceptsToolingException } from "./quality-gate";

const now = Date.parse("2026-10-13T00:00:00Z");
const advisory = {
  engine: "security",
  rule: "security/vulnerable-dependency",
  severity: "error",
  filePath: "package.json",
  message:
    "braces (high) — braces vulnerable to stack-exhaustion denial of service through deeply nested patterns",
};
const report = {
  schemaVersion: "1",
  cliVersion: "0.18.1",
  score: 87,
  diagnostics: [advisory],
};

test("accepts only the approved tooling advisory", () => {
  expect(acceptsToolingException(report, now)).toBe(true);
  for (const diagnostic of [
    { ...advisory, message: "another vulnerability" },
    { ...advisory, engine: "lint", rule: "eslint/no-undef" },
    { ...advisory, filePath: "apps/web/package.json" },
    { ...advisory, rule: "security/dependency-audit-skipped", severity: "warning" },
    advisory,
  ]) {
    expect(acceptsToolingException({ ...report, diagnostics: [advisory, diagnostic] }, now)).toBe(
      false,
    );
  }
});

test("fails closed for low scores, expiry, or unexpected scanner reports", () => {
  for (const candidate of [
    null,
    {},
    { ...report, score: 69 },
    { ...report, score: Number.NaN },
    { ...report, cliVersion: "changed" },
    { ...report, diagnostics: [] },
    { ...report, diagnostics: [null] },
  ]) {
    expect(acceptsToolingException(candidate, now)).toBe(false);
  }
  expect(acceptsToolingException(report, Date.parse("2026-11-13T00:00:00Z"))).toBe(false);
});
