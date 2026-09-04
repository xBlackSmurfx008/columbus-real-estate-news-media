// Result model for the product-layer site-quality suite.
//
// Design rule that outranks everything else here (owner plan 2026-09-04, item
// 12): a check that CANNOT run must say SKIPPED and why. A scheduled uptime
// workflow silently failed 34 consecutive runs on this property because a
// broken check looked indistinguishable from a passing one. So:
//
//   PASS  - the check ran end to end and found nothing wrong.
//   FAIL  - the check ran end to end and found a defect.
//   SKIP  - the check could not run (no credentials, no network path, target
//           does not support it). NEVER counted as success anywhere.
//   ERROR - the check itself threw. Always blocking, never silently swallowed.
//
// A SKIP never contributes to a green run: the runner prints the skip count on
// its own line and `--require-all` turns any skip into a blocking failure so a
// deploy gate can demand full coverage.

export const PASS = "PASS";
export const FAIL = "FAIL";
export const SKIP = "SKIP";
export const ERROR = "ERROR";

/**
 * @param {object} input
 * @param {string} input.id            stable check id, e.g. "links"
 * @param {string} input.title         human title
 * @param {boolean} input.blocking     does a FAIL block a deploy?
 * @param {string} input.status        PASS | FAIL | SKIP | ERROR
 * @param {string} input.summary       one line
 * @param {string[]} [input.findings]  concrete defects, one per line
 * @param {string} [input.reason]      required when status is SKIP
 * @param {object} [input.stats]       arbitrary JSON detail
 */
export function result(input) {
  if (input.status === SKIP && !input.reason) {
    throw new Error(`check ${input.id}: a SKIP must carry a reason`);
  }
  return {
    id: input.id,
    title: input.title,
    blocking: Boolean(input.blocking),
    status: input.status,
    summary: input.summary,
    findings: input.findings ?? [],
    reason: input.reason ?? null,
    stats: input.stats ?? {},
    durationMs: 0,
  };
}

export function pass(id, title, blocking, summary, stats) {
  return result({ id, title, blocking, status: PASS, summary, stats });
}

export function fail(id, title, blocking, summary, findings, stats) {
  return result({ id, title, blocking, status: FAIL, summary, findings, stats });
}

export function skip(id, title, blocking, reason, stats) {
  return result({
    id,
    title,
    blocking,
    status: SKIP,
    summary: `not run: ${reason}`,
    reason,
    stats,
  });
}

/**
 * Fold a list of findings into a PASS/FAIL. Keeps every check honest about the
 * difference between "ran and found nothing" and "did not run".
 */
export function verdict(id, title, blocking, findings, passSummary, failSummary, stats) {
  if (findings.length === 0) return pass(id, title, blocking, passSummary, stats);
  return fail(id, title, blocking, failSummary ?? `${findings.length} problem(s)`, findings, stats);
}

export function isBlockingFailure(entry) {
  if (entry.status === ERROR) return true;
  return entry.status === FAIL && entry.blocking;
}
