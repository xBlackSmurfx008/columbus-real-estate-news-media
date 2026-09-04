// Compatibility layer over the canonical test-traffic predicate.
//
// This module used to carry its own hand-written LIKE clauses that only knew
// about the `codex-smoke:` marker. It missed every `crm-*` / `*-test` /
// `@example.com` record in production, which is how two weekly KPI reviews came
// to report our own smoke tests as audience growth (owner plan 2026-09-04).
// The rules now live in ONE place — test-traffic-lib.mjs — and this file simply
// re-shapes them for the existing call sites.

import {
  TEST_TRAFFIC_TABLES,
  realTrafficSql,
  testTrafficSql,
  testTrafficTableDefinition,
} from "./test-traffic-lib.mjs";

export {
  SMOKE_SOURCE_PREFIX,
  SMOKE_EMAIL_DOMAIN,
  LEGACY_SMOKE_SOURCE_PREFIX,
  LEGACY_SMOKE_EMAIL_PREFIX,
  isTestTraffic,
} from "./test-traffic-lib.mjs";

/** Tables the cleanup/report tooling sweeps, in a stable order. */
export const SMOKE_TABLES = Object.fromEntries(
  Object.entries(TEST_TRAFFIC_TABLES).map(([table, definition]) => [
    table,
    {
      label: definition.label,
      marker: definition.sourceColumn ?? definition.flagColumn ?? "is_test",
      get where() {
        return testTrafficSql(table);
      },
      get nonSmokeWhere() {
        return realTrafficSql(table);
      },
    },
  ]),
);

export function smokeTableDefinition(table) {
  const definition = TEST_TRAFFIC_TABLES[table];
  if (!definition) throw new Error(`Unsupported smoke table: ${table}`);
  return SMOKE_TABLES[table];
}

export function smokeWhere(table, availableColumns = null) {
  testTrafficTableDefinition(table);
  return testTrafficSql(table, availableColumns);
}

export function nonSmokeWhere(table, availableColumns = null) {
  testTrafficTableDefinition(table);
  return realTrafficSql(table, availableColumns);
}

export function smokeCountQuery(table, availableColumns = null) {
  return `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${smokeWhere(table, availableColumns)}`;
}

export function smokeDeleteQuery(table, availableColumns = null) {
  return `DELETE FROM ${table} WHERE ${smokeWhere(table, availableColumns)} RETURNING id`;
}

/** Flag rather than delete: history stays auditable (owner plan item 2). */
export function smokeFlagQuery(table, availableColumns = null) {
  const definition = testTrafficTableDefinition(table);
  if (!definition.flagColumn) throw new Error(`Table ${table} has no flag column`);
  return `UPDATE ${table} SET ${definition.flagColumn} = true
     WHERE ${smokeWhere(table, availableColumns)}
       AND COALESCE(${definition.flagColumn}, false) = false
     RETURNING id`;
}
