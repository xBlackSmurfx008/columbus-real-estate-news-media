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
- `/advertise`
- `/subscribe`

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Next phases (after frontend)

1. Connect to headless CMS (recommended: WordPress headless or Sanity)
2. Add auth + saved follows
3. Add event tracking pipeline (PostHog/GA4 + warehouse)
4. Build ad inventory manager and campaign reporting dashboard
5. Add newsletter automation and sponsor insertion tooling
