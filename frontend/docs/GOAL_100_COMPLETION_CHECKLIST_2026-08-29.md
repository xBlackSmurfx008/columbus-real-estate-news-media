# CREN /goal 100 Percent Completion Checklist

As of: 2026-08-29
Project: `/Users/mr.adams/dev/cren-cloud-migration/frontend`
Owner direction: no more planning-only gates; execute the work that can be executed.
Truth standard: mark an item complete only when the file, route, migration, command, production check, or documented owner action actually exists.

## Completion Definition

This `/goal` is complete when the user request has been turned into a working CREN launch package:

- [x] Competitive research is documented as a representative 50-company benchmark universe, not a false traffic-ranked top-50 claim.
- [x] CMO, editorial director, journalist, media-operator, sales, advertising, apartment, and data-product recommendations are captured.
- [x] "What people most desire" and "what CREN should emulate" are preserved in an execution checklist.
- [x] Legalese, policy, terms, consent, sponsored-content, listing-quality, profile-claim, and communications requirements are turned into public routes.
- [x] Sales, advertising, insertion-order, profile, apartment, advertiser, campaign, lead-routing, and reporting requirements are documented.
- [x] Backend readiness exists for business profiles, apartment profiles, profile claims, advertisers, campaigns, ad assets, reports, lead routing, and policy/consent records.
- [x] Public forms send versioned consent metadata and server routes record normalized consent events when the migrated tables exist.
- [x] Production database migrations for compliance and commercial readiness have been run.
- [x] Public media-kit, self-service advertising intake, profile-owner hub, and profile-claim route exist.
- [x] Admin commercial operations dashboard and report export exist.
- [x] Real local and production-database smoke checks have been run and cleaned up.
- [x] Current source has been deployed to the intended production target and production route/smoke checks have passed.
- [x] Future legal, payment, SMS, monitoring, and business-owner actions are written as explicit post-launch tasks instead of hidden blockers.

## User Request Coverage Checklist

- [x] Review ColumbusRealEstateNews.com without relying on stale prior assumptions.
  - Evidence: `docs/USER_REQUEST_COVERAGE_MATRIX_2026-08-29.md`.
- [x] Review similar real estate, apartment, media, data, and local-news companies.
  - Evidence: `docs/COMPETITIVE_RESEARCH_AND_LAUNCH_PLAN_2026-08-29.md`.
- [x] Treat the benchmark as a 50-company research universe.
  - Accuracy note: it should not be represented as a clean "top 50 by traffic" list unless a single current third-party ranking supports that exact claim.
- [x] Preserve what people most desire.
  - Inventory: homes, apartments, commercial properties, listings, deals.
  - Trust: verified availability, current data, source transparency, corrections.
  - Local context: schools, safety, commute, taxes, zoning, amenities, neighborhood feel.
  - Speed: alerts, saved searches, mobile browsing, instant contact/tour/application paths.
  - Confidence: market trends, price history, comps, rent estimates, affordability signals.
  - Professional help: agents, lenders, inspectors, property managers, attorneys, vendors.
  - Actionable next step: schedule tour, request offer, contact pro, download report, claim profile, advertise.
  - Status tracking: saved neighborhoods, followed developments, watched properties, campaign analytics.
  - Lead quality: advertisers want measurable inquiries, not vague impressions.
  - Authority: rankings, reports, events, deal sheets, market analysis, insider newsletters.
- [x] Preserve what CREN should emulate.
  - Zillow/Realtor/Redfin: saved searches, market stats, neighborhood pages, price history, mobile UX.
  - Apartments.com/RentCafe: apartment profiles, availability updates, tour scheduling, manager dashboard.
  - CoStar/Reonomy/ATTOM-style data providers: property intelligence, market reports, development pipeline.
  - The Real Deal/Bisnow: serious industry coverage, deal news, rankings, events, sponsored content with an editorial firewall.
  - 6AM City/Columbus Underground: newsletter-first local advertising and local-business sales.
  - BiggerPockets/Mashvisor/PropStream: investor education, calculators, deal sourcing, neighborhood scoring.
- [x] Position CREN as the Columbus housing intelligence company.
- [x] Keep journalism, sponsored content, profiles, and ads clearly separated.
- [x] Verify audience claims before using them in sales materials.
  - Evidence: `docs/CREN_VERIFIED_AUDIENCE_AND_MEDIA_KIT_BASELINE_2026-08-29.md`.
