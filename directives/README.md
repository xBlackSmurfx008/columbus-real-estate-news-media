# CMO directives

The weekly CMO review (`frontend/prompts/CLAUDE_CMO_WEEKLY.md`, Mondays 07:00 America/New_York) reads the KPI
scripts and the directive event log, updates the lifecycle of every open item, and writes one directive file per week.
It directs. It does not build.

## Who does what

| Work | Done by | Approval |
|---|---|---|
| Measure, diagnose, open/close items, ask owner questions | Weekly CMO review | none needed; it only writes files in `directives/` |
| Engineering directives | CTO executor (`frontend/prompts/CLAUDE_CTO_EXECUTOR.md`), one `[cto:<item>]` pull request per item | the owner merging the pull request |
| Credentials, money, Vercel/DNS/provider configuration, outreach, replying to people, unit economics, policy | Owner | answering in the directive file |
| Sources, images, story selection | Newsroom routine and owner | the editorial gate |

Until the executor is scheduled (see its gate), engineering directives are built by an attended session or the owner.
The 2026-08-17 "build immediately" policy is superseded: an unattended routine never builds, and the pull-request
merge is the approval.

## Item lifecycle

State lives in `directives/events/`, an append-only log of one JSON file per change. Routines add files and never
edit old ones, so concurrent runs cannot conflict. `node frontend/scripts/directive-state.mjs` folds the log into the
current state; `--json` gives machine output; the command exits 1 on any invalid event.

- Engineering: `proposed → in_build → shipped → verified → closed`, with `blocked` and `dropped`. `shipped` needs a
  pull request or commit as evidence; `verified` needs a passing check or a record.
- Owner: `queued → asked → answered → closed`, with `parked`. Every question is one yes/no or one number, with its
  cost of delay and the default applied if unanswered for 28 days.

Limits enforced by the fold:
- at most 3 owner questions at `asked`;
- at most 3 active engineering directives;
- an engineering item that has not changed in 14 days is flagged to be redefined, split, or dropped, never re-issued
  unchanged.

The repository is public: no names, emails, or phone numbers anywhere. Refer to leads as `lead #<id>`.

## Stage scorecard (proposed 2026-09-26; the owner may change any target)

| Metric | Baseline week of 2026-09-26 | 90-day target | Tripwire |
|---|---|---|---|
| Real weekly unique visitors | 56 | 150 | under 90 by 2026-11-07: stop treating search as the growth engine |
| Articles published per week | 1 | 4 | under 2 for 2 weeks: the photo decision goes to the top of the owner queue |
| Seller conversations started, inbound plus outbound | 0 | 3 cumulative | 0 by day 45: change the channel or the offer |
| Real leads answered within 1 business day | 0 of 1 | 100% | any lead older than 2 business days is the first line of the email |
| Article CTA impressions to funnel visits | unmeasured | 1.5% | under 0.5% on 500 or more impressions: revise CTA placement or mix |
| Owned audience, subscribers plus members | 3 | 50 | under 15 by day 45: revisit how signup is offered |
| Paid outbound clicks and affiliate programs joined | 0 and 0 | at least 1 program | clicks are not revenue until a program is joined |

## Weekly file format

File name `YYYY-MM-DD-cmo.md`, dated the Monday of the run. Earlier files in this folder used an older daily format;
they are history, not state.

```markdown
# CMO Directive — YYYY-MM-DD

Window: <start> to <end> America/New_York. Inputs: `newsroom:scorecard` exit <n>, `kpi-report` exit <n>
(<Report status line>), state hash <before> → <after>.

## Numbers
| Metric | This week | Prior week | Source |
|---|---|---|---|
(only values the scripts printed this run; otherwise UNMEASURED)

## What moved and what did not
(each claim labeled Observation or Hypothesis and tied to a number above)

## Binding constraint
(one sentence, plus the stage arithmetic)

## Owner decisions
1. `<item>`: <question> Cost of delay: <…>. Default after 28 days: <…>.

## Engineering directives
### P1 — <title> (`<item>`, <status>)
- Why: <KPI gap and sales principle>
- Definition of done: <checkable by a reviewer>
- Verify: <the check next week's run will execute>

## Closed, dropped, verified, or handed off this week
(one line each, with the reason and the evidence)

## Owner answers
(Owner: write one line per item, for example `owner-seller-channel: no`. The next run records it.)
- [ ] Changes requested: <notes>
```
