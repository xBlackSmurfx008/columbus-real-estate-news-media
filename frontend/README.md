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

1. Install and import source-aware market observations for priority area hubs.
2. Complete the first fully reported reference hubs from `docs/AREA_HUB_COMPLETION_PLAN_2026-08-25.md`.
3. Add append-only editorial review history and resumable publication-run tracking.
4. Build owned-audience delivery, sponsor insertion, and campaign reporting around verified subscriber data.
