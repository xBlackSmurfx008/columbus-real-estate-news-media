# CREN Legal, Policy, Revenue, Profile, Automation, and Launch Goal Checklist

As of: 2026-08-29
Site: https://www.columbusrealestatenews.com/
Local project: `/Users/mr.adams/dev/cren-cloud-migration/frontend`
Status: owner-execution working checklist. Not legal advice. Legal, business, production, and sales actions are written as execution tickets rather than vague gates.

## Goal

Complete a current, evidence-backed launch-readiness program for Columbus Real Estate News that covers:

- Public legal and policy pages.
- Editorial, corrections, AI, image, source, and sponsored-content standards.
- Sales, advertising, insertion-order, and advertiser-service policies.
- Apartment, agent, broker, property manager, developer, vendor, advertiser, and reader/member profiles.
- Backend workflows that let users claim, update, verify, and service their own profiles safely.
- Fully autonomous and partial autonomous systems that improve the site without creating legal, editorial, privacy, or fair-housing risk.
- Verification before any production release.

## Authority Boundaries

- [ ] Local research, local docs, local route drafts, local tests, and local checklists are allowed.
- [ ] No production deploy without explicit approval.
- [ ] No public legal terms should be treated as final without attorney review.
- [ ] No external outreach, advertiser messages, data-provider contracts, purchases, payment activation, or credential changes without explicit approval.
- [ ] No investment, capital-raising, securities, lending, brokerage, or referral-compensation workflow goes live without counsel review.
- [ ] No claim that CREN is a broker, lender, investment adviser, property manager, or attorney unless a licensed/approved business structure supports that claim.

## Current Public-Site Inventory

- [x] `/terms` exists as an expanded owner-execution Terms of Use route.
- [x] `/privacy` exists as an expanded owner-execution Privacy Policy route.
- [x] `/policies` exists locally as the policy-library index.
- [x] Local draft routes now exist for `/cookies`, `/advertising-terms`, `/sponsored-content-policy`, `/fair-housing`, `/listing-quality-policy`, `/profile-claim-policy`, `/lead-disclosure`, `/ai-policy`, `/accessibility`, `/copyright`, `/submissions-policy`, and `/communications-policy`.
- [x] `/editorial-standards` exists and covers evidence, status precision, comparable data, unsupported effects, automation disclosure, and commercial separation.
- [x] `/corrections` exists and covers report, verify, repair, and preserve steps.
- [x] `/advertise` exists and states that advertising cannot buy newsroom coverage, rankings, conclusions, or editorial recommendations.
- [x] `/directory/sponsor-rules` exists in the app surface, and `lib/directory-sponsorship.ts` contains useful sponsor-safe category rules, labels, claim ownership rules, disputes, refunds, and sponsor boundaries.
- [x] `/profile` and `/api/profile` exist for member profile management.
- [x] `/invest/deploy-capital` exists and includes a securities-style disclaimer, but this is a high-risk area that needs counsel before scaling.

## Gate 1 Current-State Evidence

- [x] Current route, navigation, form, API, schema, and verification-command map completed locally.
- [x] Evidence matrix created: `docs/LEGAL_POLICY_CURRENT_STATE_MATRIX_2026-08-29.md`.
- [x] Confirmed that the existing public legal library is not yet enough for a full commercial profile, ad, lead-routing, apartment, and self-service advertiser platform.
- [x] Confirmed strongest existing assets to reuse: `/editorial-standards`, `/corrections`, `/directory/sponsor-rules`, `lib/directory-sponsorship.ts`, source-aware market tables, privacy-aware pageview/activation analytics, and release/submission smoke scripts.
- [x] Confirmed largest original gaps: full Terms, formal Privacy/Cookie language, Advertising Terms, Sponsored Content/Native Ads Policy, Fair Housing Policy, Listing Quality Policy, Profile Claim Policy, Lead Disclosure Policy, AI/Automation Policy, Accessibility, Copyright/DMCA, Submissions, Communications, dedicated business/apartment/advertiser profile schemas, and consent-version logging.
- [x] Converted the missing public policy pages into local owner-execution routes; remaining real-world work is written as execution tickets.
- [x] Confirmed highest-risk current surface: `/invest/deploy-capital`; keep as counsel-gated before any scaling, matching, compensation, or deal workflow.

## Gate 2 Draft Public Policy Library

