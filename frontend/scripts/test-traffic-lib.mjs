// Canonical test-traffic predicate for Columbus Real Estate News.
//
// ONE definition of "this record is our own testing, not a real human", shared
// by capture (Next.js API routes import this file) and reporting
// (scripts/kpi-report.mjs, scripts/cleanup-smoke-records.mjs).
//
// Background (owner plan 2026-09-04, item 2): every conversion record the site
// had ever captured was our own CRM smoke testing, and two consecutive weekly
// reviews reported it as audience growth. Exclusion therefore has to happen by
// construction — the same predicate at write time and at read time — not by a
// hand-maintained list of strings in the report.
//
// Convention future smoke tests MUST follow (see docs/TEST_TRAFFIC_CONVENTION.md):
//   1. source / campaign_source starts with `smoke:`  (e.g. `smoke:rent-find-a-home`)
//   2. email is at `@example.com`
//   3. where the table has one, set `is_test = true`
// Any ONE of those is enough to be excluded. The regexes below also catch the
// historical `crm-*`, `codex-smoke:`, `*-test`, `*-smoke*` markers so nothing
// already in production leaks into a report.

/** Marker future smoke tests must use for the source/campaign field. */
export const SMOKE_SOURCE_PREFIX = "smoke:";
/** Marker future smoke tests must use for the email domain. */
export const SMOKE_EMAIL_DOMAIN = "example.com";
/** Legacy marker kept so historical rows stay classified. */
export const LEGACY_SMOKE_SOURCE_PREFIX = "codex-smoke:";
export const LEGACY_SMOKE_EMAIL_PREFIX = "codex.smoke+";

// POSIX-ERE strings, used verbatim by Postgres (`~*`) and by JS (`new RegExp`).
// Keeping them as one string per concept is what makes capture and reporting
// provably identical.

/** Source / campaign values that mean "we generated this ourselves". */
export const TEST_SOURCE_PATTERN =
  "(^|[^a-z0-9])(tests?|testing|smoke|e2e|qa|synthetic|fixture|sandbox|dummy|staging|seed)([^a-z0-9]|$)" +
  "|^(smoke|codex-smoke|crm)[-:_]";

/** Email addresses reserved for testing (RFC 2606 domains + plus-tagged tests). */
export const TEST_EMAIL_PATTERN =
  "@example\\.(com|org|net)$" +
  "|@(test|invalid|localhost)$" +
  "|\\.(test|invalid|example)$" +
  "|^codex\\.smoke\\+" +
  "|\\+(test|smoke|e2e|qa)[a-z0-9._-]*@";

/** Message bodies our own smoke runs write. Deliberately phrase-specific. */
export const TEST_BODY_PATTERN =
  "safe to ignore" +
  "|e2e test" +
  "|smoke test" +
  "|crm sync test" +
  "|integration test" +
  "|production crm";

const sourceRe = new RegExp(TEST_SOURCE_PATTERN, "i");
const emailRe = new RegExp(TEST_EMAIL_PATTERN, "i");
const bodyRe = new RegExp(TEST_BODY_PATTERN, "i");

export function isTestSource(value) {
  return typeof value === "string" && value.trim() !== "" && sourceRe.test(value);
}

export function isTestEmail(value) {
  return typeof value === "string" && value.trim() !== "" && emailRe.test(value.trim());
}

export function isTestBody(value) {
  return typeof value === "string" && value.trim() !== "" && bodyRe.test(value);
}

/**
 * The single classifier. Capture paths call this before writing a row so the
 * row is born flagged; reporting never has to guess.
 */
export function isTestTraffic({ source, email, body, flagged } = {}) {
  if (flagged === true) return true;
  return isTestSource(source) || isTestEmail(email) || isTestBody(body);
}

/** Columns that carry the markers, per table. */
export const TEST_TRAFFIC_TABLES = {
  subscribers: { label: "Subscribers", sourceColumn: "source", emailColumn: "email", flagColumn: "is_test" },
  contacts: { label: "Contact messages", sourceColumn: "source", emailColumn: "email", bodyColumn: "message", flagColumn: "is_test" },
  leads: { label: "Leads", sourceColumn: "source", emailColumn: "email", flagColumn: "is_test" },
  members: { label: "Members", sourceColumn: "interests", emailColumn: "email", flagColumn: "is_test" },
  consent_events: { label: "Consent events", sourceColumn: "source_route", emailColumn: "email", flagColumn: "is_test" },
  affiliate_clicks: { label: "Affiliate clicks", flagColumn: "is_test" },
  funnel_events: { label: "Funnel events", sourceColumn: "campaign_source", flagColumn: "is_test" },
};

export function testTrafficTableDefinition(table) {
  const definition = TEST_TRAFFIC_TABLES[table];
  if (!definition) throw new Error(`Unsupported test-traffic table: ${table}`);
  return definition;
}

function quote(pattern) {
  return `'${pattern.replace(/'/g, "''")}'`;
}

/**
 * Build the SQL boolean expression for "this row is test traffic".
 * `availableColumns` lets callers degrade gracefully when the additive
 * migration has not run yet in a given environment.
 */
export function testTrafficSql(table, availableColumns = null) {
  const def = testTrafficTableDefinition(table);
  const has = (column) =>
    Boolean(column) && (availableColumns === null || availableColumns.includes(column));

  const clauses = [];
  if (has(def.flagColumn)) clauses.push(`COALESCE(${def.flagColumn}, false)`);
  if (has(def.sourceColumn)) clauses.push(`COALESCE(${def.sourceColumn}, '') ~* ${quote(TEST_SOURCE_PATTERN)}`);
  if (has(def.emailColumn)) clauses.push(`COALESCE(${def.emailColumn}, '') ~* ${quote(TEST_EMAIL_PATTERN)}`);
  if (has(def.bodyColumn)) clauses.push(`COALESCE(${def.bodyColumn}, '') ~* ${quote(TEST_BODY_PATTERN)}`);

  if (clauses.length === 0) return "false";
  return `(${clauses.join(" OR ")})`;
}

/** The complement: rows that count as real audience. */
export function realTrafficSql(table, availableColumns = null) {
  const predicate = testTrafficSql(table, availableColumns);
  return predicate === "false" ? "true" : `NOT ${predicate}`;
}

/** Look up which of a table's marker columns actually exist. */
export async function tableColumns(sql, table) {
  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  return rows.map((row) => row.column_name);
}

/**
 * Introspect once, then hand back both predicates for a table. This is what
 * kpi-report.mjs and cleanup-smoke-records.mjs use, so a report can never be
 * built on a looser rule than the cleanup script's.
 */
export async function resolveTestTrafficPredicates(sql, table) {
  const columns = await tableColumns(sql, table);
  return {
    table,
    columns,
    testWhere: testTrafficSql(table, columns),
    realWhere: realTrafficSql(table, columns),
  };
}
