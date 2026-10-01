---
id: 2026-09-25-p1b-verify-conversion-layer-live
directive: 2026-09-25-cmo.md#p1
priority: P1
status: open
assignee: cren-engineer
blocked_by: [2026-09-25-p1a-connect-deploy-path]
created: 2026-09-25
due: 2026-10-02
attempts: 0
merge_policy: owner
pr:
verified_by:
---
# Prove the conversion layer is live on production and fix what the check finds

## Goal
Production article and funnel pages show the contextual CTA and the commercial
disclosure, confirmed by the site's own production checker.

## Context
- Starts only after the owner connects the deploy path (card
  `2026-09-25-p1a-connect-deploy-path`).
- `npm run verify:site -- --target production` is the production checker
  (`frontend/scripts/verify-site.mjs`). On 2026-09-14 it reported the
  `disclosure-funnel` blocking finding on `/sell/your-home`,
  `/sell/investment-property`, `/invest/deploy-capital` and
  `/rent/find-a-home` because production ran an older build
  (`directives/2026-09-14-progress.md`).
- The CTA and disclosure code is already on `main`: `FunnelDisclosure`,
  `PageviewTracker`, `FunnelTracker` (same record). Do not rebuild it.

## Scope
Read-only checks against the public production site. Code changes in
`frontend/` only if the checker finds a real defect on the new build.

## Constraints
- Use only the public website. No database, Vercel, or admin credentials.
- Any test event you cause must follow `frontend/docs/TEST_TRAFFIC_CONVENTION.md`
  (`smoke:` source, `@example.com` email, `is_test`).

## Definition of done
- [ ] `npm run verify:site -- --target production` output shows no
      `disclosure-funnel` finding; the output is pasted into the PR or Log.
- [ ] The contextual CTA is present in the served HTML of at least one live
      article for each funnel taxonomy (seller, investor-seller, capital,
      renter); the four URLs checked are listed in the Log.
- [ ] Any defect found on production has a fix PR, or a new card if it is
      outside this card's scope.
- [ ] [KPI] The next CMO KPI snapshot shows at least one `funnel_view`.

## Verification
Re-run `npm run verify:site -- --target production` and fetch the four logged
article URLs; each must contain the CTA markup.

## Stop and escalate if
- Production still serves the old build (no CTA anywhere). Set
  `status: blocked`, `blocked_reason: production not on current main`.
- A fix would require credentials or production configuration.

## Log
- 2026-09-25 — cmo — created from directive P1(b)-(c).