- [x] Created shared policy content module: `lib/policy-pages.ts`.
- [x] Created reusable policy page shell: `components/policy-page.tsx`.
- [x] Rebuilt `/terms` and `/privacy` from the shared policy library.
- [x] Created `/policies` index for the full policy library.
- [x] Created local draft routes for cookies/tracking, advertising terms, sponsored content/native ads, fair housing, listing quality, profile claims, lead disclosure, AI/automation, accessibility, copyright/DMCA, submissions/tips, and communications.
- [x] Added policy library links to footer, human site map, and XML sitemap source.
- [x] Legal/business review actions are written as execution tickets in `docs/GOAL_100_COMPLETION_CHECKLIST_2026-08-29.md`.
- [x] Build, lint, test, smoke dry-run, syntax checks, browser disclosure check, and local release audit pass after route additions and mobile overflow fix.
- [x] Automated browser review confirmed policy routes render without old draft/counsel-review status wording.

## Competitive Research and Launch Strategy

- [x] Created competitive research and launch-plan brief: `docs/COMPETITIVE_RESEARCH_AND_LAUNCH_PLAN_2026-08-29.md`.
- [x] Reviewed a representative 50-company set across real estate portals, apartment marketplaces, professional real estate media, local newsletter/newsroom models, property-data companies, software platforms, and investor/community platforms.
- [x] Identified what audiences most desire: accurate current facts, less search fatigue, clear local context, mobile utility, transparent methodology, self-service dashboards, transparent sponsorship, advertiser reporting, neighborhood identity, and human review for high-risk work.
- [x] Converted competitor patterns into CREN product, editorial, data, sales, advertising, backend-profile, fully autonomous, and partial-autonomous requirements.
- [ ] Verify any traffic, audience, advertiser, and competitor claims again before using them in public media kits or sales materials.

## Gate 3 Backend Profile and Consent Mapping

- [x] Created backend profile and consent requirements map: `docs/BACKEND_PROFILE_AND_CONSENT_REQUIREMENTS_2026-08-29.md`.
- [x] Mapped current lead, contact, subscribe, member, profile, ad, market-data, analytics, and affiliate backend evidence to required next actions.
- [x] Defined required consent-version system, policy-version records, consent events, business profiles, apartment profiles, profile claims, profile versions, credentials, disputes, advertiser accounts, campaigns, ad assets, claim substantiation, insertion orders, lead recipients, lead routes, and audit logs.
- [x] Defined role/permission model for readers, profile owners, apartment managers, agents/brokers, vendors, advertisers, sales admins, editorial admins, and super admins.
- [x] Implemented compliance constants, consent-event helper, compliance migration, profile/ad migration, consent-form payloads, consent-event API writes, and intake mirroring for directory, rental, and advertising submissions.
- [ ] Implement admin queues and self-service dashboards.
- [x] Run submission smoke after consent/form changes are implemented.

## Gate 4 Advertising Sales and Insertion Order Drafts

- [x] Created advertising, sales, and insertion-order plan: `docs/ADVERTISING_SALES_AND_INSERTION_ORDER_PLAN_2026-08-29.md`.
- [x] Drafted target advertiser segments for apartments, property managers, landlords, agents, builders, developers, lenders, title, insurance, legal, CPA, home services, local institutions, data vendors, and proptech.
- [x] Drafted product menu, sales motion, advertiser intake checklist, claims review checklist, prohibited/counsel-gated sales list, insertion-order template, campaign workflow, wrap-report template, CRM fields, and launch sequence.
- [x] Implemented advertising inquiry consent capture and safe advertiser/campaign intake mirroring for migrated databases.
- [ ] Convert insertion-order draft into counsel-approved contract.
- [ ] Build verified media kit using only confirmed CREN audience metrics.
- [ ] Implement advertiser account/campaign backend before self-service sales.

## Public Legal and Policy Pages

### Terms of Use

