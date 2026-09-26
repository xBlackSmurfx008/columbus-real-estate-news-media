---
id: 2026-09-25-p2a-owner-photo-intake-runbook
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
# Write the owner photo intake runbook

## Goal
The owner can take or commission a photo of a story site and hand it to the
newsroom in a form that passes the image contract on the first try.

## Context
- Verified stories are being held only for lack of a rights-cleared,
  story-matching photograph. Open-licensed photos exist for old landmarks, not
  for the new projects that are actually news (`briefs/2026-09-25.md`, "This
  run's material finding"). The Worthington referendum story is fully
  verified and held `NEEDS_IMAGE` (`briefs/2026-09-24.md`).
- The image contract is in `frontend/docs/IMAGE_POLICY.md` and the
  `cloud_image_asset` block in `frontend/prompts/CLOUD_ROUTINE_HANDOFF.md`
  (fields include source, rights, hashes, caption, and a visual-review receipt
  with `story_match`).
- Paid image generation, AI art, and stock placeholders are barred. This
  runbook must not open a path around that.

## Scope
New file `frontend/docs/OWNER_PHOTO_INTAKE.md`. A one-line pointer to it from
`frontend/docs/IMAGE_POLICY.md` is allowed. Nothing else.

## Constraints
- Write for the owner, not an engineer: plain steps, phone-camera friendly.
- Map every step to the exact `cloud_image_asset` field it satisfies. Do not
  invent fields; quote them from the handoff prompt.
- Say where photo files go (path and naming) and where they must never go
  (no credentials, no personal data of bystanders in captions).

## Definition of done
- [ ] `frontend/docs/OWNER_PHOTO_INTAKE.md` exists and covers: what to shoot,
      how to record date and location, the rights statement the owner signs,
      file naming and repo location, and how the newsroom routine picks it up.
- [ ] Every `cloud_image_asset` field in `CLOUD_ROUTINE_HANDOFF.md` is covered
      by a step, with a table mapping step to field.
- [ ] A one-page owner summary (under 200 words) is at the top of the file,
      suitable for pasting into the owner email.
- [ ] No policy text in `IMAGE_POLICY.md` or the prompts is weakened; the
      diff touches only the new file and at most one pointer line.

## Verification
Read the runbook against `CLOUD_ROUTINE_HANDOFF.md` field by field. Run
`git diff --stat origin/main...` and confirm only the allowed files changed.

## Stop and escalate if
- The handoff contract cannot accept an owner-supplied photo at all without a
  policy change. Say which rule blocks it; do not change the rule.

## Log
- 2026-09-25 — cmo — created from directive P2(a).
