# CREN User Request Coverage Matrix

As of: 2026-08-29
Project: `/Users/mr.adams/dev/cren-cloud-migration/frontend`
Purpose: make the original business goal visible and measurable instead of burying it under technical subtasks.

## Exact Business Request Coverage

| User-requested item | Status | Where it is handled |
| --- | --- | --- |
| Review how to improve `columbusrealestatenews.com` without relying on previous data. | Complete | `docs/COMPETITIVE_RESEARCH_AND_LAUNCH_PLAN_2026-08-29.md` and live-site implementation updates. |
| Act as CMO, editorial director, journalists, and media-company professionals. | Complete | Launch plan sections for executive thesis, editorial desks, audience plan, sales plan, data plan, and roles. |
| Create a detailed launch plan to completion. | Complete | `docs/COMPETITIVE_RESEARCH_AND_LAUNCH_PLAN_2026-08-29.md` plus `/goal` checklist. |
| Include sales and advertising plans for real estate industry services and apartments. | Complete | `docs/ADVERTISING_SALES_AND_INSERTION_ORDER_PLAN_2026-08-29.md`, `/advertise`, `/advertise/media-kit`, `/admin/commercial`. |
| Define backend profiles needed for users to service themselves and update profile info. | Complete | `docs/BACKEND_PROFILE_AND_CONSENT_REQUIREMENTS_2026-08-29.md`, `/profiles`, `business_profiles`, `apartment_profiles`, `profile_claims`, `profile_versions`, `profile_disputes`, `advertiser_accounts`, `campaigns`. |
| Deep research similar successful companies and emulate the useful parts. | Complete | 50-company pattern study in `docs/COMPETITIVE_RESEARCH_AND_LAUNCH_PLAN_2026-08-29.md`. |
| Review top real estate sites, blogs, media, and data companies to understand what people desire. | Complete | 50-company representative benchmark plus "What People Most Want From This Category" in the competitive plan. |
| Keep the original business plan items in the checklist. | Complete | This coverage matrix and the updated `/goal` checklist. |
| List fully autonomous ideas in detail. | Complete | Fully Autonomous Ideas section in the competitive plan and `/goal` checklist. |
| List partially autonomous ideas in detail. | Complete | Partial Autonomous Ideas section in the competitive plan and `/goal` checklist. |
| Review information for accuracy as advisory and improve it. | Complete | Accuracy and open-risk section in the competitive plan plus verified production KPI baseline. |
| Add terms, conditions, policies, and legalese checklist. | Complete | Policy library routes, `lib/policy-pages.ts`, policy checklist, consent logging, and production policy-version migration. |
| Get done what needs to be done; nothing is gated. | In progress | Production DB migrations and cleanup are complete; production deploy and post-deploy smoke remain after current code verification. |

## What People Most Desire

Across the benchmark companies, CREN should prioritize:

- Inventory: homes, apartments, commercial-property context, listings, deals, lease-up signals, and service-provider options.
- Trust: verified availability, current data, source transparency, correction paths, visible sponsorship labels, and profile dispute handling.
- Local context: schools, commute, taxes, zoning, amenities, public records, development pipeline, neighborhood feel, and practical risk notes.
- Speed: alerts, saved areas, mobile browsing, direct forms, tour/listing/advertising requests, and one-step contact paths.
- Confidence: market trends, price history, comps, rent/rate context, affordability signals, source boxes, and methodology notes.
- Professional help: agents, lenders, inspectors, property managers, attorneys, vendors, movers, title, insurance, and home services.
- Actionable next step: schedule, inquire, claim profile, advertise, list a rental, download report, follow an area, or submit a correction.
- Status tracking: saved neighborhoods, followed developments, watched properties, campaign analytics, claim status, and profile review status.
- Lead quality: advertisers want measurable inquiries, route/source detail, campaign context, and renewal recommendations.
- Authority: rankings with methodology, reports, events, deal sheets, market analysis, insider newsletters, and source-aware data.

## CREN Build Order

1. Analytics and source-of-truth cleanup.
2. Homepage conversion and user-path rebuild.
3. Newsletter segmentation by buyer, renter, investor, agent, apartment operator, developer, vendor, and local resident.
4. Verified media kit and sales package launch.
5. Apartment profiles and stale-availability controls.
6. Pro/vendor/agent/lender/developer profiles.
7. Development tracker and public-record digest.
8. Managed advertiser intake, then self-service ad buying.
9. Advertiser dashboard and campaign report export.
10. Quarterly reports, events, and recurring sponsor programs.

## Fully Autonomous Ideas

- Daily market pulse generator.
- Neighborhood page updater.
- Development tracker classifier.
- Apartment availability monitor.
- Lead routing system with consent and disclosure logs.
- Advertiser reporting generator.
- Self-service ad portal for simple placements.
- Profile claiming workflow.
- Newsletter segmentation engine.
- Correction and source audit bot.
- SEO content gap monitor.
- Weekly sales prospect list.
- Event sponsor matcher.
- AI-assisted renter matching with labeled sponsor handling.
- Investor deal watch.
- Public records digest.
- Social clip and post generator.
- Sales renewal automation.
- Reputation monitor.
- Paywall and lead-magnet optimizer.

## Partial Autonomous Ideas

- Investigative development reporting.
- Sponsored content drafting.
- Agent and broker rankings.
- Apartment rankings.
- Neighborhood scoring.
- Sales outreach drafting.
- Media kit updates.
- Events programming.
- Vendor directory moderation.
- Market forecasts.
- User-generated tip triage.
- Partner data imports.
- Sponsored research reports.
- Newsletter assembly.
- Correction handling.

## Current Implementation Evidence

- Public media kit/rate-card path: `/advertise/media-kit`.
- Public profile-owner hub: `/profiles`.
- Admin commercial operations queue: `/admin/commercial`.
- Admin commercial report export: browser JSON download from `/admin/commercial`.
- CLI commercial report export: `npm run newsroom:commercial-report`.
- Production readiness audit: all required commercial, profile, consent, market, article, and image tables present with zero findings as of 2026-08-29T13:07:12Z.
- Controlled smoke rows cleaned from production: 17 rows deleted from `contacts`, `subscribers`, `leads`, and `members`.
- Live editorial review queue reconciled: 13 already-live rows moved from queued review statuses to `AUTO_PUBLISHED`.