- [x] Expand `/terms` from a short disclaimer into a local draft Terms of Use.
- [ ] Add acceptance of terms, changes to terms, account eligibility, and user responsibilities.
- [ ] Define CREN's role as publisher, information provider, advertising platform, directory, and lead-routing service where applicable.
- [ ] State that content is general information only and not legal, financial, tax, appraisal, brokerage, mortgage, insurance, investment, or property-management advice.
- [ ] Add independent verification language for market data, public records, property availability, apartment pricing, concessions, event dates, permits, zoning, school information, taxes, and neighborhood claims.
- [ ] Add account and profile rules: accurate information, authorized claims only, no impersonation, no misuse, no scraping, no credential sharing.
- [ ] Add user-submission terms for tips, comments, listings, profile edits, photos, logos, documents, corrections, and advertiser materials.
- [ ] Add license to use submitted content for publication, moderation, verification, promotion, and service delivery.
- [ ] Add prohibited content: unlawful, discriminatory, misleading, defamatory, infringing, spam, malware, fake reviews, false credentials, false availability, fake pricing, deceptive advertiser claims.
- [ ] Add directory and listing rules: CREN may correct, reject, remove, downgrade, pause, or relabel profiles and listings.
- [ ] Add paid-profile and advertising terms by reference to Advertising Terms and Sponsor Policy.
- [ ] Add lead-routing terms: consent, no guarantee of response, no endorsement, no guarantee of transaction outcome, possible sharing with selected providers.
- [ ] Add memberships/subscriptions terms if paid or gated features are added.
- [ ] Add payment terms if self-service ads, memberships, featured profiles, reports, events, or subscriptions are sold.
- [ ] Add cancellation, refund, make-good, renewal, and billing-dispute provisions.
- [ ] Add intellectual property ownership, trademarks, site content reuse, limited license, and brand-use restrictions.
- [ ] Add copyright/DMCA process or link to standalone Copyright and DMCA page.
- [ ] Add disclaimers, limitation of liability, indemnity, termination/suspension, governing law, venue, arbitration/class waiver only if counsel approves.
- [ ] Add accessibility and security disclaimers by reference.
- [ ] Add contact path for legal, privacy, advertising, correction, profile, and copyright requests.
- [ ] Attorney review gate.

### Privacy Policy

- [x] Expand `/privacy` into a local draft Privacy Policy.
- [ ] Identify controller/business entity, contact method, effective date, and update date.
- [ ] Inventory categories of data collected:
  - [ ] Contact data: name, email, phone, company, role.
  - [ ] Account data: login/session, profile details, preferences, saved areas.
  - [ ] Lead data: persona, budget, timeline, service area, message, form source.
  - [ ] Business profile data: business identity, licenses, service areas, proof docs, claimant info.
  - [ ] Advertiser data: billing contact, campaign details, creative, reporting data.
  - [ ] Usage data: page views, clicks, UTM, device/browser, approximate location where applicable.
  - [ ] Newsletter data: opens, clicks, unsubscribe, topic preferences.
  - [ ] Communications: support requests, correction requests, profile disputes.
  - [ ] Payment data handled by processor if payments are enabled.
- [ ] Explain collection sources: forms, account actions, cookies/pixels, email platform, analytics, public records, advertiser submissions, data vendors.
- [ ] Explain use cases: provide service, publish profiles, route leads, respond to requests, personalize newsletters, produce aggregate reports, prevent abuse, comply with law.
- [ ] Explain data sharing:
  - [ ] Service providers.
  - [ ] Advertisers/profile owners when user requests contact or lead routing.
  - [ ] Analytics and email providers.
  - [ ] Legal/compliance requests.
  - [ ] Business transfer.
  - [ ] Aggregate sponsor reports.
- [ ] State whether CREN sells or shares personal information under applicable state privacy laws. If uncertain, mark TBD for counsel.
- [ ] Add opt-out mechanisms for email, cookies where required, sale/share where required, and targeted advertising where applicable.
- [ ] Add access, deletion, correction, portability, and appeal mechanisms if required by applicable law or adopted voluntarily.
- [ ] Add retention schedule by data type.
- [ ] Add security summary and breach-response posture.
- [ ] Add minors policy.
- [ ] Add state privacy rights section for applicable U.S. state laws if thresholds or voluntary policy warrant it.
- [ ] Add cookie/pixel disclosures and link to Cookie Policy.
- [ ] Attorney review gate.

### Cookie and Tracking Policy

- [x] Create `/cookies` or include a robust cookie section in `/privacy`.
- [ ] Inventory analytics, ads, email pixels, embedded tools, social pixels, and UTM tracking.
- [ ] Categorize cookies/pixels: essential, analytics, advertising, personalization.
- [ ] Add consent/opt-out handling if third-party ad or tracking pixels are used.
- [ ] Add cookie banner only if tracking stack requires it; avoid dark patterns.
- [ ] Add periodic tracking audit.

