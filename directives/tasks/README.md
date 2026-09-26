# Directive task cards

A task card is one unit of work that one assignee can finish in one pull
request (or, for the owner, one sitting). The CMO writes cards when it issues a
directive. The dispatcher routine spawns an agent for each ready card and hands
it the card **verbatim as its prompt**, so a card must stand alone: an agent
that has read nothing else in this repository should be able to finish it.

Check the board at any time from `frontend/`:

```bash
npm run tasks:board              # human-readable board
npm run tasks:board -- --validate  # exit 1 if any card is malformed
npm run tasks:board -- --json      # machine-readable, for routines
```

## Lifecycle

```
open ──dispatcher claims──▶ claimed ──agent opens PR──▶ in_review ──PR merged + verifier passes──▶ done
  ▲                            │                            │
  └──── verifier fails ────────┴──── attempts < 2 ──────────┘
                               │
                               └── attempts reach 2, or needs something only the owner has ──▶ blocked
```

- `open` — ready to be picked up once every `blocked_by` card is `done`.
- `claimed` — a dispatcher run spawned an agent for it (log records the run).
- `in_review` — work is in a pull request (`pr:` is required). Nothing is
  `done` because a PR exists.
- `done` — the PR is merged **and** an independent `cren-verifier` agent checked
  every Definition-of-done item and recorded itself in `verified_by:`. Items
  tagged `[KPI]` are confirmed by the next CMO KPI snapshot instead.
- `blocked` — needs `blocked_reason:` or `blocked_by:`. Two failed attempts
  always end here; the dispatcher never loops a third time.
- `dropped` — superseded or no longer worth doing; needs `dropped_reason:`.

Owner cards (`assignee: owner`) never get an agent. They go into the owner
email as a short checklist. When the owner finishes one, they (or any agent
they ask) tick its boxes, set `status: done`, and set `verified_by: owner`.

## Assignees

| Assignee | Does | Never does |
|---|---|---|
| `cren-engineer` | Code, scripts, tests, analytics, templates in `frontend/`. | Deploy, touch production data, use credentials. |
| `cren-docs` | Runbooks, prompts, policies, owner instructions. | Weaken editorial or image policy; change a routine's live configuration. |
| `owner` | Anything needing credentials, money, a real person, or a judgement call only the owner can make. | — |

`cren-verifier` is not an assignee. It checks finished work and cannot be the
agent that did it.

## Card format

File name: `directives/tasks/<id>.md`. The `id` is
`<directive date>-p<1-3><letter>-<slug>`, for example
`2026-09-25-p1c-affiliate-by-page-in-kpi-report`.

```markdown
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
# Imperative title the owner would understand

## Goal
One sentence: the outcome, not the activity.

## Context
The facts the agent needs, each with where it came from (KPI snapshot line,
brief, file path). Include what has already been tried or already exists.

## Scope
Files and areas the agent may change. Anything outside is out of scope.

## Constraints
Hard rules for this task, on top of the standing rules every agent gets.

## Definition of done
- [ ] Objectively checkable item.
- [ ] [KPI] Item only a future KPI snapshot can confirm.

## Verification
Exact commands a verifier runs, and what passing looks like.

## Stop and escalate if
Conditions where the agent must stop, set `status: blocked`, write
`blocked_reason:`, and explain in the Log instead of improvising.

## Log
- 2026-09-25 — cmo — created from directive P1.
```

## Rules for writing a good card

1. **First check that it isn't already done.** Search the code and run the
   report before writing the card. The Context section says what exists.
2. **One assignee, one PR.** If a directive needs the owner and an agent, it
   becomes two cards joined by `blocked_by`.
3. **Done must be checkable by someone else.** "Improve X" is not an item.
   "`npm run newsroom:kpi` prints a `By page` section" is.
4. **Name the stop conditions.** Agents fail safely when the card says where
   the edge is.
5. **`merge_policy: auto_after_green`** is allowed only for `cren-docs` cards
   that do not change policy, prompts, or routine behavior. Everything else is
   `owner`.
6. **The Log is append-only.** Every actor adds a dated line; nobody edits
   earlier lines.
