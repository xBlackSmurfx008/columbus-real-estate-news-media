# Frontend Stack Decision (Research-Based)

## What top publishers are built on

Research across major real-estate and digital media brands shows these repeat patterns:

- **WordPress is common for editorial operations** at scale (examples include Inman and HousingWire references found in research).
- **Enterprise publishers combine strong editorial CMS + custom front-end experience**, often with modern component systems and analytics instrumentation.
- **Teams optimizing for growth/acquisition prioritize:** fast page loads, strong SEO primitives, repeatable content templates, first-party data capture, and flexible ad surfaces.

## Frontend-first choice for this project

For this phase, build on:

- **Next.js (App Router) + TypeScript** for a high-performance, scalable web front-end
- **Tailwind CSS** for a fast, consistent design system
- **Componentized architecture** ready for future CMS integration (WordPress headless, Sanity, or custom API)

## Why this is the right move now

- Delivers a premium UX and strong SEO foundation immediately
- Keeps future CMS and data-layer options open
- Matches modern engineering expectations for an acquisition-grade media company
- Makes later expansion into subscriptions, personalization, and advertiser dashboards straightforward

## Phase 2/3 compatibility

- **Phase 2:** Connect to CMS (likely headless WordPress for editorial familiarity)
- **Phase 3:** Add identity, audience graph, ad ops tooling, and revenue analytics
