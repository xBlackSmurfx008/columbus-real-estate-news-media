// Human-readable output.
//
// The report has one job beyond listing results: make BLOCKING vs ADVISORY vs
// SKIPPED unmissable. A deploy gate whose output has to be interpreted is a
// deploy gate people learn to ignore.

import { ERROR, FAIL, PASS, SKIP } from "./result.mjs";

const LABEL = {
  [PASS]: "PASS ",
  [FAIL]: "FAIL ",
  [SKIP]: "SKIP ",
  [ERROR]: "ERROR",
};

function line(entry) {
  const severity = entry.status === FAIL ? (entry.blocking ? " [BLOCKING]" : " [advisory]") : "";
  return `${LABEL[entry.status]} ${entry.id}${severity} — ${entry.summary}`;
}

export function formatReport(report) {
  const out = [];
  out.push("Columbus Real Estate News — site quality gate");
  out.push(`Target:   ${report.target.origin}${report.target.isProduction ? " (production)" : ""}`);
  out.push(`Writes:   ${report.target.writesAllowed ? `permitted${report.target.writeOptIn ? " (--allow-write)" : ""}` : "blocked (production target without --allow-write)"}`);
  out.push(
    `Corpus:   ${report.corpus.pagesFetched} page(s) fetched from ${report.corpus.sitemapUrls} sitemap URL(s)` +
      `${report.corpus.sampled ? " (sampled — use --full for every URL)" : ""}` +
      `${report.corpus.reason ? ` — ${report.corpus.reason}` : ""}`,
  );
  out.push(`Requests: ${report.httpRequests} HTTP request(s) in ${(report.durationMs / 1000).toFixed(1)}s`);
  out.push("");

  for (const entry of report.results) {
    if (entry.excluded) continue;
    out.push(line(entry));
    if (entry.status === SKIP) out.push(`      why: ${entry.reason}`);
    for (const finding of entry.findings.slice(0, 25)) out.push(`      - ${finding}`);
    if (entry.findings.length > 25) out.push(`      … ${entry.findings.length - 25} more (use --json for all)`);
  }
  const excluded = report.results.filter((entry) => entry.excluded);
  if (excluded.length > 0) {
    out.push(`(not run, excluded on the command line: ${excluded.map((entry) => entry.id).join(", ")})`);
  }

  out.push("");
  out.push("─".repeat(72));
  out.push(
    `${report.counts.pass} passed · ${report.counts.blockingFailures} BLOCKING · ` +
      `${report.counts.advisoryFailures} advisory · ${report.counts.skipped} skipped` +
      `${report.counts.errors > 0 ? ` · ${report.counts.errors} errored` : ""}`,
  );

  const environmentalSkips = report.results.filter((item) => item.status === SKIP && !item.excluded);
  if (environmentalSkips.length > 0) {
    out.push("");
    out.push("SKIPPED checks verified nothing. They are not passes:");
    for (const entry of environmentalSkips) out.push(`  - ${entry.id}: ${entry.reason}`);
  }

  if (report.requireAllViolations.length > 0) {
    out.push("");
    out.push(`--require-all was set, so the skipped checks above are failures: ${report.requireAllViolations.join(", ")}`);
  }

  out.push("");
  if (!report.ok) {
    out.push("RESULT: FAIL — blocking failures above must be resolved before deploying.");
  } else {
    const ran = report.results.length - report.counts.skipped;
    out.push(`RESULT: PASS — no blocking failure among the ${ran} check(s) that ran.`);
    // Never let a narrow or credential-starved run read as a clean bill of health.
    if (report.counts.skipped > 0) {
      out.push(`        ${report.counts.skipped} check(s) verified nothing, so this is NOT full coverage.`);
    } else {
      out.push("        Every check ran. Safe to deploy on this evidence.");
    }
  }
  if (report.ok && report.counts.advisoryFailures > 0) {
    out.push(`        ${report.counts.advisoryFailures} advisory finding(s) do not block, but they are real. Read them.`);
  }
  return out.join("\n");
}
