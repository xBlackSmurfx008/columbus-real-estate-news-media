---
id: 2026-09-25-p2b-landmark-hook-selection-rule
directive: 2026-09-25-cmo.md#p2
priority: P2
status: open
assignee: cren-docs
blocked_by: []
created: 2026-09-25
due: 2026-10-02
attempts: 0
merge_policy: owner
pr:
verified_by:
---
# Add a tie-break rule to the newsroom prompt that favors photographable stories

## Goal
When two leads are equally newsworthy, the newsroom routine picks the one it
can actually illustrate, so fewer verified stories die at the image step.

## Context
- `briefs/2026-09-25.md` found that open-licensed documentary photos exist for
  established places (North Market: 15 Commons images; Scioto Mile; LeVeque
  Tower) while most current news is about new, unphotographed projects.
- The brief names this lever: prefer stories whose subject is an
  openly-photographed landmark *with a genuine current news hook*.
- Story selection lives in `frontend/prompts/CLOUD_ROUTINE_HANDOFF.md` and
  `frontend/prompts/ARTICLE_WRITING.md`. They are assembled into the live
  routine by `frontend/scripts/cloud-routine-instructions.mjs`, and the live
  routine's hash is recorded in `.claude/routines.md`.

## Scope
One short rule in the story-selection part of
`frontend/prompts/CLOUD_ROUTINE_HANDOFF.md` (or `ARTICLE_WRITING.md` if that
is where selection lives), plus a test assertion in
`frontend/tests/claude-routine-prompts.test.mjs`.

## Constraints
- News value comes first. The rule applies only as a tie-break and must say so.
- It must not loosen `story_match`: a landmark photo may illustrate only a
  story about that landmark. Using a nearby landmark for a different project
  stays barred.
- Do not edit `.claude/routines.md` or any live routine. Changing the live
  routine is an owner step after merge.

## Definition of done
- [ ] The prompt contains a tie-break rule that states news value first, the
      landmark preference second, and that `story_match` is unchanged.
- [ ] A test in `claude-routine-prompts.test.mjs` asserts the rule and the
      `story_match` guard are both present.
- [ ] The PR description states that the live `cre-news-newsroom` routine must
      be re-synced by the owner after merge, and that until then the rule is
      not in effect.
- [ ] `node --experimental-strip-types --test tests/claude-routine-prompts.test.mjs` passes.

## Verification
Run the test above. Read the diff: the rule must be a tie-break only, and no
existing image rule may be removed or reworded.

## Stop and escalate if
- Selection logic is spread across several places and one rule cannot be
  added cleanly. Describe the options in the Log; do not restructure prompts.

## Log
- 2026-09-25 — cmo — created from directive P2(b).
