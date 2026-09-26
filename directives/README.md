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

Owner policy (live instructions, 2026-08-17 and 2026-09-26): directives never
wait for owner approval, and the owner gets updates, not approval requests.
Agents open pull requests for ready cards right away. Code still needs a human
merge before it reaches `main`, except docs-only cards marked
`merge_policy: auto_after_green`. To stop a directive, tick "Pause" in its
Owner override section; the dispatcher then skips every card of that directive.

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

## Owner override (optional; no approval needed)
- [ ] Pause this directive: <notes>
```

Directives written before 2026-09-26 carry an "Owner approval" section instead;
for those, a ticked "Changes requested" box means the same as "Pause".
