# CREN Legal and Policy Current-State Matrix

As of: 2026-08-29
Project: `/Users/mr.adams/dev/cren-cloud-migration/frontend`
Purpose: Gate 1 evidence map for the long-running legal, policy, revenue, profile-backend, automation, and launch-readiness goal. This is advisory work, not legal advice.

Related artifacts created for this goal:

- `docs/LEGAL_POLICY_LAUNCH_GOAL_CHECKLIST_2026-08-29.md`
- `docs/COMPETITIVE_RESEARCH_AND_LAUNCH_PLAN_2026-08-29.md`
- `docs/BACKEND_PROFILE_AND_CONSENT_REQUIREMENTS_2026-08-29.md`
- `docs/ADVERTISING_SALES_AND_INSERTION_ORDER_PLAN_2026-08-29.md`

## Inspection Scope

Inspected local current-state sources:

- Public legal and policy routes under `app/`.
- Footer, sitemap, site-map page, and policy navigation.
- Public forms for leads, advertising, subscription, membership, directory listing, and rental-listing review.
- Public and admin API routes for leads, contacts, subscribers, members, ads, profiles, analytics, and affiliate redirects.
- Database bootstrap and migration scripts for members, leads, subscribers, ads, affiliate clicks, market observations, page views, activation events, and editorial/image systems.
- Existing policy and sponsorship rulebook in `lib/directory-sponsorship.ts`.
- Existing verification scripts in `package.json` and `scripts/`.

No production writes, deploys, outbound messages, payment activation, credential changes, or final legal approvals were performed.

## Public Policy Route Matrix

| Policy surface | Current evidence | Status | Required next action |
| --- | --- | --- | --- |
| Terms of Use | `app/terms/page.tsx` now renders the shared local draft in `lib/policy-pages.ts`. | Local draft route | Counsel review, final dispute/payment clauses, acceptance capture, and production approval. |
| Privacy Policy | `app/privacy/page.tsx` now renders the shared local draft in `lib/policy-pages.ts`. | Local draft route | Counsel review, tracking inventory, retention schedule, rights workflow, and consent logging. |
| Editorial Standards | `app/editorial-standards/page.tsx` exists with evidence, status precision, comparable data, unsupported effects, automation disclosure, and commercial separation. | Strong partial | Add detailed newsroom handbook or linked detail page for source hierarchy, AI/image disclosures, conflicts, sponsored firewall, corrections notation, and audit logs. |
| Corrections Policy | `app/corrections/page.tsx` exists with report, verify, repair, preserve steps. | Partial | Add SLA, correction/update labels, takedown criteria, privacy/legal escalation, archive rules, and internal correction-log schema. |
| Advertise | `app/advertise/page.tsx` exists and states ads cannot buy coverage, rankings, conclusions, or recommendations. | Partial | Add formal advertising terms, insertion-order terms, claim substantiation, cancellation/refund rules, prohibited categories, and package specs. |
| Sponsor-safe directory rules | `app/directory/sponsor-rules/page.tsx` and `lib/directory-sponsorship.ts` exist with category rules, labels, proof, claims, disputes, and sponsor packages. | Strong partial | Split durable legal-policy pieces into public route(s) or link it from formal Terms/Advertising Terms. |
| Cookie/Tracking Policy | `app/cookies/page.tsx` renders a local draft from `lib/policy-pages.ts`. | Local draft route | Confirm live tracking inventory and opt-out needs before production use. |
| Sponsored Content/Native Ads Policy | `app/sponsored-content-policy/page.tsx` renders a local draft from `lib/policy-pages.ts`. | Local draft route | Connect labels to ad schema, cards, newsletters, and campaign review. |
| Fair Housing Policy | `app/fair-housing/page.tsx` renders a local draft from `lib/policy-pages.ts`. | Local draft route | Add scanner, form certification, complaint workflow, and counsel review. |
| Listing/Directory Quality Policy | `app/listing-quality-policy/page.tsx` renders a local draft from `lib/policy-pages.ts`. | Local draft route | Add durable profile/claim schema and last-verified workflows. |
| Profile Claim Policy | `app/profile-claim-policy/page.tsx` renders a local draft from `lib/policy-pages.ts`. | Local draft route | Add backend claim/version/dispute schema plan and review queue. |
| Lead Disclosure Policy | `app/lead-disclosure/page.tsx` renders a local draft from `lib/policy-pages.ts`. | Local draft route | Add recipient category, paid/referral disclosure, consent version, and routing audit fields. |
| AI/Automation Policy | `app/ai-policy/page.tsx` renders a local draft from `lib/policy-pages.ts`. | Local draft route | Connect to release gates, editorial jobs, and autonomous-action logs. |
| Accessibility Statement | `app/accessibility/page.tsx` renders a local draft from `lib/policy-pages.ts`. | Local draft route | Audit key public routes/forms for WCAG-oriented issues. |
| Copyright/DMCA Policy | `app/copyright/page.tsx` renders a local draft from `lib/policy-pages.ts`. | Local draft route | Add counsel-approved notice/counter-notice process before broad uploads. |
| Submissions/Tips Policy | `app/submissions-policy/page.tsx` renders a local draft from `lib/policy-pages.ts`. | Local draft route | Add secure-tip limits and submission-review workflow. |
| Communications Policy | `app/communications-policy/page.tsx` renders a local draft from `lib/policy-pages.ts`. | Local draft route | SMS/calling remain gated pending counsel-approved consent language. |