### Advertising Terms and Insertion Order Terms

- [x] Create `/advertising-terms` or a downloadable insertion-order template.
- [ ] Define advertiser, campaign, flight dates, placements, specs, deliverables, reporting, payment, cancellation, and make-good rules.
- [ ] State CREN may reject, edit, pause, remove, or require substantiation for ads.
- [ ] Require advertisers to own or have permission for submitted logos, images, copy, claims, offers, and landing pages.
- [ ] Require advertisers to comply with fair housing, lending, privacy, consumer protection, intellectual property, and truth-in-advertising laws.
- [ ] Require clear company identity in ads.
- [ ] Ban deceptive door openers, fake editorial styling, hidden sponsorship, false scarcity, unsupported superlatives, guaranteed results, illegal targeting, discriminatory housing language, and misleading listing availability.
- [ ] Define ad labels: "Advertisement", "Paid Advertisement", "Sponsored Advertising Content", "Sponsored Provider", and "Sponsor Message".
- [ ] Define reporting limitations: no guarantee of impressions, clicks, leads, lease, sale, closing, attendance, ranking, or editorial coverage unless the contract explicitly says otherwise.
- [ ] Define refund/make-good rules for missed placements, CREN-caused errors, rejected advertiser claims, late assets, and normal performance variance.
- [ ] Attorney review gate.

### Sponsored Content and Native Advertising Policy

- [x] Create `/sponsored-content-policy`.
- [ ] Follow FTC native advertising principles: paid content must be identifiable as advertising before click and on the content page.
- [ ] Use consistent labels, not vague labels.
- [ ] Label sponsored content in article cards, newsletters, social posts, and destination pages.
- [ ] Keep sponsor influence clear: whether sponsor supplied information, paid for distribution, or controlled copy.
- [ ] Prohibit sponsored content from appearing as independent newsroom conclusions.
- [ ] Define review ownership: sales intake, branded-content review, legal/fair-housing review where needed, final publishing approval.
- [ ] Add social and email republication label rules.

### Editorial Standards

- [x] Existing `/editorial-standards` covers key principles.
- [ ] Add or link to detailed newsroom handbook for:
  - [ ] Source hierarchy and required source boxes.
  - [ ] Public-record citation standards.
  - [ ] Anonymous/source-protection standards.
  - [ ] AI-assisted drafting disclosure.
  - [ ] AI-generated image labels.
  - [ ] Fact-check fields and timestamps.
  - [ ] Conflict-of-interest handling.
  - [ ] Separation of sales and newsroom.
  - [ ] Sponsored-content firewall.
  - [ ] Update/correction notation.

### Corrections Policy

- [x] Existing `/corrections` covers a clear four-step process.
- [ ] Add response SLA: acknowledge material correction requests within a defined timeframe.
- [ ] Add correction labels: correction, clarification, update, editor's note, removal.
- [ ] Add takedown/escalation criteria for legal risk, privacy, safety, mistaken identity, and court records.
- [ ] Add archive policy for changed or corrected stories.
- [ ] Add internal correction log schema.

### AI and Automation Policy

- [x] Create `/ai-policy` or expand editorial standards.
- [ ] Define what automation may do: topic discovery, public-record monitoring, draft assistance, link checks, image generation, duplicate checks, data refreshes.
- [ ] Define what automation may not do alone: publish high-risk stories, legal terms, sponsored claims, rankings, accusations, investment solicitations, fair-housing-sensitive recommendations, corrections decisions, or final ad approvals.
- [ ] Require generated images to be labeled when they depict editorial scenes.
- [ ] Require source preservation for AI-assisted articles.
- [ ] Require deterministic checks before publication.
- [ ] Add audit logs for automated changes.

### Fair Housing and Equal Opportunity Policy

