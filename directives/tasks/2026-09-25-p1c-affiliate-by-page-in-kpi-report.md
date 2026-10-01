---
id: 2026-09-25-p1c-affiliate-by-page-in-kpi-report
directive: 2026-09-25-cmo.md#p1
priority: P1
status: open
assignee: cren-engineer
blocked_by: []
created: 2026-09-25
due: 2026-10-02
attempts: 0
merge_policy: owner
pr:
verified_by:
---
# Show affiliate clicks by page and paid status in the weekly KPI report

## Goal
The CMO's weekly KPI snapshot shows which pages produce outbound clicks and
whether any click was monetized, so the CMO stops reading unpaid clicks as
revenue.

## Context
- Capture already records the page. `affiliate_clicks.path` is written by
  `frontend/lib/affiliate-clicks.ts`, and
  `npm run newsroom:affiliate-report -- --window 7` already groups clicks by
  page, area, and paid status (`frontend/scripts/affiliate-report-lib.mjs`).
- The KPI report (`frontend/scripts/kpi-report.mjs`, the query that selects
  `partner_slug, COUNT(*)`) prints clicks by partner only. It is the only
  report the CMO routine reads, so directive P1(d) was re-issued for work that
  had already shipped.
- Run on 2026-09-26, the affiliate report showed 24 real clicks, all from
  `/housing-search`, 0 through a paying link, and every program
  `unconfigured`.

## Scope
`frontend/scripts/kpi-report.mjs`, plus a test under `frontend/tests/`. Reuse
the query helpers in `frontend/scripts/affiliate-report-lib.mjs`; do not
write a second copy of the grouping logic.

## Constraints
- Keep the existing report sections and their order. Add, don't reshape; the
  CMO pastes this output verbatim.
- Keep the shared test-traffic predicate (`scripts/test-traffic-lib.mjs`).

## Definition of done
- [ ] The KPI report's affiliate section prints a `By page` list (top 10
      pages by clicks) under the existing by-partner list.
- [ ] The section prints one line with paid clicks vs. total, and states
      plainly when no affiliate program is active.
- [ ] A unit test covers the new formatting, including the empty-window case.
- [ ] `npm run lint` passes and the new test passes under
      `node --experimental-strip-types --test`.

## Verification
Run the new test. If `DATABASE_URL` is available to the verifier, run
`node scripts/kpi-report.mjs --window 7` and confirm the `By page` list
matches `npm run newsroom:affiliate-report -- --window 7`.

## Stop and escalate if
- The change would need a schema migration. It should not; `path` exists.

## Log
- 2026-09-25 — cmo — created from directive P1(d).
- 2026-09-26 — workflow setup — rescoped: capture and a by-page report already
  exist; the gap is the KPI report only.
