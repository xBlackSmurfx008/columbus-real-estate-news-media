---
id: 2026-09-25-p3b-prove-lead-alert
directive: 2026-09-25-cmo.md#p3
priority: P3
status: open
assignee: owner
blocked_by: [2026-09-25-p1a-connect-deploy-path]
created: 2026-09-25
due: 2026-10-02
attempts: 0
merge_policy: owner
pr:
verified_by:
---
# Confirm a new lead actually alerts you

## Goal
The next real lead reaches you within minutes, not three weeks.

## Context
- The Sep 5 lead sat unanswered for twenty days, which suggests the alert
  never reached a channel you watch (`directives/2026-09-25-cmo.md`, P3).
- The alert path is on `main` (`directives/2026-09-14-progress.md`, P3) and
  goes live with the deploy (card `2026-09-25-p1a-connect-deploy-path`).
- Test submissions must be flagged so they never count as real leads:
  `smoke:` source, an `@example.com` email, `is_test`
  (`frontend/docs/TEST_TRAFFIC_CONVENTION.md`).

## Scope
One flagged test submission on the live site. No code.

## Definition of done
- [ ] Submit the renter form at `/rent/find-a-home` with an `@example.com`
      email and the word `smoke` in the message.
- [ ] Write in the Log where the alert arrived (email, Telegram, or nowhere)
      and how many minutes it took.
- [ ] If it arrived nowhere, set `status: blocked` with
      `blocked_reason: lead alert not received`; the dispatcher will open an
      engineering card to trace it.

## Verification
The Log names the channel and the delay.

## Stop and escalate if
- The form does not submit. Note the error in the Log.

## Log
- 2026-09-25 — cmo — created from directive P3(c).
