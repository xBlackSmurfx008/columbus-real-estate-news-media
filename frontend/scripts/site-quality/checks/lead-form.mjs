// Lead-form submission.
//
// This check EXTENDS scripts/submission-smoke.mjs — it imports that script's
// request builder and runner instead of posting its own payloads, so there is
// one definition of what a controlled CREN submission looks like.
//
// Two modes, chosen by what the target allows:
//
//   validation probe (always safe, runs everywhere including production)
//     Posts deliberately invalid payloads and requires HTTP 400. Every route
//     validates before it INSERTs, so this proves the form endpoint is
//     deployed, reachable, and rejecting garbage — and writes nothing.
//
//   full submission (non-production targets, or production with --allow-write)
//     Posts valid payloads, requires 201, confirms the row landed AND that the
//     capture path flagged it is_test = true, then deletes exactly the rows
//     this run created. If any payload would NOT be classified as test traffic
//     by scripts/test-traffic-lib.mjs, the check refuses to send anything: a
//     submission that could be mistaken for a real lead never leaves here.

import { openDatabase } from "../db.mjs";
import { fail, skip, verdict } from "../result.mjs";
import { buildSmokeRequests, normalizeRunId, runSubmissionSmoke } from "../../submission-smoke.mjs";
import { isTestTraffic, realTrafficSql, tableColumns } from "../../test-traffic-lib.mjs";

const ROUTE_TABLES = { contact: "contacts", subscribe: "subscribers", leads: "leads", members: "members" };
// Rows the capture path writes alongside the primary record, keyed by email.
const SATELLITE_TABLES = ["consent_events", "inquiry_queue"];

function runIdFor(now = new Date()) {
  return normalizeRunId(`sitequality-${now.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`);
}

/** Precondition: nothing this check sends may look like real audience. */
export function assertAllPayloadsAreTestTraffic(requests) {
  const offenders = [];
  for (const request of requests) {
    const classified = isTestTraffic({
      source: request.source,
      email: request.email,
      body: typeof request.payload?.message === "string" ? request.payload.message : undefined,
    });
    if (!classified) offenders.push(`${request.route}: ${request.email} / ${request.source}`);
  }
  return offenders;
}

/**
 * Include the response body in the finding. Without it, an HTTP 500 from a
 * missing environment variable is indistinguishable from a broken handler, and
 * whoever reads the gate output has to go reproduce it by hand.
 */
function describeFailure(expected) {
  return (entry) => {
    const observed = entry.status ?? entry.error;
    const detail = entry.body ? ` — response: ${entry.body}` : "";
    return `${entry.endpoint} — expected HTTP ${expected}, got ${observed}${detail}`;
  };
}

async function cleanup(sql, requests) {
  const removed = [];
  const emails = [...new Set(requests.map((request) => request.email))];
  for (const [route, table] of Object.entries(ROUTE_TABLES)) {
    if (!requests.some((request) => request.route === route)) continue;
    const rows = await sql.query(`DELETE FROM ${table} WHERE email = ANY($1::text[]) RETURNING id`, [emails]);
    if (rows.length > 0) removed.push(`${table}: ${rows.length}`);
  }
  for (const table of SATELLITE_TABLES) {
    const columns = await tableColumns(sql, table);
    if (!columns.includes("email")) continue;
    const rows = await sql.query(`DELETE FROM ${table} WHERE email = ANY($1::text[]) RETURNING id`, [emails]);
    if (rows.length > 0) removed.push(`${table}: ${rows.length}`);
  }
  // /api/leads derives a form_submit funnel event from the lead it just wrote.
  // It is born is_test = true, so it never reaches a report — but "cleaned up"
  // has to mean every row the run caused, not only the ones it posted directly.
  const markers = [...new Set(requests.map((request) => request.source))];
  const events = await sql.query(`DELETE FROM funnel_events WHERE campaign_source = ANY($1::text[]) RETURNING id`, [markers]);
  if (events.length > 0) removed.push(`funnel_events: ${events.length}`);
  return removed;
}

