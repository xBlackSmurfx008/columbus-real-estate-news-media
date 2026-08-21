# CMO/CSO Directives

Weekly growth directives written by the CMO/CSO routine (Mondays 07:00 ET) after
reviewing KPIs against the sales principles (`.claude/skills/cren-sales`).

Owner policy (live instruction, 2026-08-17): directives are built immediately,
without waiting for approval. The CMO routine acts as owner-operator: it writes
the directive, implements it, and reports what shipped. The owner reviews
post-build and can reverse anything in the directive file or by instruction.
Progress is tracked in `directives/<date>-progress.md`. The approval checkboxes
below remain for the owner to flag changes, not to gate work.

File format: `YYYY-MM-DD-cmo.md`

```markdown
# CMO Directive — YYYY-MM-DD

## KPI snapshot
(paste of `node frontend/scripts/kpi-report.mjs --window 7`)

## What worked / what stalled
(each claim tied to a number from the snapshot)

## Directives (prioritized)
### P1 — <title>
- Why: <which sales principle / KPI gap>
- Definition of done: <measurable>
### P2 — ...
### P3 — ...

## Owner approval
- [ ] Approved
- [ ] Changes requested: <notes>
```
