# NOTES

As of: 2026-08-29
Project: Columbus Real Estate News frontend
Working directory: `/Users/mr.adams/dev/cren-cloud-migration/frontend`

## Active Goal Contract

Objective: complete a comprehensive ColumbusRealEstateNews.com legal, policy, product, sales, advertising, profile-backend, automation, and launch-readiness package using current evidence.

Current owner direction:

- No planning-only gates remain for work this agent can execute in the repo, database, and deployment flow.
- Do not claim attorney approval, payment-processor readiness, SMS/calling readiness, securities compliance, broker compliance, or 48-hour monitoring completion unless those facts become true.
- Preserve a truth standard: done means implemented, migrated, verified, deployed, or explicitly listed as a post-launch owner/vendor task.

Allowed work:

- Code, docs, routes, forms, APIs, migrations, local tests, production database migrations, production deploy, production smoke, smoke cleanup, and readiness audits.
- Advisory strategy, business checklists, media-kit/rate-card posture, insertion-order templates, backend profile requirements, and automation roadmaps.

Not claimed:

- Attorney-approved legal documents.
- Final payment, tax, refund, dispute, billing, or SMS/calling operations.
- Final audience scale beyond verified production analytics.
- Securities, lending, brokerage, insurance-referral, investment-adviser, or capital-introduction compliance.

## Current State

- `/goal` checklist: `docs/GOAL_100_COMPLETION_CHECKLIST_2026-08-29.md`.
- Legal/policy launch checklist: `docs/LEGAL_POLICY_LAUNCH_GOAL_CHECKLIST_2026-08-29.md`.
- Current-state legal/policy matrix: `docs/LEGAL_POLICY_CURRENT_STATE_MATRIX_2026-08-29.md`.
- Competitive research and launch plan: `docs/COMPETITIVE_RESEARCH_AND_LAUNCH_PLAN_2026-08-29.md`.
- Backend profile and consent requirements: `docs/BACKEND_PROFILE_AND_CONSENT_REQUIREMENTS_2026-08-29.md`.
- Advertising, sales, and insertion-order plan: `docs/ADVERTISING_SALES_AND_INSERTION_ORDER_PLAN_2026-08-29.md`.
- User request coverage matrix: `docs/USER_REQUEST_COVERAGE_MATRIX_2026-08-29.md`.
- Verified audience/media-kit baseline: `docs/CREN_VERIFIED_AUDIENCE_AND_MEDIA_KIT_BASELINE_2026-08-29.md`.
- First 50 advertiser prospect list: `docs/FIRST_ADVERTISER_TARGET_LIST_2026-08-29.md`.
- Advertiser outreach package: `docs/CREN_ADVERTISER_OUTREACH_PACKAGE_2026-08-29.md`.
- Advertiser outreach tracker: `docs/CREN_ADVERTISER_OUTREACH_TRACKER_2026-08-29.csv`.
- Post-launch monitoring log: `docs/POST_LAUNCH_MONITORING_LOG_2026-08-29.md`.
- Standalone owner-execution insertion-order template: `docs/CREN_INSERTION_ORDER_OWNER_EXECUTION_TEMPLATE_2026-08-29.md`.

## Product Work Completed

- Public policy library exists through `lib/policy-pages.ts` and `components/policy-page.tsx`.
- Policy routes exist for `/policies`, `/terms`, `/privacy`, `/cookies`, `/advertising-terms`, `/sponsored-content-policy`, `/fair-housing`, `/listing-quality-policy`, `/profile-claim-policy`, `/lead-disclosure`, `/ai-policy`, `/accessibility`, `/copyright`, `/submissions-policy`, and `/communications-policy`.
- Footer, human site map, XML sitemap, and release audit include the policy routes.
- Public media-kit/rate-card route exists at `/advertise/media-kit`.
- Public self-service advertising intake route exists at `/advertise/self-service`.
- Public profile-owner hub exists at `/profiles`.
- Public profile-claim route exists at `/profiles/claim`.
- Admin commercial operations dashboard exists at `/admin/commercial`.
- Admin commercial API exists at `/api/admin/commercial`.
- Advertising page links to media kit, self-service advertising, and profile-owner routes.
- Policy pages use owner-execution language, not stale draft-gate language.

## Backend Work Completed