export const leadFormValidation = {
  id: "lead-form-validation",
  title: "Lead form endpoints reject invalid input",
  blocking: true,
  async run(context) {
    const runId = runIdFor(context.now);
    const summary = await runSubmissionSmoke({
      baseUrl: context.target.origin,
      execute: true,
      allowRemote: true,
      verifyDb: false,
      invalidPayload: true,
      routes: ["contact", "subscribe", "leads", "members"],
      runId,
      timeoutMs: 15_000,
      json: false,
    });

    const findings = summary.httpResults.filter((entry) => !entry.ok).map(describeFailure(400));

    return verdict(
      "lead-form-validation",
      "Lead form endpoints reject invalid input",
      true,
      findings,
      `all ${summary.httpResults.length} form endpoint(s) reject invalid input with HTTP 400 (no rows written)`,
      `${findings.length} form endpoint(s) mishandled an invalid payload`,
      { target: context.target.origin, wrote: false },
    );
  },
};

export const leadFormSubmission = {
  id: "lead-form-submission",
  title: "Lead form end-to-end submission",
  blocking: true,
  async run(context) {
    const { target } = context;
    if (!target.writesAllowed) {
      return skip(
        "lead-form-submission",
        "Lead form end-to-end submission",
        true,
        `write-path checks are disabled against production (${target.origin}) so a gate run can never manufacture a lead; run with --target local against a built site, or pass --allow-write to send test-traffic-marked submissions and delete them afterwards`,
      );
    }

    const runId = runIdFor(context.now);
    const requests = buildSmokeRequests({ runId, routes: ["contact", "subscribe", "leads", "members"] });
    const unmarked = assertAllPayloadsAreTestTraffic(requests);
    if (unmarked.length > 0) {
      return fail(
        "lead-form-submission",
        "Lead form end-to-end submission",
        true,
        "refused to submit: a payload would not be classified as test traffic",
        unmarked.map((entry) => `${entry} is not matched by scripts/test-traffic-lib.mjs; sending it would pollute the funnel numbers`),
      );
    }

    const { sql, reason } = await openDatabase();
    const summary = await runSubmissionSmoke({
      baseUrl: target.origin,
      execute: true,
      allowRemote: true,
      verifyDb: false,
      invalidPayload: false,
      routes: ["contact", "subscribe", "leads", "members"],
      runId,
      timeoutMs: 15_000,
      json: false,
    });

    const findings = summary.httpResults.filter((entry) => !entry.ok).map(describeFailure(201));

    if (!sql) {
      // Rows were created and cannot be verified or removed. Never call that a pass.
      return fail(
        "lead-form-submission",
        "Lead form end-to-end submission",
        true,
        `submitted to ${target.origin} but could not verify or clean up`,
        [
          ...findings,
          `DATABASE_URL unavailable (${reason}) — the run id "${runId}" rows are still present and must be removed with npm run newsroom:cleanup-smoke-records`,
        ],
        { runId, wrote: true, cleanedUp: false },
      );
    }

    // Every row must have been born flagged, by the capture path, not by us.
    const unflagged = [];
    for (const request of requests) {
      const table = ROUTE_TABLES[request.route];
      const columns = await tableColumns(sql, table);
      const rows = await sql.query(`SELECT id FROM ${table} WHERE email = $1`, [request.email]);
      if (rows.length === 0) {
        findings.push(`${table}: no row landed for ${request.route} (${request.email})`);
        continue;
      }
      if (!columns.includes("is_test")) {
        findings.push(`${table} has no is_test column; test traffic cannot be excluded by construction`);
        continue;
      }
      const leaked = await sql.query(
        `SELECT id FROM ${table} WHERE email = $1 AND ${realTrafficSql(table, columns)}`,
        [request.email],
      );
      if (leaked.length > 0) unflagged.push(`${table}: ${leaked.length} row(s) from this run count as REAL audience`);
    }
    findings.push(...unflagged);

    const removed = await cleanup(sql, requests);

    return verdict(
      "lead-form-submission",
      "Lead form end-to-end submission",
      true,
      findings,
      `all 4 funnel forms accepted a submission, flagged it as test traffic, and the rows were deleted (${removed.join(", ") || "nothing left to delete"})`,
      `${findings.length} problem(s) submitting the funnel forms`,
      { runId, target: target.origin, wrote: true, cleanedUp: true, removed },
    );
  },
};