## Navigation and Discoverability Matrix

| Surface | Evidence | Gap |
| --- | --- | --- |
| Footer bottom links | `components/site-footer.tsx` links `Site Map`, `Policies`, `Privacy`, `Terms`, and `Accessibility`. | Good local draft exposure; verify rendered footer after build. |
| Footer company links | Footer links `Newsroom`, `Editorial Standards`, `Corrections`, `Advertise`, `Policies`, `Fair Housing`, `Contact`, and `List Your Business`. | Good local draft exposure; consider adding only after counsel approval in production. |
| Site map page | `app/site-map/page.tsx` includes a `Legal and policy` section populated from `POLICY_LIBRARY_ORDER`. | Good local draft exposure; verify route renders. |
| XML sitemap | `app/sitemap.ts` includes `/policies` and every route in `POLICY_LIBRARY_ORDER`. | Good local draft exposure; verify generated sitemap after build. |
| Robots | `app/robots.ts` disallows `/admin/`, `/api/`, `/crm`, and `/go/`. | Good baseline; recheck after adding any private profile/admin surfaces. |

## Form and Consent Matrix

| Flow | Current evidence | Status | Required next action |
| --- | --- | --- | --- |
| Generic lead forms | `components/lead-form.tsx` requires checkbox: "We may contact you about your request. We never sell your information." `app/api/leads/route.ts` requires `consent === true` and stores boolean `consent`. | Partial | Store consent text/version, source URL, recipient category, routing permission, and privacy/lead disclosure links. |
| Directory listing form | `app/directory/list-your-business/page.tsx` collects legal entity name, website, contact, service areas, credentials, claimant authority, limitations, lead-routing permission, dispute contact, and placement interest. | Strong partial | Persist into dedicated business/profile/claim tables instead of generic `leads.details`; add version history and manual review status. |
| Rental-listing review | `app/housing-search/page.tsx` states no automatic publication and uses `LeadForm` for rental listing review. | Partial | Add property authority proof, fair-housing certification, listing-quality rules, last-verified plan, and form-level lead/listing disclosure. |
| Advertising inquiry | `components/advertising-inquiry-form.tsx` sends inquiry to `/api/contact`; no checkbox or terms acceptance. | Partial | Add advertiser terms acknowledgement, claim-substantiation notice, privacy link, permission to contact, and no-guarantee language. |
| Newsletter subscription | `components/subscribe-form.tsx` captures preferences and posts to `/api/subscribe`; page links privacy below the form. | Partial | Add explicit email consent language, unsubscribe statement near submit, consent version storage, and source-form version. |
| Free membership | `components/join-form.tsx` creates an account via `/api/members`; no terms/privacy checkbox in the form. | Partial | Add Terms/Privacy acceptance and store acceptance version/timestamp. |
| Member profile | `components/profile-panel.tsx` lets signed-in members edit name, role, area, interests, and bio. | Partial | Add data deletion/export/update rights, profile visibility rules, and audit/versioning if business profiles are added. |
| Contact form | `app/api/contact/route.ts` stores contacts and sends Telegram alert; advertising details are packed into `message`. | Partial | Add source-form consent/version fields and structured advertising columns or tables. |