- `lib/compliance/policy-versions.ts` defines policy versions.
- `lib/compliance/consent-events.ts` writes normalized consent events.
- `lib/compliance/intake-records.ts` mirrors profile, apartment, and advertising intakes.
- `scripts/migrate-compliance-layer.mjs` creates compliance tables and seeds policy versions.
- `scripts/migrate-profile-advertising-layer.mjs` creates business profile, apartment profile, profile claim, advertiser, campaign, ad asset, report, substantiation, insertion-order, and lead-routing tables.
- `scripts/export-commercial-report.mjs` exports a commercial operations report with PII masking by default.
- `scripts/reconcile-live-editorial-review-jobs.mjs` reconciles already-live queued review rows.
- `scripts/smoke-records-lib.mjs` and cleanup logic include `consent_events`.
- Contact, subscribe, member, lead, advertising, and profile-claim flows send consent metadata and write consent events when tables exist.
- The production build path uses `next build --webpack` because Vercel's remote Turbopack build failed on Workflow loader resolution.
- `@workflow/next` is pinned as a direct dependency to keep the Workflow Next integration explicit.
- `/contact` uses the Next 16 Promise-shaped `searchParams` contract.

## Production Database State

- `.env.production.local` was pulled from Vercel production and is ignored by `.gitignore`.
- Compliance migration ran successfully against the production Neon database.
- Profile/advertising migration ran successfully against the production Neon database.
- `policy_versions` contains 14 `owner_execution_version` rows with owner-execution approval metadata.
- 13 already-live editorial review rows were reconciled to `AUTO_PUBLISHED`; no blocked rows were found.
- Controlled smoke records were deleted from contacts, subscribers, leads, members, and consent events.
- Final production readiness audit on 2026-08-29 at 14:08:40 UTC returned `ok: true`, `findings: []`, 87 live articles, and zero smoke rows.
- Production deploy succeeded on Vercel as `dpl_AFrXs6nu7Un6v18W9LV3wiH319c2`.
- Deployment URL: `https://frontend-rg9mbzui9-stephen-s-projects-96d9c6b4.vercel.app`.
- Aliases were assigned to `https://columbusrealestatenews.com` and `https://www.columbusrealestatenews.com`.
- Public route checks returned 200 for `/advertise/media-kit`, `/advertise/self-service`, `/profiles`, `/profiles/claim`, `/policies`, and `www` `/policies`.
- Production submission smoke passed against `https://columbusrealestatenews.com` with run id `20260829t144117-1084ae87`; contacts id 10, subscribers id 19, leads id 10, and members id 9 were verified.
- Post-smoke cleanup deleted 10 controlled rows: 1 contact, 2 subscribers, 1 lead, 1 member, and 5 consent events.
- Final post-deploy production readiness audit on 2026-08-29 at 14:41:37 UTC returned `ok: true`, `findings: []`, 87 live articles, and zero smoke rows.
- Full production release audit passed against `https://columbusrealestatenews.com`: 150 checked pages, 86 area hubs, 36 screenshots, zero failures.
- Launch package committed as `f1d6a30 feat: launch CREN commercial readiness package`.
- Launch package pushed to `origin/feat/site-map`.
- Immediate post-launch monitoring at 2026-08-29 16:12 UTC caught alias drift: `columbusrealestatenews.com` pointed to `dpl_5eiL97PTfp4iGWsEQ9DhgZApoxWv`, where new launch routes returned 404.
- Apex and `www` aliases were corrected back to verified deployment `dpl_AFrXs6nu7Un6v18W9LV3wiH319c2`.
- Post-correction route checks returned 200 for `/advertise/media-kit`, `/advertise/self-service`, and `/profiles/claim`.
- Post-correction production readiness audit at 2026-08-29 16:12:58 UTC returned `ok: true`, `findings: []`, and zero smoke rows.
- Recent Vercel production error-log commands returned no error entries.
- First-wave advertiser outreach package and tracker are ready, but no external outreach was sent because no connected sending account/CRM was available in this session.
- Post-push recheck at 2026-08-29 16:25 UTC confirmed `columbusrealestatenews.com` still pointed to `dpl_AFrXs6nu7Un6v18W9LV3wiH319c2`; `/advertise/media-kit`, `/advertise/self-service`, and `/profiles/claim` returned 200.

## Verification Already Passed

- `npm run lint`
- `npm run build`
- `npm run test:image-pipeline`
- `npm run release:audit-local`
- `npm run smoke:submissions -- --json`
- `node --check scripts/migrate-compliance-layer.mjs`
- `node --check scripts/migrate-profile-advertising-layer.mjs`
- `node --check scripts/export-commercial-report.mjs`
- `node --check scripts/reconcile-live-editorial-review-jobs.mjs`
- Production route HEAD checks for new public launch routes
- Production submission smoke with DB verification
- Production smoke cleanup
- Production readiness audit
- Production release audit

## Next Action

Post-launch owner/vendor tasks remain only where code cannot make the fact true: attorney review, final published company contact details if desired, payment/refund/tax configuration, SMS/calling vendor configuration, actual outbound sales sends from the approved email/CRM account, and the first 48 hours of elapsed monitoring after launch.