- [x] Build segmented newsletter capture.
  - Implemented in current form/data capture as role, cadence, and interest metadata; full behavioral segmentation remains a future automation.
- [x] Launch recurring editorial desks in the operating plan.
  - Residential, rental/apartment, development/policy, and lifestyle/neighborhood.
- [x] Add source/date/methodology requirements to market data.
- [x] Rebuild/organize website around user paths.
  - Buy, rent, sell, invest, advertise, find a pro, claim a profile.
- [x] Build apartment and professional backend profile readiness.
- [x] Create advertiser dashboard readiness.
- [x] Launch self-service advertising intake.
  - Accuracy note: no payment processor is connected yet; the public self-service route currently starts reviewed intake.
- [x] Create direct monthly sales packages for apartments, agents, lenders, vendors, and developers.
- [x] Add quarterly reports and events to the commercial operating plan.
- [x] Track completion by revenue, claimed profiles, newsletter growth, repeat advertisers, and data freshness.
- [x] List fully autonomous ideas.
- [x] List partial autonomous ideas requiring human review.
- [x] Add terms, policies, and legalese routes that should exist before scaling.
- [x] Create a remaining-steps checklist instead of leaving broad vague work.

## Local Product Completed

- [x] Policy index route: `/policies`.
- [x] Terms route: `/terms`.
- [x] Privacy route: `/privacy`.
- [x] Cookie and tracking route: `/cookies`.
- [x] Advertising terms route: `/advertising-terms`.
- [x] Sponsored content policy route: `/sponsored-content-policy`.
- [x] Fair housing route: `/fair-housing`.
- [x] Listing quality policy route: `/listing-quality-policy`.
- [x] Profile claim policy route: `/profile-claim-policy`.
- [x] Lead disclosure route: `/lead-disclosure`.
- [x] AI and automation route: `/ai-policy`.
- [x] Accessibility route: `/accessibility`.
- [x] Copyright/DMCA route: `/copyright`.
- [x] Submissions policy route: `/submissions-policy`.
- [x] Communications policy route: `/communications-policy`.
- [x] Policy pages use owner-execution status language rather than stale draft-gate wording.
- [x] Footer, human site map, XML sitemap, and release audit include the policy library.
- [x] Public media-kit/rate-card route: `/advertise/media-kit`.
- [x] Public self-service advertising intake route: `/advertise/self-service`.
- [x] Public profile-owner hub: `/profiles`.
- [x] Public profile-claim route: `/profiles/claim`.
- [x] Admin commercial operations route: `/admin/commercial`.
- [x] Admin commercial API route: `/api/admin/commercial`.
- [x] Admin navigation links to Commercial Ops.
- [x] Advertising page links to media kit, self-service advertising, and profile-owner routes.
- [x] Policy-page sidebar links to contact, profile claim, and advertising inquiry routes.
- [x] Mobile footer and journey-tab overflow fixes are included.

## Backend And Data Completed

- [x] `lib/compliance/policy-versions.ts` defines versioned owner-execution policy records.
- [x] `lib/compliance/consent-events.ts` records normalized consent events.
- [x] `lib/compliance/intake-records.ts` mirrors commercial and profile intakes.
- [x] `scripts/migrate-compliance-layer.mjs` creates compliance tables and seeds policy versions.
- [x] `scripts/migrate-profile-advertising-layer.mjs` creates profile, apartment, advertiser, campaign, asset, report, and lead-routing readiness tables.
- [x] `lib/db.ts` includes `policy_versions` and `consent_events`.
- [x] `policy_versions.status` default is `owner_execution_version`.
- [x] Lead form sends source route, form version, consent version, and lead-routing consent.
- [x] Contact form sends source route, form version, consent version, and contact permission.
- [x] Advertising inquiry form sends source route, form version, advertiser terms consent, and policy links.
- [x] Subscribe form sends source route, form version, email consent version, and email consent.
- [x] Join form sends Terms/Privacy acceptance and optional email consent.
- [x] Lead API requires consent and writes consent events.
- [x] Contact API requires consent and writes contact or advertiser consent events.
- [x] Subscribe API requires email consent and writes email consent events.
- [x] Member API requires Terms/Privacy acceptance and writes consent events.
- [x] Member API mirrors to subscribers only when email consent is given.
- [x] `profile_claim` persona exists for profile claim requests.
- [x] Profile-claim form copy uses profile-claim consent language and policy links.
- [x] Directory listing leads mirror into business profile, profile claim, and version tables.
- [x] Rental listing leads mirror into apartment profile, profile claim, and availability snapshot tables.
- [x] Advertising inquiries mirror into advertiser account, campaign, and ad asset tables.
- [x] Smoke cleanup includes `consent_events`, so production smoke can be removed cleanly.
- [x] Production-readiness audit checks required commercial tables and smoke residue.
- [x] Live editorial review reconciliation script exists for already-live queued rows.
- [x] Commercial report export exists: `scripts/export-commercial-report.mjs`.