## Backend and Data Model Matrix

| Area | Current evidence | Status | Required next action |
| --- | --- | --- | --- |
| Members | `lib/db.ts`, `scripts/migrate-member-profiles.mjs`, `/api/members`, `/api/member-auth`, and `/api/profile` support basic member account/profile fields. | Reader/member MVP | Add terms/privacy acceptance, consent versions, export/delete request workflow, and role expansion for business users. |
| Leads | `lib/db.ts`, `scripts/migrate-lead-layer.mjs`, `/api/leads`, and admin leads page support generic lead intake and status notes. | Lead MVP | Add lead recipient/routing tables, disclosure version, routing category, partner compensation type, and retention policy. |
| Contacts/advertising inquiries | Contacts table stores name/email/message/source; advertising inquiry embeds package/budget in message. | Basic | Add advertiser account/campaign/intake tables or structured contact fields. |
| Ads | `ads` table and admin ad CRUD exist with display/native fields. | Ad CRUD MVP | Add required labels, review status, substantiation files, insertion-order id, flight dates, billing status, make-good/refund status, and sponsor policy version. |
| Directory/business profiles | Directory form and rulebook exist, but no dedicated business profile tables were found. | Missing durable profile backend | Add `business_profiles`, `profile_claims`, `profile_credentials`, `profile_versions`, `profile_disputes`, and paid placement fields. |
| Apartment profiles | Rental-listing review exists as generic lead. No apartment community profile tables found. | Missing | Add apartment/community profile schema with unit mix, availability, fees, concessions, amenities, policies, manager authority, and last verified. |
| Agent/broker profiles | Basic member role can be `local-business`, but no agent/broker profile schema found. | Missing | Add real estate professional profile schema with brokerage, license, service area, ad disclosures, and lead preferences. |
| Advertiser dashboard | Admin ads/leads exist; no self-service advertiser dashboard found. | Missing | Add advertiser account, campaigns, assets, reporting, invoices, and proof workflow. |
| Market data | Source-aware `market_sources` and `market_observations` exist in `lib/db.ts` and migration scripts. | Strong partial | Add consistency audit against legacy `market_snapshot`, homepage, article snippets, and rendered market blocks. |
| Analytics | `page_views` and `activation_events` use daily visitor hashes and avoid raw IP/full user agent storage. | Strong partial | Document in Privacy/Cookie policy and verify no other analytics stack stores broader personal data. |
| Affiliates | `affiliate_partners`, `affiliate_clicks`, `/go/[slug]`, `AffiliateBlock`, and `FtcDisclosure` exist. | Partial | Expand affiliate disclosure in Terms/Privacy; add partner contract and substantiation records before activation. |
| Editorial/image gates | Editorial/image scripts and tests exist; production-readiness audit checks editorial tables and image fingerprints/jobs. | Strong partial | Link rules from AI/automation policy and release checklist. |

## Automation and Verification Matrix

