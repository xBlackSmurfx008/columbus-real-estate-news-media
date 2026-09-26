# CMO/CSO Directives

Weekly growth directives written by the CMO/CSO routine after reviewing KPIs
against the sales principles (`.claude/skills/cren-sales`).

## How a directive becomes finished work

```
CMO weekly routine ──▶ directives/<date>-cmo.md  (why, what, priority)
        │
        └──────────▶ directives/tasks/<id>.md   (one card per unit of work)
                              │
Task dispatcher routine ──────┤  reads the board, spawns one agent per ready card
                              ├──▶ cren-engineer / cren-docs  → one PR per card
                              ├──▶ cren-verifier             → checks merged work
                              ├──▶ owner cards               → Gmail draft checklist
                              └──▶ directives/<date>-progress.md  (receipt)
        ▲                                                      │
        └────────── next CMO run reads the board and receipt ◀─┘
```

- Prompts: `frontend/prompts/CLAUDE_CMO_WEEKLY.md` and
  `frontend/prompts/CLAUDE_TASK_DISPATCHER.md`.
- Agents: `.claude/agents/cren-engineer.md`, `cren-docs.md`, `cren-verifier.md`.
- Card format, lifecycle, and rules: `directives/tasks/README.md`.
- Board: `npm run tasks:board` from `frontend/` (`-- --validate` to check).

A card is `done` only when its pull request has merged **and** an independent
verifier has checked every Definition-of-done item. A pull request is not
completion, and neither is a ticked box.

Owner policy (live instruction, 2026-08-17): directives are built without
waiting for approval. Agents therefore open pull requests for ready cards right
away, but those pull requests are proposals: nothing reaches `main` without the
owner's merge, except docs-only cards marked `merge_policy: auto_after_green`.
Ticking "Changes requested" below pauses every card of that directive.

File format: `YYYY-MM-DD-cmo.md`

```markdown
# CMO Directive — YYYY-MM-DD

## KPI snapshot
(paste of `node frontend/scripts/kpi-report.mjs --window 7`
 and `npm run newsroom:affiliate-report -- --window 7`)

## What worked / what stalled
(each claim tied to a number from the snapshot)

## Directives (prioritized)
### P1 — <title>
- Why: <which sales principle / KPI gap>
- Definition of done: <measurable>
- Cards: <card ids in directives/tasks/>
### P2 — ...
### P3 — ...

## Owner decisions
(only when an owner card has been open 14+ days: what, and what waiting costs)

## Owner approval
- [ ] Approved
- [ ] Changes requested: <notes>
```
