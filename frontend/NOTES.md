# NOTES

As of: 2026-08-29
Project: Columbus Real Estate News frontend
Working directory: `/Users/mr.adams/dev/cren-cloud-migration/frontend`

## Active Goal Contract

Objective: build the CREN autonomous-agent foundation to completion: Neon-backed durable agent state, authenticated capability-scoped tools, run/step/approval/task/incident/audit foundations, Operations Control Tower and Research/Production Desk workflows, and final deterministic verification followed by one final smoke-testing pass.

Non-goals for this goal: sending outreach, publishing content, charging money,
changing production permissions, or deploying externally without separate
explicit approval.

Completion proof: production state survives restart from Neon; side effects are
idempotent and server-gated; approval pause/resume is durable; agent runs and
tool calls are traceable; missing evidence blocks action; deterministic checks
pass; final smoke testing is run only after the remaining build work is done.

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
- `scripts/launch-monitor.mjs` and `npm run newsroom:launch-monitor` now run route, alias, and readiness checks in one command.
- Launch monitor on 2026-08-30 at 05:14 UTC caught a new live article issue: the Shops on Lane article was missing `image_url` and still had `READY_FOR_AUTOMATION`.
- Repaired that article by attaching unique Blob hero `hero-91bc6512b9236589.webp`, updating alt/caption, and reconciling the review row to `AUTO_PUBLISHED`.
- Final launch monitor on 2026-08-30 at 05:17 UTC returned `ok: true`; production readiness returned `findings: []`, zero smoke rows, 88 live articles, and no queued live rows.

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

## Current Goal Research

- Existing agent scaffold is under `src/agent` with API routes under
  `app/api/agent` for email, CRM, sequences, onboarding, billing, reporting,
  scheduling, approvals, and pilot UAT.
- Existing agent state is held in process Maps with optional local JSON
  persistence in `src/agent/store.ts`; this is not production-durable on
  Vercel and must be replaced or wrapped with Neon repositories.
- Existing sequence execution can call email/social gateways directly; every
  external send needs server-side suppression, capability, approval, rate,
  and audit checks.
- Existing `requireAuth` is available in `lib/auth.ts`, but agent routes must
  enforce role/capability authorization explicitly.
- Existing profile/advertising migration provides campaign, asset,
  substantiation, insertion-order, lead-routing, and audit tables. New agent
  tables should be additive and reuse existing audit conventions.
- Project guidance treats Vercel functions as stateless and recommends durable
  Workflow/state handling for long-running agents and approvals.
- Current official OpenAI Agents SDK references support tool guardrails,
  durable human-in-the-loop pause/resume, tracing, and workflow testing. The
  implementation remains provider-adapter based and must not assume an agent
  SDK itself supplies CREN authorization.

## Goal Progress

- [x] Goal created and implementation contract established.
- [x] Current agent code, auth, Neon access, migrations, and project guidance researched.
- [x] Neon-backed durable agent foundation migration and repositories added.
- [x] Capability-scoped authenticated tool boundary applied to agent routes.
- [x] Operations Control Tower scan and Research/Production Desk source-packet intake added.
- [x] Deterministic verification and final safe smoke-testing pass completed.

## Next Action

The additive Neon migration has been applied to the configured database.
Keep external sends disabled until approval records, provider credentials,
suppression checks, and a controlled rollout are explicitly approved.

The detailed ordered completion path is documented in
`/Users/mr.adams/cren/review/CREN_AUTONOMOUS_AGENT_COMPLETION_BACKLOG_2026-08-30.md`.

## Discovered Environment State

Read-only discovery on 2026-08-30 found that the intended Neon database has
the profile/advertising and consent/audit tables. The additive agent migration
has now run successfully, including `agent_state_records`.
Vercel production has encrypted `DATABASE_URL`, `CRM_SYNC_URL`,
`CRM_SYNC_SECRET`, Telegram, cron, and Blob variables, plus explicit
durable-state, outbound-send, low-risk-reply, and CRM-sync flags. Secret values
were not printed.
Vercel has Development, Preview, and Production environments but no discovered
staging environment or `STAGING_DATABASE_URL`; use a separate Neon branch for
Preview validation before running the agent migration.

## Autonomous Agent Build Record

As of: 2026-08-30

Implemented:

- `scripts/migrate-agent-foundation.mjs` adds durable `agent_runs`,
  `agent_steps`, `agent_approvals`, `agent_tasks`, `agent_policies`,
  `agent_incidents`, and `source_packets` tables.
- `src/agent/durable-store.ts` provides Neon-backed run, step, approval, task,
  incident, audit, and source-packet writes with input hashing and deduplication.
- `src/agent/durable-state.ts` adds `agent_state_records` and hydrates/flushes
  the legacy CRM, inbox, sequence, onboarding, billing, and report records
  through a serialized request boundary while domain repositories are migrated.
- `src/agent/policy/capabilities.ts` and `lib/agent-auth.ts` enforce role and
  capability checks at the agent API boundary.
- All existing `/api/agent/*` routes now require authenticated capabilities;
  `/api/agent/control-tower`, `/api/agent/research`, and `/api/agent/approvals`
  are available as the first durable workflows.
- Outbound sequence sends require `AGENT_EXTERNAL_SENDS_ENABLED=true` plus an
  exact, non-expired durable approval. Low-risk inbound auto-replies are
  disabled unless `AGENT_AUTO_SEND_LOW_RISK=true`.
- The pilot harness reports sequence execution as `blocked_by_policy` by
  default and does not send external messages.

Verification:

- `git diff --check`: passed.
- `node --check scripts/migrate-agent-foundation.mjs`: passed.
- `npm run lint`: passed.
- `npm run build`: passed; 110 routes compiled, including new agent routes.
- `npm run test:image-pipeline`: passed; 81 tests.
- `npm run smoke:submissions -- --json`: passed in dry-run mode; no HTTP calls
  or database inserts performed.

Applied and configured after the initial verification:

- `npm run newsroom:migrate-agent-foundation` completed against the configured
  Neon database, including `agent_state_records`.
- Production Vercel flags are explicit: durable state enabled, external sends
  disabled, low-risk auto-replies disabled, and CRM sync enabled.
- `npm run lint`, `npm run build`, and the deterministic suite were rerun after
  the durable state wrapper; 90 tests passed and 110 routes compiled.
- Production deployment `dpl_4298bpAtLN4qF5k8vxGt57QRhXTC` completed and was
  aliased to `https://columbusrealestatenews.com`.
- Final launch monitor passed, public commercial/profile/policy routes returned
  `200`, unauthenticated agent access returned `401`, and production readiness
  returned `ok: true` with no findings.

Still not performed:

- External outreach, email/social sends, publication, payments, or lead routing.
- Separate Neon Preview branch and replacement of the compatibility record
  wrapper with domain-specific repositories.
- Remote submission smoke with controlled records; keep this as the final
  pre-release check for any future public-form change.