## Sales, Advertising, And Media Completed

- [x] Sales and insertion-order plan: `docs/ADVERTISING_SALES_AND_INSERTION_ORDER_PLAN_2026-08-29.md`.
- [x] Verified audience/media-kit baseline: `docs/CREN_VERIFIED_AUDIENCE_AND_MEDIA_KIT_BASELINE_2026-08-29.md`.
- [x] First 50 advertiser prospect list: `docs/FIRST_ADVERTISER_TARGET_LIST_2026-08-29.md`.
- [x] Advertiser outreach package: `docs/CREN_ADVERTISER_OUTREACH_PACKAGE_2026-08-29.md`.
- [x] Advertiser outreach tracker: `docs/CREN_ADVERTISER_OUTREACH_TRACKER_2026-08-29.csv`.
- [x] Standalone owner-execution insertion-order template: `docs/CREN_INSERTION_ORDER_OWNER_EXECUTION_TEMPLATE_2026-08-29.md`.
- [x] Public pilot media kit avoids unverified "10,000+ subscribers" or "58% open rate" claims.
- [x] Public ad packages cover newsletter placements, sponsored content, apartment/property spotlights, directory/profile upgrades, report/event sponsorship, and custom programs.
- [x] Sponsored, paid, profile, and editorial separation is documented.
- [x] Advertiser reporting fields include impressions, clicks, leads, CTR, campaign/source, asset status, profile views, and renewal context.
- [x] Sales prospecting is documented around apartments, developers/builders, lenders, title, movers, inspectors, and home-service providers.

## Fully Autonomous Ideas Captured

- [x] Daily market pulse generator.
- [x] Neighborhood page updater.
- [x] Development tracker.
- [x] Apartment availability monitor.
- [x] Lead routing system.
- [x] Advertiser reporting.
- [x] Self-service ad portal.
- [x] Profile claiming workflow.
- [x] Newsletter segmentation.
- [x] Correction and source audit bot.
- [x] SEO content gap monitor.
- [x] Weekly sales prospect list.
- [x] Event sponsor matcher.
- [x] AI-assisted renter match.
- [x] Investor deal watch.
- [x] Public records digest.
- [x] Social clip generator.
- [x] Sales renewal automation.
- [x] Reputation monitor.
- [x] Paywall/lead magnet optimizer.

## Partial Autonomous Ideas Captured

- [x] Investigative development reporting.
- [x] Sponsored content drafting.
- [x] Agent/broker rankings.
- [x] Apartment rankings.
- [x] Neighborhood scores.
- [x] Sales outreach.
- [x] Media-kit updates.
- [x] Events programming.
- [x] Vendor directory moderation.
- [x] Market forecasts.
- [x] User-generated tips.
- [x] Partner data imports.
- [x] Sponsored research reports.
- [x] Newsletter assembly.
- [x] Correction handling.

## Recommended Product Build Order

- [x] 1. Analytics and source-of-truth cleanup.
- [x] 2. Homepage conversion/user-path rebuild.
- [x] 3. Newsletter segmentation capture.
- [x] 4. Advertiser/media kit.
- [x] 5. Apartment profile readiness.
- [x] 6. Pro/vendor profile readiness.
- [x] 7. Development tracker requirements.
- [x] 8. Self-service advertising intake.
- [x] 9. Advertiser dashboard/admin reporting.
- [x] 10. Events and quarterly reports plan.

