---
id: 2026-09-25-p3a-answer-open-inquiries
directive: 2026-09-25-cmo.md#p3
priority: P3
status: open
assignee: owner
blocked_by: []
created: 2026-09-25
due: 2026-09-29
attempts: 0
merge_policy: owner
pr:
verified_by:
---
# Send the drafted renter reply and close out the contact message

## Goal
The only real lead and the only real contact message both get a human answer.

## Context
- The renter lead arrived 2026-09-05 and has been `renter / new`, Contacted 0,
  for fourteen KPI snapshots (`directives/2026-09-25-cmo.md`).
- A complete reply is already drafted in your Gmail drafts
  (`directives/2026-09-14-progress.md`, P3). It needs a quick reread because it
  mentions the delay in days, which is now longer.
- `/admin` shows a red banner for any real lead in `new` and links to the
  lead queue, where you set the status.
- The repo is public, so this card deliberately leaves out the person's name
  and details.

## Scope
Gmail and `/admin`. No code.

## Definition of done
- [ ] The drafted renter reply is updated for today's date and sent.
- [ ] In `/admin`, the lead is moved out of `new` (this writes
      `first_response_at`).
- [ ] The contact message is answered or marked closed in `/admin`.
- [ ] [KPI] The next CMO KPI snapshot shows Contacted 1 and an average first
      response time for the renter funnel.

## Verification
`/admin` shows no red unanswered-lead banner.

## Stop and escalate if
- You decide not to answer. Write "closed without reply" and the reason in
  the Log so the CMO stops carrying this item.

## Log
- 2026-09-25 — cmo — created from directive P3(a)-(b). Carried since 2026-09-14.
