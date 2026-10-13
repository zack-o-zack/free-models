const approvedBracesMessage =
  "braces (high) — braces vulnerable to stack-exhaustion denial of service through deeply nested patterns";

export function acceptsToolingException(report: unknown, now = Date.now()): boolean {
  if (now >= Date.parse("2026-11-13T00:00:00Z")) return false;
  if (!report || typeof report !== "object") return false;
  const scan = report as Record<string, unknown>;
  if (scan.schemaVersion !== "1" || scan.cliVersion !== "0.18.1") return false;
  if (typeof scan.score !== "number" || !Number.isFinite(scan.score) || scan.score < 70) {
    return false;
  }
  if (!Array.isArray(scan.diagnostics)) return false;
  let accepted = 0;
  for (const diagnostic of scan.diagnostics) {
    if (!diagnostic || typeof diagnostic !== "object") return false;
    if (!["error", "warning", "info"].includes(diagnostic.severity)) return false;
    if (diagnostic.rule === "security/dependency-audit-skipped") return false;
    if (diagnostic.severity !== "error") continue;
    if (
      diagnostic.engine !== "security" ||
      diagnostic.rule !== "security/vulnerable-dependency" ||
      diagnostic.filePath !== "package.json" ||
      diagnostic.message !== approvedBracesMessage
    ) {
      return false;
    }
    accepted++;
  }
  return accepted === 1;
}

if (import.meta.main) {
  const scan = Bun.spawn(["bun", "run", "aislop", "ci", ...Bun.argv.slice(2)], {
    stdout: "pipe",
    stderr: "inherit",
  });
  const output = await new Response(scan.stdout).text();
  const code = await scan.exited;
  process.stdout.write(output);
  if (code === 0) process.exit(0);
  if (code !== 1) process.exit(code);
  let report: unknown;
  try {
    report = JSON.parse(output);
  } catch {
    process.exit(code);
  }
  if (!acceptsToolingException(report)) process.exit(code);
  console.error(
    "Accepted tooling exception GHSA-vfj7-8cjw-p6xm until 2026-11-13; see .aislop/README.md.",
  );
}