## Verification Results

- [x] `npm run lint` passed with `eslint . --max-warnings 0`.
- [x] `npm run build` passed with `next build --webpack`; Next generated 107 static pages including policy, media-kit, self-service advertising, profile, and commercial admin routes.
- [x] `npm run test:image-pipeline` passed: 78 tests, 78 pass, 0 fail.
- [x] `npm run release:audit-local` passed against `http://127.0.0.1:3000` with 150 checked pages, 86 area hubs, 36 screenshots, and zero failures.
- [x] `npm run smoke:submissions -- --json` passed as a dry-run and produced consent-aware request plans for contact, subscribe, leads, and members.
- [x] `node --check scripts/migrate-compliance-layer.mjs` passed.
- [x] `node --check scripts/migrate-profile-advertising-layer.mjs` passed.
- [x] `node --check scripts/export-commercial-report.mjs` passed.
- [x] `node --check scripts/reconcile-live-editorial-review-jobs.mjs` passed.
- [x] Production compliance migration ran against the Neon production database.
- [x] Production profile/advertising migration ran against the Neon production database.
- [x] Production `policy_versions` contains 14 `owner_execution_version` rows with owner-execution approval metadata.
- [x] Production live editorial review queue was reconciled: 13 eligible already-live rows moved to `AUTO_PUBLISHED`; 0 blocked rows.
- [x] Production readiness audit passed on 2026-08-29 at 14:08:40 UTC with `ok: true` and `findings: []`.
- [x] Production readiness audit found 87 live articles, 73 `APPROVED` live review jobs, 14 `AUTO_PUBLISHED` live review jobs, and no live rows still queued.
- [x] Production smoke cleanup removed controlled test rows from contacts, subscribers, leads, members, and consent events.
- [x] Final production readiness audit found zero smoke rows in audience and consent tables.
- [x] Secret scan over app, components, lib, scripts, tests, docs, and package metadata found no literal database URLs or secret values.
- [x] `.env.production.local` is ignored by `.gitignore`.
- [x] Initial Vercel deploy attempts exposed a remote Turbopack/workflow loader failure.
- [x] Build path was hardened by making `@workflow/next` a direct dependency and switching production build to `next build --webpack`.
- [x] Next 16 page typing was hardened for `/contact` by changing `searchParams` to the Promise-shaped App Router contract.
- [x] Production deploy succeeded: `dpl_AFrXs6nu7Un6v18W9LV3wiH319c2`.
- [x] Production deployment URL: `https://frontend-rg9mbzui9-stephen-s-projects-96d9c6b4.vercel.app`.
- [x] Production aliases assigned to `https://columbusrealestatenews.com` and `https://www.columbusrealestatenews.com`.
- [x] Public route checks returned 200 for `/advertise/media-kit`, `/advertise/self-service`, `/profiles`, `/profiles/claim`, `/policies`, and `www` `/policies`.
- [x] Production submission smoke passed against `https://columbusrealestatenews.com` with run id `20260829t144117-1084ae87`.
- [x] Production smoke verified database rows for contacts id 10, subscribers id 19, leads id 10, and members id 9.
- [x] Post-smoke cleanup deleted 10 controlled rows: 1 contact, 2 subscribers, 1 lead, 1 member, and 5 consent events.
- [x] Final production readiness audit passed on 2026-08-29 at 14:41:37 UTC with `ok: true`, `findings: []`, and zero smoke rows.
- [x] Full production release audit passed against `https://columbusrealestatenews.com` with 150 checked pages, 86 area hubs, 36 screenshots, and zero failures.
- [x] Launch package committed as `f1d6a30 feat: launch CREN commercial readiness package`.
- [x] Launch package pushed to `origin/feat/site-map`.
- [x] Immediate post-launch monitoring log created: `docs/POST_LAUNCH_MONITORING_LOG_2026-08-29.md`.
- [x] Immediate post-launch monitoring caught alias drift to `dpl_5eiL97PTfp4iGWsEQ9DhgZApoxWv`, where new launch routes returned 404.
- [x] Apex and `www` aliases were corrected back to verified deployment `dpl_AFrXs6nu7Un6v18W9LV3wiH319c2`.
- [x] Post-correction route checks returned 200 for `/advertise/media-kit`, `/advertise/self-service`, and `/profiles/claim`.
- [x] Post-correction readiness audit passed on 2026-08-29 at 16:12:58 UTC with `ok: true`, `findings: []`, and zero smoke rows.
- [x] Recent Vercel production error-log checks returned no error entries.
- [x] Post-push recheck on 2026-08-29 at 16:25 UTC confirmed the custom domain still pointed to `dpl_AFrXs6nu7Un6v18W9LV3wiH319c2` and launch routes returned 200.
- [x] Launch monitor script added: `scripts/launch-monitor.mjs`.
- [x] Launch monitor package script added: `npm run newsroom:launch-monitor`.
- [x] 2026-08-30 launch monitor caught one newly live article missing `image_url` and one queued live review row.
- [x] The Shops on Lane article was repaired with a unique Blob hero, image alt text, and AI-generated editorial illustration caption.
- [x] The repaired article's review row was reconciled to `AUTO_PUBLISHED`.
- [x] Final 2026-08-30 readiness and launch-monitor checks returned `ok: true`, `findings: []`, zero smoke rows, 88 live articles, and no queued live rows.

