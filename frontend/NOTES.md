# NOTES

As of: 2026-08-29
Project: Columbus Real Estate News frontend
Working directory: `/Users/mr.adams/dev/cren-cloud-migration/frontend`

## Active Goal Contract

Objective: complete a comprehensive ColumbusRealEstateNews.com legal, policy, product, sales, advertising, profile-backend, automation, and launch-readiness checklist using current evidence.

Non-goals:

- Do not publish or deploy without explicit user approval.
- Do not treat draft legal language as attorney-approved.
- Do not contact advertisers, data providers, attorneys, or users without explicit approval.
- Do not activate payment, billing, SMS, credential, or production data-provider changes without explicit approval.
- Do not create securities, broker, lender, property-management, or investment-advice workflows without legal review.

Allowed work:

- Local audits, local docs, local code drafts, local tests, local policy route drafts, and local checklists.
- Current-source research for legal/policy/ad/profile standards.
- Advisory recommendations and implementation notes.

Proof of completion:

- Checklist items completed or explicitly marked as requiring outside approval.
- Public routes and footer links implemented for required policies.
- Forms and backend flows mapped to consent, profile-claim, dispute, and sponsor-label requirements.
- `npm run lint`, `npm run build`, and relevant smoke/audit scripts pass locally.
- User approval obtained before production deploy.

## Current State

- Existing public policy/legal pages found: `/terms`, `/privacy`, `/editorial-standards`, `/corrections`, `/advertise`, `/directory/sponsor-rules`, `/profile`, and `/invest/deploy-capital`.
- `/terms` and `/privacy` are summary-level and need expansion before launch-grade commercial/profile activity.
- Existing `lib/directory-sponsorship.ts` contains a strong sponsor-safe rulebook and should be reused.
- `/invest/deploy-capital` is the highest-risk current surface and requires counsel before scaling.
- Main checklist created at `docs/LEGAL_POLICY_LAUNCH_GOAL_CHECKLIST_2026-08-29.md`.
- Gate 1 local current-state matrix created at `docs/LEGAL_POLICY_CURRENT_STATE_MATRIX_2026-08-29.md`.
- Gate 1 is complete for local route, navigation, form, API, schema, and verification-command mapping. It did not include production DB inspection, deployment, external outreach, account review, or legal approval.
- Gate 2 local policy library drafts were created through `lib/policy-pages.ts` and `components/policy-page.tsx`.
- New local policy routes exist for `/policies`, `/cookies`, `/advertising-terms`, `/sponsored-content-policy`, `/fair-housing`, `/listing-quality-policy`, `/profile-claim-policy`, `/lead-disclosure`, `/ai-policy`, `/accessibility`, `/copyright`, `/submissions-policy`, and `/communications-policy`.
- `/terms` and `/privacy` now render expanded local drafts from the shared policy library.
- Footer, human site map, and XML sitemap source now expose the local draft policy library.
- Gate 2 verification passed locally: `npm run lint`, `npm run build`, and `npm run release:audit-local`.
- A mobile horizontal-overflow issue found during release audit was fixed in `app/cren-v2.css` by containing the journey-tab scroll row and wrapping footer legal links.
- `npm run release:audit-local` result: 123 checked pages, 86 area hubs, 28 screenshots, zero failures.
- Competitive research and launch-plan brief created at `docs/COMPETITIVE_RESEARCH_AND_LAUNCH_PLAN_2026-08-29.md`.
- Competitive research covers a representative 50-company set across real estate portals, apartment marketplaces, professional real estate media, local newsletter/newsroom models, property-data companies, software platforms, and investor/community platforms.
- Gate 3 backend profile and consent requirements map created at `docs/BACKEND_PROFILE_AND_CONSENT_REQUIREMENTS_2026-08-29.md`.
- Gate 4 advertising, sales, and insertion-order plan created at `docs/ADVERTISING_SALES_AND_INSERTION_ORDER_PLAN_2026-08-29.md`.
- Gate 3 and Gate 4 are complete as local planning/drafting artifacts only; migrations, APIs, forms, dashboards, verified media kit, contracts, legal approval, and production launch remain open.

## Evidence Summary

- Public routes exist for Terms, Privacy, Editorial Standards, Corrections, Advertise, Sponsor Rules, Directory Listing, Profile, and Deploy Capital.
- Footer and site map now expose the broader local draft legal-policy library required for self-service ads and profiles.
- Generic lead forms store a boolean consent only; they do not store consent version, source copy, routing recipient category, or compensation disclosure.
- Advertising inquiry form has no consent checkbox or terms acknowledgement yet.
- Directory listing intake collects strong proof and claim fields but persists as generic lead details rather than dedicated business/profile/claim tables.
- Pageview and activation analytics are privacy-aware by design: daily visitor hash, no raw IP, no full user agent stored in the audited endpoints.
- Ads CRUD exists, but ad labels, proof/substantiation, insertion orders, campaign dates, billing/refund status, and review status are not durable schema fields yet.
- Source-aware market tables and verification scripts exist and should be extended rather than replaced.

## Next Action

Next action: start Gate 5 legal/approval preparation or Gate 6 implementation/verification hardening. Practical next implementation step is consent-version constants plus migrations for `policy_versions` and `consent_events`, followed by form/API updates. Do not deploy or treat draft legal text as final without explicit user and counsel approval.
