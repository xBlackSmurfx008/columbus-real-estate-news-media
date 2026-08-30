# Columbus Real Estate News

CREN is a Columbus-focused real-estate news and consumer-information platform.
This repository contains the Next.js frontend, public editorial and consumer
experiences, commercial intake surfaces, internal CRM workflows, and the
controlled autonomous-agent foundation.

## Stack

- Next.js 16 App Router with TypeScript
- Tailwind CSS
- Neon Postgres through `@neondatabase/serverless`
- Vercel deployment and scheduled cron routes
- Vercel Blob for durable editorial media
- Playwright for browser checks and Node's test runner for deterministic tests

## Current Status

As of 2026-08-30, ordered internal agent work items 1-5 are complete on
`feat/site-map`.

- Agent business state is persisted through typed Neon repositories.
- Agent runs, steps, approvals, tasks, incidents, audits, source packets, CRM
  delivery records, inbox records, sequences, onboarding, billing, and reports
  have durable database backing.
- `/admin/agent-ops` provides the authenticated operations view for queues,
  runs, incidents, tasks, and approval decisions.
- Approval records support exact payloads, expiration, pause/resume, approval,
  rejection, and revision requests.
- Control Tower has authenticated snapshot and scan routes plus a daily cron
  route at `/api/cron/agent-control-tower`.
- CRM delivery has bounded transient retries, reused idempotency keys, and
  durable dead-letter records.
- Preview UAT passed against the isolated Neon `cren-preview` branch and
  cleaned all controlled agent records back to zero.
- The final Preview deployment is
  `https://frontend-b01l2iakh-stephen-s-projects-96d9c6b4.vercel.app`.
- The production site is `https://columbusrealestatenews.com`.

The external-action hold remains active. Cold outreach, social DMs, SMS,
automated calls, publication, payments, refunds, and paid lead routing are not
enabled by this implementation. CRM sync is explicitly configured and tested
with a bounded delivery contract; no external-action pilot was authorized.

## Public Routes

Core public experiences include:

- `/`, `/areas`, `/topics`, `/blog`, `/newsroom`, `/search`, `/site-map`
- `/market-data`, `/resources`, `/things-to-do`, `/housing-search`
- `/buy`, `/rent`, `/sell`, `/invest`
- `/directory`, `/directory/list-your-business`
- `/advertise`, `/advertise/media-kit`, `/advertise/self-service`
- `/profiles`, `/profiles/claim`
- `/join`, `/profile`, `/subscribe`, `/contact`
- `/policies`, `/terms`, `/privacy`, `/cookies`, `/advertising-terms`
- `/sponsored-content-policy`, `/fair-housing`, `/listing-quality-policy`
- `/profile-claim-policy`, `/lead-disclosure`, `/ai-policy`
- `/accessibility`, `/copyright`, `/submissions-policy`,
  `/communications-policy`

Dynamic routes include `/areas/[slug]`, `/topics/[slug]`, `/blog/[slug]`,
`/profiles/[slug]` where available, and `/go/[slug]` for tracked links.

## Internal Agent Surface

All `/api/agent/*` routes require authenticated, capability-scoped access.
Important routes are:

- `GET /api/agent/control-tower`: read the operations snapshot
- `POST /api/agent/control-tower`: run an authenticated internal scan
- `GET /api/agent/approvals`: list pending and paused approvals
- `POST /api/agent/approvals`: request, decide, or resume an approval
- `POST /api/agent/pilot`: run the controlled Preview UAT harness
- `POST /api/cron/agent-control-tower`: authorized scheduled scan entrypoint
- `/api/agent/research`: source-packet intake for research and production work

Open `/admin/agent-ops` after signing in to review durable operational state.
The UI is an operator surface, not an authorization boundary; permissions are
enforced in the server routes.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Use Vercel environment injection or a local ignored environment file for
database-backed work. Never commit `.env*` files or print secret values.

```bash
vercel env pull .env.local --environment=development
```

## Database Migrations

The agent foundation migration is additive and idempotent:

```bash
DATABASE_URL="$DATABASE_URL" npm run newsroom:migrate-agent-foundation
```

It creates the durable agent tables and repairs the earlier `agent_tasks` /
`agent_crm_tasks` contract drift without dropping rows. The canonical contracts
are:

- `agent_tasks`: internal durable tasks with `kind`, `dedupe_key`, payload, and
  owner fields
- `agent_crm_tasks`: CRM follow-up tasks with title, assignee, contact, deal,
  and notes fields

The migration also ensures `audit_logs` and `crm_sync_deliveries`. Production
and Preview have already been migrated. Preview uses the separate Neon branch
named `cren-preview`.

Other additive migrations are available through the `newsroom:migrate-*`
scripts in `package.json`. Confirm the target database before running any
migration.

## Verification

Run the focused local checks:

```bash
git diff --check
node --check scripts/migrate-agent-foundation.mjs
npm run lint
npm run test:image-pipeline
npm run build
```

The current release evidence is `94` passing deterministic tests and a
`111`-route production build. The final Preview smoke gate verified public
`200` responses, unauthenticated agent and cron `401` responses, authenticated
operator `200` responses, and the protected `/crm` `307` redirect.

Do not run remote submission smoke tests between implementation slices. Run the
final smoke pass only after the build, migration, UAT, and release checks are
complete. Use an explicitly selected base URL and clean controlled records
after any approved smoke run.

## Deployment

Create a Preview deployment from the project root:

```bash
vercel --yes
```

Inspect the resulting deployment before using it:

```bash
vercel inspect <deployment-url>
```

Production promotion is a separate owner-authorized action. A deployment does
not authorize external outreach, publication, payment, or lead routing.

## Project Information

- Working notes and current release evidence: [`NOTES.md`](./NOTES.md)
- External-action hold: [`docs/AGENT_EXTERNAL_ACTION_HOLD_2026-08-30.md`](./docs/AGENT_EXTERNAL_ACTION_HOLD_2026-08-30.md)
- Ordered completion backlog: `/Users/mr.adams/cren/review/CREN_AUTONOMOUS_AGENT_COMPLETION_BACKLOG_2026-08-30.md`
- Advertising and insertion-order plan: [`docs/ADVERTISING_SALES_AND_INSERTION_ORDER_PLAN_2026-08-29.md`](./docs/ADVERTISING_SALES_AND_INSERTION_ORDER_PLAN_2026-08-29.md)
- Profile and consent requirements: [`docs/BACKEND_PROFILE_AND_CONSENT_REQUIREMENTS_2026-08-29.md`](./docs/BACKEND_PROFILE_AND_CONSENT_REQUIREMENTS_2026-08-29.md)
- Editorial gate: [`docs/EDITORIAL_GATE.md`](./docs/EDITORIAL_GATE.md)
- Advertiser outreach package: [`docs/CREN_ADVERTISER_OUTREACH_PACKAGE_2026-08-29.md`](./docs/CREN_ADVERTISER_OUTREACH_PACKAGE_2026-08-29.md)

## Remaining Owner-Dependent Work

The next stages are outside the completed internal-only tranche:

1. Expand Research/Production Desk source registry, fetch controls, claim
   matrices, and human editorial review.
2. Connect a versioned model/tool runtime without bypassing CREN capabilities.
3. Observe one full internal operating cycle.
4. Obtain provider, sender-identity, legal, and publisher approval for any
   controlled external-action pilot.

These are not implied by a code deploy or by changing a Vercel environment
variable.