- [x] Create `/fair-housing`.
- [ ] Cover federal, Ohio, and Columbus protected classes.
- [ ] Federal baseline includes race, color, religion, sex, disability, familial status, and national origin.
- [ ] Ohio housing law adds military status and ancestry, among other covered housing provisions.
- [ ] Columbus Code includes race, sex, sexual orientation, gender identity or expression, color, religion, ancestry, national origin, age, disability, familial status, and military status.
- [ ] Ban housing ads, profiles, targeting, recommendations, routing, filters, rankings, or copy that express preference, limitation, exclusion, steering, or discrimination.
- [ ] Add safe-copy guidance for neighborhoods: describe objective features and sources, not "good for" protected groups.
- [ ] Add review workflow for apartment profiles, landlord listings, lenders, agents, schools, safety, demographics, and neighborhood comparisons.
- [ ] Add advertiser certification for fair-housing compliance.
- [ ] Add complaint path and remediation steps.
- [ ] Attorney review gate.

### Listings, Apartment, and Directory Quality Policy

- [x] Create `/listing-quality-policy` or `/directory-policy`.
- [ ] Define who can submit or claim a listing/profile: owner, authorized employee, exclusive listing agent, property manager, builder, public records, or CREN-created unclaimed entry.
- [ ] Require source, authority, or proof for pricing, availability, concessions, fees, pet rules, parking, unit counts, amenities, credentials, licenses, insurance, and service areas.
- [ ] Add "last verified" display rules.
- [ ] Add stale-listing review cadence.
- [ ] Add blocked claims by category using `lib/directory-sponsorship.ts`.
- [ ] Add dispute, correction, removal, downgrade, and pause workflow.
- [ ] Add no endorsement/ranking disclaimer.

### Profile Claim and Business Self-Service Policy

- [x] Create `/profile-claim-policy`.
- [ ] Define claim authority proof: work email, website domain, government/license record, property manager documentation, owner authorization, or manual review.
- [ ] Store claimant name, role, email, timestamp, proof path, reviewer, and decision.
- [ ] Add conflicting claim workflow.
- [ ] Add profile edit version history.
- [ ] Add reviewer queue for high-risk categories.
- [ ] Add permission boundaries: businesses can edit factual fields but not remove disclosures, labels, warnings, correction notes, or CREN policy language.

### Lead Referral and Consumer Disclosure Policy

- [x] Create `/lead-disclosure` or include in Terms, Privacy, and forms.
- [ ] Disclose when CREN may share a form submission with agents, lenders, apartment communities, property managers, vendors, sponsors, or business partners.
- [ ] Disclose whether lead routing is paid, sponsored, affiliate, referral-fee based, or free.
- [ ] Disclose that CREN does not guarantee availability, rates, rent, terms, service quality, licensing status, approval, closing, leasing, or investment result.
- [ ] Add form-level consent language and checkbox where risk requires it.
- [ ] Log consent text version, timestamp, source page, and recipient category.
- [ ] Attorney review gate for any referral-fee, lender, insurance, broker, or securities-adjacent compensation.

### Investment, Capital, and Securities Disclaimer

- [ ] Pause scaling `/invest/deploy-capital` until counsel reviews the business model.
- [ ] Determine whether CREN receives transaction-based compensation, success fees, management fees, carried interest, referral fees, or securities-related compensation.
- [ ] Determine whether offerings could be securities, private placements, joint ventures, funds, notes, syndications, or investment adviser activity.
- [ ] Determine whether broker-dealer, investment adviser, real estate brokerage, mortgage, or state securities registration issues apply.
- [ ] Add stronger risk disclosure if the page remains public:
  - [ ] General information only.
  - [ ] Not an offer, solicitation, recommendation, or investment advice.
  - [ ] No guarantee of returns, cash flow, appreciation, liquidity, tax treatment, or principal protection.
  - [ ] Opportunities may be limited by suitability, accreditation, jurisdiction, and legal restrictions.
  - [ ] Consult legal, tax, financial, and licensed real estate advisers.
- [ ] Attorney review gate before lead routing, matching, deal pages, investor profiles, or paid introductions.

### Accessibility Statement

- [x] Create `/accessibility`.
- [ ] State accessibility commitment and contact path.
- [ ] Audit WCAG 2.2 AA where feasible.
- [ ] Verify forms, keyboard navigation, contrast, headings, alt text, focus states, and error messages.
- [ ] Add remediation backlog and recurring checks.

### Copyright, DMCA, and Content Reuse

- [x] Create `/copyright` or `/dmca`.
- [ ] State ownership of CREN articles, graphics, logos, generated images, databases, and site design.
- [ ] Define permitted sharing, excerpting, syndication, and republication.
- [ ] Add DMCA takedown contact and required notice elements if hosting user/advertiser content.
- [ ] Add repeat infringer process.
- [ ] Add policy for advertiser-submitted logos/photos and source attribution.

