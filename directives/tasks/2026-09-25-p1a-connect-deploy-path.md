---
id: 2026-09-25-p1a-connect-deploy-path
directive: 2026-09-25-cmo.md#p1
priority: P1
status: open
assignee: owner
blocked_by: []
created: 2026-09-25
due: 2026-10-02
attempts: 0
merge_policy: owner
pr:
verified_by:
---
# Connect the Vercel project to GitHub so main deploys to production

## Goal
Every merge to `main` reaches columbusrealestatenews.com without anyone
running a manual deploy.

## Context
- The contextual CTAs, funnel tracking, and funnel-page commercial disclosure
  are complete on `main` but have never reached production. The KPI report has
  shown 0 funnel views and 0 CTA clicks on all four funnels for fifteen weekly
  snapshots in a row (`directives/2026-09-25-cmo.md`, KPI snapshot).
- No agent can fix this. Agents have no Vercel login, token, or deploy hook,
  and GitHub Actions runners are blocked at the account level
  (`directives/2026-09-14-progress.md`, P1).
- The project is `frontend` under the Vercel scope `stephen-s-projects-96d9c6b4`.

## Scope
Vercel dashboard only. No code change.

## Definition of done
- [ ] In Vercel, open Project `frontend` → Settings → Git and connect
      `xBlackSmurfx008/columbus-real-estate-news-media`, production branch
      `main`, root directory `frontend`. (Alternative: create a Deploy Hook and
      tell Claude where it is stored. Never paste the URL into the repo.)
- [ ] One production deployment of current `main` shows READY, and its
      deployment ID is added to the Log below.

## Verification
The Vercel dashboard lists a production deployment whose commit is the current
`main` head. Then card `2026-09-25-p1b-verify-conversion-layer-live` can start.

## Stop and escalate if
- The build fails on Vercel. Record the first error line in the Log and set
  `status: blocked`; the dispatcher will open an engineering card for it.

## Log
- 2026-09-25 — cmo — created from directive P1(a). Carried since 2026-09-14.