## Production Launch Checklist

- [x] Deploy current source to the intended Vercel production target.
- [x] Verify the deployed production URL.
- [x] Run route checks for `/advertise/media-kit`, `/advertise/self-service`, `/profiles`, `/profiles/claim`, and `/policies`.
- [x] Run production submission smoke against the deployed production URL with database verification.
- [x] Clean up production smoke rows immediately after the smoke test.
- [x] Rerun production readiness audit and confirm `ok: true` and `findings: []`.
- [x] Update this `/goal` with the production URL, deploy result, smoke result, cleanup result, and final readiness result.

## Post-Launch Owner/Vendor Tasks

These are not blockers to the owner-execution launch package above. They are the remaining non-code actions that require a business owner, attorney, payment vendor, SMS/calling vendor, or the passage of time.

- [ ] Attorney/legal review if CREN wants to represent the policy pages as attorney-approved legal documents.
- [ ] Replace generic policy contact paths with final company mailing address, privacy contact, copyright contact, and advertiser contact if the owner wants those published directly on each policy.
- [ ] Decide whether final public policy labels should say `effective` instead of `owner execution version`.
- [ ] Configure payment processor only after price, refund, tax, dispute, invoice, and support decisions are final.
- [ ] Configure SMS/calling only after consent language, sender identity, opt-out process, vendor, and record-retention process are selected.
- [ ] Complete the first 48 hours of post-launch monitoring after deployment; this cannot truthfully be completed before 48 hours has elapsed.
- [x] Prepare first-wave outreach package, scripts, cadence, and tracker from the first 50-prospect list.
- [ ] Have CREN staff send outreach from the approved email/CRM account and record real dispositions.
- [ ] Have editorial leadership approve any ranking, score, forecast, sponsored research, or investigative story before publication.

## Done/Not Done Truth Table

| Area | Current status | Truth note |
| --- | --- | --- |
| Public policy library | Complete locally | Needs deployment verification on production URL. |
| Legalese content | Complete as owner-execution pages | Attorney approval is not claimed. |
| Competitive research | Complete as planning benchmark | Recheck before quoting traffic rankings publicly. |
| Backend requirements | Complete | Production migrations have been run. |
| Consent capture | Complete | Production smoke passed locally and was cleaned. |
| Profile/ad readiness schema | Complete | Admin operations and reporting routes now exist. |
| Advertising/sales plan | Complete | Public pilot media kit, IO template, baseline, and prospect list exist. |
| Autonomous ideas | Complete as roadmap | Scheduling/CI implementation is a later product build. |
| Local verification | Complete | Lint, build, tests, audit, smoke, and syntax checks passed. |
| Production launch | Complete | Deployment, aliases, route checks, production smoke, cleanup, readiness audit, and production page audit passed. |

## Stop Condition

Close the `/goal` only after:

- [x] All local verification checklist items pass.
- [x] The production database migrations and readiness cleanup are done.
- [x] The main checklist and `NOTES.md` record the exact completion state.
- [x] The current source is deployed to production.
- [x] The production URL is smoke-tested and cleaned.
- [x] A final production readiness audit passes after smoke cleanup.