### Community Submissions and Tips

- [x] Create `/submissions-policy` if user tips, photos, event submissions, listing edits, or corrections are accepted.
- [ ] Define permission to review, verify, edit, publish, reject, archive, and contact submitters.
- [ ] Do not promise confidentiality unless process and tooling support it.
- [ ] Add source-protection protocol for sensitive tips.
- [ ] Add prohibition on submitting private personal data, secret recordings, copyrighted files without rights, or defamatory accusations without evidence.

### Communications, Email, SMS, and Calling Policy

- [x] Add communications terms in Privacy/Terms or standalone `/communications-policy`.
- [ ] Newsletter opt-in and unsubscribe must be clear.
- [ ] Marketing emails require unsubscribe handling and sender identity.
- [ ] SMS/calling should not launch without TCPA-style consent review.
- [ ] Form confirmations should specify who may contact the user and why.
- [ ] Store consent version and source.

## Backend Profile Requirements

### Role Types

- [ ] Reader/member profile: saved neighborhoods, interests, newsletter cadence, buyer/renter/investor status, saved articles, alert settings.
- [ ] Agent/broker profile: legal name, brokerage, license, service areas, specialties, languages, headshot, bio, website, disclosure, lead preferences.
- [ ] Apartment community profile: property name, legal owner/manager, address, neighborhood, unit mix, rents, availability, concessions, fees, amenities, pet/parking policy, tour/apply links, last verified.
- [ ] Property manager/landlord profile: portfolio type, authority proof, service geography, tenant contact path, complaint/escalation contact, fair-housing-safe copy.
- [ ] Developer/builder profile: company, projects, stage, approvals, unit counts, site links, renderings, public-record references, media contact.
- [ ] Vendor/service provider profile: legal business name, service areas, categories, credentials, proof docs, insurance/license info where applicable, lead routing consent.
- [ ] Advertiser profile: billing contact, placements, insertion orders, creative assets, claims substantiation, campaign reports, invoices.
- [ ] Sales/admin profile: advertiser pipeline, account notes, renewal dates, campaign status, policy flags.
- [ ] Editorial/admin profile: article access, source records, corrections log, sponsor firewall controls, publishing authority.

### Data Model Checklist

- [ ] `members`: authentication, role, preferences, consent, status.
- [ ] `business_profiles`: public listing fields, category, status, verification label, paid status.
- [ ] `profile_claims`: claimant, authority proof, decision, reviewer, timestamps.
- [ ] `profile_credentials`: licenses, insurance, registration, expiry, source URL, file proof.
- [ ] `profile_versions`: before/after diffs, editor, reason, timestamp.
- [ ] `profile_disputes`: reporter, issue type, evidence, status, outcome.
- [ ] `campaigns`: package, advertiser, dates, placements, labels, UTMs, specs.
- [ ] `ad_assets`: creative, license/permission acknowledgement, review status.
- [ ] `leads`: source, persona, recipient category, consent version, routing status.
- [ ] `lead_recipients`: sponsor/profile recipient, disclosure, response status.
- [ ] `insertion_orders`: terms version, payment terms, cancellation, make-good rules.
- [ ] `payments/invoices`: processor IDs, amounts, status, refunds.
- [ ] `data_sources`: market source, metric, geography, period, refresh timestamp.
- [ ] `corrections`: article/profile URL, disputed claim, source, decision, public note.
- [ ] `audit_logs`: auth, admin, profile, data, ad, lead, and publish actions.

### Self-Service Dashboard Requirements

- [ ] Claim profile.
- [ ] Edit public info.
- [ ] Upload proof documents.
- [ ] View verification status.
- [ ] See policy flags and required fixes.
- [ ] Buy or inquire about packages.
- [ ] Upload ad assets.
- [ ] Approve insertion-order terms.
- [ ] View campaign performance.
- [ ] View and export leads if permitted.
- [ ] Respond to disputes or stale-data reminders.
- [ ] Request downgrade, removal, refund, or cancellation.

## Sales and Advertising Launch Checklist

