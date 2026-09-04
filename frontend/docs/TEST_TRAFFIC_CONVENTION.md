# Test-traffic convention

**Every smoke test, verification run, and seeded fixture MUST be separable from
real audience by construction.** Not by remembering to filter it out later.

Background: on 2026-09-04 an audit found that every conversion record the site
had ever captured — 8 subscribers, 5 contacts, 2 leads, 8 affiliate clicks —
was our own CRM smoke testing, and that two consecutive weekly reviews had
reported it as audience growth. The KPI report carried its own narrow filter
that only knew the string `codex-smoke:`.

## The rule

When you write a record to `subscribers`, `contacts`, `leads`, `members`,
`consent_events`, `affiliate_clicks`, or `funnel_events` as part of a test, do
**all three** of these:

1. **Source**: prefix the `source` / `campaign_source` / `source_route` value
   with `smoke:` — e.g. `smoke:rent-find-a-home`.
2. **Email**: use an address at `@example.com` (RFC 2606 reserves it).
3. **Flag**: set `is_test = true` on the row.

Any one of the three is enough for the record to be excluded. Doing all three
means the record stays identifiable even if a column is later dropped or a row
is copied between tables.

## Where the rule lives

One file: [`scripts/test-traffic-lib.mjs`](../scripts/test-traffic-lib.mjs).

It exports the patterns, the JS classifier `isTestTraffic({source, email, body,
flagged})`, and the SQL builders `testTrafficSql(table)` /
`realTrafficSql(table)`. **Nothing else may define its own rule.**

- **Capture** — `/api/subscribe`, `/api/contact`, `/api/leads`, `/api/members`,
  `/api/funnel/event`, and the `/go/<key>` outbound redirect — calls
  `isTestTraffic(...)` and stores the result in `is_test` as the row is created.
  For an outbound click the marker rides on the link itself:
  `/go/<key>?source=smoke:<what-you-are-testing>`, which lands in
  `affiliate_clicks.campaign_source`. `/go` additionally flags an automated
  user agent, and records which of the two rules excluded the row in
  `exclusion_reason`.
- **Reporting** — `scripts/kpi-report.mjs` — calls
  `resolveTestTrafficPredicates(sql, table)` and filters every total with it.
- **Sweeping** — `scripts/cleanup-smoke-records.mjs` — uses the same predicate
  to flag (default) or delete (opt-in, prints rows first).

If you add a new audience table, register it in `TEST_TRAFFIC_TABLES` in that
file and give it an `is_test BOOLEAN NOT NULL DEFAULT false` column.

## What the predicate already catches

Beyond the convention above it recognises the historical markers so nothing
already in production leaks into a report:

- sources containing a word-bounded `test` / `testing` / `smoke` / `e2e` /
  `qa` / `synthetic` / `fixture` / `sandbox` / `dummy` / `staging` / `seed`
- sources beginning `smoke-`, `codex-smoke-`, `crm-`, or those with `:`/`_`
- emails at `@example.com|org|net`, `@test`, `@invalid`, `@localhost`, any
  `.test`/`.invalid`/`.example` TLD, `codex.smoke+…`, or `+test@`-style tags
- message bodies containing "safe to ignore", "e2e test", "smoke test",
  "crm sync test", "integration test", "production crm"

The `crm-` source prefix is reserved for testing as a result of this audit. A
real CRM integration must not name its source `crm-something`.

## Flag, don't delete

`is_test = true` keeps the row queryable, so an audit can always answer "what
did we run, and when". Deletion is available (`--delete`) but prints every row
first and needs an explicit confirmation flag.

## Verifying

```
DATABASE_URL=... node scripts/cleanup-smoke-records.mjs            # dry run: what matches
DATABASE_URL=... node scripts/kpi-report.mjs --window 7            # what a human sees
```

A seeded `crm-test` / `@example.com` record must appear in the first and never
in the second.
