// Data-layer readiness.
//
// scripts/production-readiness-audit.mjs already answers "are the tables the
// product depends on installed, and is every live article's data complete".
// It was a standalone tool nothing ran before a deploy. Rather than add a
// fourth overlapping audit, the suite invokes it and folds its findings in:
// its `error` severity blocks, its `warn` severity is advisory.

import { openDatabase } from "../db.mjs";
import { fail, pass, skip } from "../result.mjs";
import { runNode, tail } from "../spawn.mjs";

const ID = "data-readiness";
const TITLE = "Data-layer readiness";

export function parseAuditJson(stdout) {
  const start = stdout.indexOf("{");
  if (start === -1) return null;
  try {
    return JSON.parse(stdout.slice(start));
  } catch {
    return null;
  }
}

export const dataReadiness = {
  id: ID,
  title: TITLE,
  blocking: true,
  async run() {
    const { sql, reason } = await openDatabase();
    if (!sql) return skip(ID, TITLE, true, reason);

    const run = await runNode(["scripts/production-readiness-audit.mjs"], { timeoutMs: 120_000 });
    const report = parseAuditJson(run.stdout);
    if (!report) {
      return fail(ID, TITLE, true, "production-readiness-audit produced no parseable report", [
        `exit code ${run.code}`,
        ...tail(`${run.stdout}\n${run.stderr}`, 12),
      ]);
    }

    const errors = (report.findings ?? []).filter((finding) => finding.severity === "error");
    const warnings = (report.findings ?? []).filter((finding) => finding.severity !== "error");
    const describe = (finding) => `[${finding.severity}] ${finding.code}: ${finding.message}`;
    const stats = { errors: errors.length, warnings: warnings.length, via: "scripts/production-readiness-audit.mjs" };

    if (errors.length > 0) {
      return fail(ID, TITLE, true, `${errors.length} readiness error(s), ${warnings.length} warning(s)`, [...errors, ...warnings].map(describe), stats);
    }
    if (warnings.length > 0) {
      return fail(ID, TITLE, false, `${warnings.length} readiness warning(s)`, warnings.map(describe), stats);
    }
    return pass(ID, TITLE, true, "production-readiness-audit reports no findings", stats);
  },
};