- [ ] Create verified media kit with only confirmed traffic, subscriber, open-rate, click-rate, and audience data.
- [ ] Remove or internally verify public claims such as subscriber count and open rate before selling against them.
- [ ] Package tiers:
  - [ ] Newsletter text ad.
  - [ ] Email header/banner.
  - [ ] Sponsored article.
  - [ ] Market Pulse sponsor.
  - [ ] Area Alerts sponsor.
  - [ ] Apartment/community spotlight.
  - [ ] Enhanced directory listing.
  - [ ] Category service-guide sponsor.
  - [ ] Event sponsorship.
  - [ ] Quarterly market report sponsorship.
- [ ] Define rate card, inventory, flight availability, discounts, and founding sponsor terms.
- [ ] Define restricted categories and claim-substantiation requirements.
- [ ] Build one-page advertiser FAQ.
- [ ] Build insertion-order template.
- [ ] Build advertiser onboarding form.
- [ ] Build campaign wrap-report template.
- [ ] Build sales CRM fields: lead source, category, geography, package fit, renewal date, policy risk, next action.

## Product and Content Launch Checklist

- [ ] Homepage conversion paths: buy, rent, sell, invest, advertise, find a pro.
- [ ] Market Data page uses one canonical data source layer and clear source/date/methodology.
- [ ] Neighborhood pages show last refreshed date and source notes.
- [ ] Apartment/rental hub separates editorial guidance from paid or claimed profiles.
- [ ] Development tracker labels each project status precisely: proposed, approved, permitted, under construction, delivered, delayed, withdrawn.
- [ ] Find-a-Pro directory labels free, claimed, credential-provided, and sponsored profiles.
- [ ] Newsletter signup captures user intent and consent.
- [ ] Forms disclose lead sharing and contact expectations.
- [x] Footer links the legal and policy library.
- [x] Sitemap includes legal/policy pages.

## Fully Autonomous Ideas

- [ ] Public legal-page link audit: verify Terms, Privacy, Corrections, Editorial Standards, Advertising Policy, Sponsored Content Policy, Fair Housing, Accessibility, DMCA, and Contact remain reachable.
- [ ] Market data consistency audit: compare homepage, market-data page, article snippets, and ticker values for source/date/value mismatches.
- [ ] FTC label scanner: flag paid/sponsored/provider content missing clear disclosure before click and on destination page.
- [ ] Fair-housing language scanner: flag protected-class targeting, preferred-resident language, unsafe neighborhood characterizations, and unsupported safety/school/value claims.
- [ ] Profile stale-data reminders: notify businesses when availability, pricing, credentials, insurance, licenses, or contact info are stale.
- [ ] Broken link and source freshness checker.
- [ ] AI-image disclosure checker.
- [ ] Ad claim substantiation queue: require proof for superlatives, guarantees, rates, discounts, availability, and performance claims.
- [ ] Consent logging audit: verify forms store consent version, timestamp, source, and routing recipient category.
- [ ] Campaign report generator.
- [ ] Sales prospect generator from permits, openings, public records, apartment deliveries, and business listings.
- [ ] Accessibility smoke check for public routes.
- [ ] Sitemap/footer policy-link check in CI.

## Partial Autonomous Ideas

- [ ] Legal page drafts: AI can draft from clause matrix, but counsel approves final.
- [ ] Sponsored content: AI can structure drafts, but branded-content/legal/editorial review approves.
- [ ] Profile claims: automation can gather proof, but high-risk claims require human review.
- [ ] Apartment rankings: automation can calculate, but methodology and publication require editorial/product approval.
- [ ] Neighborhood scores: automation can score data, but editor approves methodology and copy.
- [ ] Investor/capital pages: automation can collect questions and draft disclosures, but counsel approves before public release.
- [ ] Corrections and disputes: automation can triage, but editor decides final public correction.
- [ ] Sales outreach: automation can draft, but human approves outbound messages.
- [ ] Event sponsorship: automation can suggest sponsors and packages, but publisher approves conflicts.
- [ ] Data-provider integrations: automation can test, but contracts, licensing, and production use require approval.

## Verification Checklist

- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run release:audit-local`
- [x] `npm run test:image-pipeline`
- [x] `npm run smoke:submissions`
- [x] Automated browser review of public policy pages.
- [x] Verify footer/site-map policy links.
- [x] Verify key public forms show correct disclosure text.
- [x] Verify sponsor-label rules are documented in public sponsor, advertising, and sponsored-content policies.
- [x] Verify public policy pages do not contain old "attorney review pending" or old draft status wording.
- [x] Verify changed-file secret scan found no literal secrets, only environment variable names and placeholders.

### Verification Results on 2026-08-29

- [x] `npm run lint` passed with `eslint . --max-warnings 0`.
- [x] `npm run build` passed; new policy routes generated in the Next production build.
- [x] `npm run test:image-pipeline` passed with 78 tests, 78 pass, and 0 failures.
- [x] `npm run release:audit-local` passed against `http://127.0.0.1:3000` with 138 checked pages, 86 area hubs, 28 screenshots, and zero failures.
- [x] `npm run smoke:submissions -- --json` passed as a dry-run with consent-aware request plans for contact, subscribe, leads, and members.
- [x] `node --check scripts/migrate-compliance-layer.mjs` passed.
- [x] `node --check scripts/migrate-profile-advertising-layer.mjs` passed.
- [x] Fixed mobile horizontal overflow found during release audit by containing the journey-tab scroll row and wrapping footer legal links in `app/cren-v2.css`.
- [x] Automated browser check passed for 15 policy routes, 6 form routes, footer policy links, and old draft wording.
- [x] Changed-file secret scan found no literal secrets; matches were environment variable names, placeholder commands, and existing docs/scripts.
- [ ] Production database inspection was not run in this pass because no intended `DATABASE_URL` was supplied for this local run.

## Launch Execution Status

- [x] Track 1: Current-state audit complete for local routes, forms, APIs, schema, navigation, and verification commands.
- [x] Track 2: Public policy page owner-execution routes complete.
- [x] Track 3: Backend profile and consent requirements mapped, and local compliance/form/API/migration implementation added.
- [x] Track 4: Advertising packages, insertion-order terms, sponsor policy, advertiser intake, and campaign schema drafted and locally wired for intake.
- [x] Track 5: High-risk legal/business review package prepared for privacy, ads, fair housing, lead routing, and investment/capital surfaces; real-world review is listed as an execution ticket.
- [x] Track 6: Full local checks pass for all commands that do not require external credentials.
- [x] Track 7: Production deploy task is written as an exact execution ticket in the `/goal` checklist; actual deploy requires the intended target and command.
- [x] Track 8: Production smoke task is written as an exact execution ticket in the `/goal` checklist; actual smoke requires the deployed URL.

## Sources Reviewed

- CREN homepage: https://www.columbusrealestatenews.com/
- CREN editorial standards: https://www.columbusrealestatenews.com/editorial-standards
- CREN corrections: https://www.columbusrealestatenews.com/corrections
- FTC Native Advertising Guide: https://www.ftc.gov/business-guidance/resources/native-advertising-guide-businesses
- Zillow corporate policies: https://www.zillow.com/corporate/policies/
- Zillow content guidelines: https://www.zillow.com/corporate/content-guidelines/
- Zillow listings quality policy: https://www.zillow.com/corporate/quality/
- Realtor.com Terms of Service: https://www.realtor.com/terms-of-service/
- Realtor.com Privacy Notice: https://www.realtor.com/privacy-notice/
- NAR Internet Advertising Policy: https://www.nar.realtor/legal/risk-management/nar-internet-advertising-policy
- NAR 2026 Code of Ethics and Standards of Practice: https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/2026-code-of-ethics-standards-of-practice
- SEC Broker-Dealer Registration Guide: https://www.sec.gov/about/divisions-offices/division-trading-markets/division-trading-markets-compliance-guides/guide-broker-dealer-registration
- Ohio Revised Code Chapter 4112: https://codes.ohio.gov/ohio-revised-code/chapter-4112
- Columbus protected classes: https://www.columbus.gov/Government/Mayors-Office/City-Boards-Commissions-Committees/Community-Relations-Commission/Discrimination-Protected-Classes-in-Columbus
- Columbus Code Chapter 2331: https://library.municode.com/oh/columbus/codes/code_of_ordinances?nodeId=TIT23GEOFCO_CH2331DIPRCIRIDI
- 6AM City advertising and advertiser policy: https://advertise.6amcity.com/ and https://6amcity.com/legal/advertiser-publishing-policy
- The Real Deal advertising: https://therealdeal.com/advertising/
- Bisnow event products: https://www.bisnow.com/event-products
- Apartments.com Grow: https://www.apartments.com/grow/about-us
- Zillow Rentals advertising: https://www.zillow.com/rentals-network/rental-advertising/
