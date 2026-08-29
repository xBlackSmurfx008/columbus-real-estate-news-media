# Frontend (Professional Foundation)

This front end is intentionally built as an acquisition-grade foundation:

- Next.js App Router + TypeScript
- Tailwind design system
- Typed domain model (`areas`, `topics`, `content`)
- Dynamic area/topic routes ready for CMS-backed content

## Why this stack

Top media properties frequently use WordPress for editorial workflows, but growth-stage teams increasingly pair editorial systems with modern, high-performance front ends. This implementation prioritizes:

- SEO and performance fundamentals
- Scalable component architecture
- Clear migration path to headless CMS and personalization
- Fast iteration velocity for content and monetization experiments

## Current pages

- `/`
- `/areas`
- `/areas/[slug]`
- `/topics`
- `/topics/[slug]`
- `/blog`
- `/blog/[slug]`
- `/market-data`
- `/resources`
- `/things-to-do`
- `/housing-search`
- `/directory`
- `/directory/list-your-business`
- `/directory/sponsor-rules`
- `/buy`
- `/buy/price-band-reality`
- `/rent`
- `/rent/before-you-sign`
- `/rent/find-a-home`
- `/sell`
- `/sell/your-home`
- `/sell/investment-property`
- `/invest`
- `/invest/deploy-capital`
- `/search`
- `/site-map`
- `/saved`
- `/profile`
- `/newsroom`
- `/editorial-standards`
- `/corrections`
- `/advertise`
- `/contact`
- `/join`
- `/subscribe`

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Current status — August 28, 2026

The current deployed branch is `feat/site-map` at `3fc9ba8`. The completed
product tranche includes the public site map, intent-aware search and resource
results, saved items, area-scoped housing links, and Neon-backed member signup
and profile editing. The member flow was verified against the protected
production deployment and the controlled test account was removed afterward.

Production uptime and public-image reachability pass. The source-aware market
tables are installed and contain 20 verified observations across 11
geographies. The readiness audit still has three follow-ups: reconcile one
live article without a canonical slug, reserve fingerprints/jobs for six live
images, and resolve 13 live rows with queued editorial statuses. Seventeen
controlled audience smoke rows remain excluded from KPI totals.

## Operational checks

Use these before release work:

```bash
npm run build
npm run lint
npm run test:image-pipeline
npm run test:e2e
```

Use production env injection for read-only live checks:

```bash
vercel env run -e production -- npm run newsroom:production-readiness
vercel env run -e production -- npm run newsroom:audit-public-images
vercel env run -e production -- npm run newsroom:uptime
vercel env run -e production -- npm run newsroom:kpi
vercel env run -e production -- npm run newsroom:cleanup-smoke-records
vercel env run -e production -- npm run newsroom:sync-image-fingerprints -- --dry-run
```

Member accounts

Member signup and profile preferences use the Neon `members` table. Apply the
additive account columns before deploying the member UI:

```bash
vercel env run -e production -- npm run newsroom:migrate-member-profiles
```

The public flow is `/join` -> `/profile`. Existing members are not overwritten
by signup; an existing account must sign in. `MEMBER_JWT_SECRET` may be set in
Vercel, otherwise the existing `ADMIN_JWT_SECRET` is used for the member cookie.

Valid public submission smoke tests intentionally leave `codex-smoke` records
until an approved cleanup. Run smoke only at the end of a release cycle.
Cleanup requires `--delete --confirm=codex-smoke`; fingerprint sync writes
unless `--dry-run` is present.

## Next phases

1. Reconcile the one canonical-slug gap, six image fingerprint/job gaps, and 13 queued review rows before expanding automation.
2. Complete the first fully reported reference hubs from `docs/AREA_HUB_COMPLETION_PLAN_2026-08-25.md`.
3. Add append-only editorial review history and resumable publication-run tracking.
4. Build owned-audience delivery, sponsor insertion, and campaign reporting around verified subscriber data.