| Capability | Current evidence | Status | Required next action |
| --- | --- | --- | --- |
| Build/lint | `package.json` has `npm run build` and `npm run lint`. | Available | Run after code changes. |
| Release audit | `npm run release:audit-local` calls Playwright route/render/API checks for major routes and admin auth failure behavior. | Available | Add future policy routes to audited smoke routes. |
| Submission smoke | `npm run smoke:submissions` supports controlled public submissions and remote guardrails. | Available | Extend after consent/version fields are added. |
| Production readiness | `npm run newsroom:production-readiness` runs read-only DB readiness audit. | Available | Add legal/profile/ads/consent schema checks after new tables exist. |
| Market data import | Source-aware market migration/import/refresh scripts exist. | Available | Add a market consistency auditor for duplicate/mismatched homepage and legacy snapshot values. |
| KPI report | `npm run newsroom:kpi` reports subscriber/contact/lead/member and affiliate click data with email masking. | Available | Add advertiser/profile funnel metrics after tables exist. |
| Image/editorial safety | Image fingerprint, policy, audit, and editorial quality tests/scripts exist. | Available | Reference from AI/automation policy and launch gates. |

## Gate 2 Verification Result

- [x] `npm run lint` passed after the policy-route, footer, site-map, sitemap, and CSS changes.
- [x] `npm run build` passed and generated the new public policy routes.
- [x] `npm run test:image-pipeline` passed with 78 tests, 78 pass, and 0 failures.
- [x] `npm run smoke:submissions -- --json` passed as a dry-run with consent-aware request plans.
- [x] `npm run release:audit-local` passed against a local `next start` server with 138 checked pages, 86 area hubs, 28 screenshots, and zero failures.
- [x] `node --check scripts/migrate-compliance-layer.mjs` passed.
- [x] `node --check scripts/migrate-profile-advertising-layer.mjs` passed.
- [x] Mobile horizontal overflow found during verification was fixed in `app/cren-v2.css` by containing the journey-tab scroll row and wrapping footer legal links.
- [ ] Production database inspection was not run in this pass because no intended `DATABASE_URL` was supplied for this local run.

## Risk Ranking

| Risk | Current state | Recommendation |
| --- | --- | --- |
| Investment/capital funnel | `/invest/deploy-capital` has a disclaimer, but the business model could create securities, broker-dealer, investment adviser, or referral-compensation issues depending on compensation and conduct. | Freeze scaling. Counsel review before matching, deal pages, paid introductions, private offerings, or investment claims. |
| Fair housing | Directory/rental pages acknowledge fair-housing risk, but no standalone policy or automated scanner is implemented. | Create policy, add advertiser certification, add route/form copy checks, then add scanner. |
| Native advertising | Labels exist conceptually; formal sponsored-content policy and ad review schema are missing. | Create policy and require label/review fields in ad schema before self-service ads. |
| Privacy/consent | Analytics design is privacy-aware, but public privacy language and form consent logs are incomplete. | Expand Privacy/Cookie and add consent versioning to leads, members, subscribers, contacts, and advertisers. |
| Profile marketplace | Directory intake collects strong fields, but stores as generic lead details. | Add dedicated profile/claim/credential/version/dispute tables before public self-service profile management. |
| Advertiser operations | Packages and admin ad CRUD exist, but insertion orders, proofs, campaign dates, billing, labels, and claims review are not durable. | Add advertiser/campaign schema and policy pages before paid self-service launch. |

## Gate 1 Result

- [x] Current public legal/policy routes inventoried.
- [x] Navigation and sitemap exposure inventoried.
- [x] Public forms and consent posture inventoried.
- [x] Core backend tables, APIs, and migration scripts inventoried.
- [x] Existing automation and verification commands inventoried.
- [x] Missing policy pages, schema gaps, and highest-risk surfaces identified.

Gate 1 is complete for local current-state mapping. It did not include production database inspection, attorney review, public deployment, external account review, or final legal approval.

## Recommended Next Work Sequence

1. Run local lint/build verification for the draft policy routes and navigation.
2. Add consent-version constants and form copy for leads, advertising inquiries, newsletter subscriptions, and membership signup.
3. Draft a profile-backend schema migration plan for `business_profiles`, `profile_claims`, `profile_credentials`, `profile_versions`, `profile_disputes`, `lead_recipients`, `campaigns`, `ad_assets`, and `insertion_orders`.
4. Extend verification scripts to check policy routes, disclosure labels, consent fields, and required sponsor/profile schema.
5. Run release/local smoke checks after implementation work.
6. Hold production deploy and legal finalization until user and counsel approval.
