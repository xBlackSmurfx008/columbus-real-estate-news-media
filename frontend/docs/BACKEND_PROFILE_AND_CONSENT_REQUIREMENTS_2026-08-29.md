# CREN Backend Profile and Consent Requirements

As of: 2026-08-29
Project: `/Users/mr.adams/dev/cren-cloud-migration/frontend`
Status: local advisory implementation plan. No production database changes were made.

## Purpose

This document maps CREN's desired self-service, advertising, apartment, directory, and lead-routing future to the backend that exists today. It is the Gate 3 companion to:

- `docs/LEGAL_POLICY_LAUNCH_GOAL_CHECKLIST_2026-08-29.md`
- `docs/LEGAL_POLICY_CURRENT_STATE_MATRIX_2026-08-29.md`
- `docs/COMPETITIVE_RESEARCH_AND_LAUNCH_PLAN_2026-08-29.md`

## Current Backend Evidence

| Current surface | Evidence | Current capability | Gap before self-service launch |
| --- | --- | --- | --- |
| Leads | `app/api/leads/route.ts`, `scripts/migrate-lead-layer.mjs` | Public lead intake for seller, investor seller, capital partner, renter, rental listing, and directory listing personas. Stores boolean `consent`. | Needs consent version, disclosure category, recipient category, routing records, compensation disclosure, retention status, and deletion/correction workflow. |
| Admin lead view | `app/api/admin/leads/route.ts` | Admin can fetch leads, subscribers, contacts, and members. | Needs profile/recipient routing, status workflow, audit logs, and masked export rules. |
| Contacts and advertising inquiries | `app/api/contact/route.ts` | Stores name, email, message, source; advertising details are packed into message text. | Needs structured advertiser account, package interest, budget, consent, terms acknowledgement, campaign intake, and proof workflow. |
| Newsletter subscribers | `app/api/subscribe/route.ts` | Stores email, area, topic/interests, source, and active status. | Needs consent text version, unsubscribe state, source URL, form version, privacy version, and retention rules. |
| Members | `app/api/members/route.ts`, `scripts/migrate-member-profiles.mjs` | Free member signup with email/password, profile fields, subscriber mirroring, and session cookie. | Needs terms/privacy acceptance, consent events, account deletion/export requests, business role expansion, and permission model. |
| Member profile | `app/api/profile/route.ts`, `components/profile-panel.tsx` | Authenticated member can update name, interests, preferred area, role, and bio. | Needs profile version history, public/private visibility, business claim linking, and review gates. |
| Ads | `lib/db.ts`, `app/api/admin/ads/route.ts` | Admin ad CRUD with display/native fields, status, placement, image/link/copy fields. | Needs advertiser account, campaign, insertion order, labels, flight dates, billing/refund/make-good, review status, and substantiation records. |
| Market data | `market_sources`, `market_observations`, related migration/import scripts | Source-aware market observations with quality status and methodology URLs. | Needs rendered consistency audit and public-use license tracking. |
| Analytics | `page_views`, `activation_events` | Daily visitor hash and path-level events without raw IP/full user agent stored in audited tables. | Needs privacy policy inventory of every tracker/pixel/email provider and retention schedule. |
| Affiliate clicks | `scripts/migrate-lead-layer.mjs` | Affiliate partner and click tables exist in migration plan. | Needs partner contracts, disclosure version, active/inactive controls, and campaign reporting. |

## Gate 3 Requirement

Before CREN offers self-service profiles, apartment listings, advertiser dashboards, paid placements, or lead routing at scale, every user-facing form should write a durable compliance record:

- Who acted.
- What they agreed to.
- Which policy version applied.
- Which form and route collected the agreement.
- What commercial relationship or routing category was disclosed.
- What entity, listing, profile, campaign, or lead the agreement belongs to.
- Whether human review was required and who approved it.

## Consent Version System

Create a single compliance module before modifying forms:

- File target: `lib/compliance/policy-versions.ts`
- Export current versions for:
  - `terms`
  - `privacy`
  - `cookies`
  - `lead_disclosure`
  - `advertising_terms`
  - `sponsored_content`
  - `fair_housing`
  - `listing_quality`
  - `profile_claim`
  - `communications`
- Export consent copy constants for:
  - newsletter email opt-in
  - generic contact permission
  - lead routing permission
  - advertising inquiry permission
  - member Terms/Privacy acceptance
  - directory/profile claim certification
  - apartment listing authority and fair-housing certification
  - SMS/calling consent, disabled until counsel approval

Do not hard-code consent text separately in each component. Forms should render the shared copy, and APIs should store the same version key.

## Required Tables

### `policy_versions`

Purpose: record which public policy language existed at a given time.

Minimum columns:

- `id`
- `policy_key`
- `version`
- `route`
- `title`
- `status`: draft, counsel_review, approved, retired
- `effective_at`
- `approved_by`
- `approved_at`
- `notes`
- `created_at`
- `updated_at`

### `consent_events`

Purpose: normalized proof of user consent or acknowledgement.

Minimum columns:

- `id`
- `actor_type`: anonymous, member, admin, advertiser, profile_owner
- `actor_id`
- `email`
- `phone`
- `entity_type`: lead, contact, subscriber, member, business_profile, apartment_profile, campaign, insertion_order
- `entity_id`
- `consent_type`: email_marketing, contact_permission, lead_routing, terms_acceptance, advertiser_terms, profile_claim, fair_housing_certification, communications, sms_calling
- `policy_versions`: JSON object keyed by policy key
- `consent_text`
- `consent_version`
- `source_route`
- `form_id`
- `form_version`
- `recipient_category`
- `compensation_disclosure_category`: none, sponsor, advertiser, affiliate, referral_fee, paid_profile, unknown_pending_review
- `ip_hash`
- `user_agent_hash`
- `created_at`
- `revoked_at`

### `business_profiles`

Purpose: durable service-provider, agent, property manager, developer, advertiser, and vendor profiles.

Minimum columns:

- `id`
- `slug`
- `display_name`
- `legal_name`
- `category`
- `status`: draft, unclaimed, claimed_pending, claimed, published, paused, disputed, removed
- `verification_label`: basic_listing, claimed_by_business, credentials_provided, sponsored_provider, last_verified
- `description`
- `service_areas`
- `website_url`
- `public_email`
- `public_phone`
- `address`
- `owner_member_id`
- `paid_status`
- `last_verified_at`
- `created_at`
- `updated_at`

### `apartment_profiles`

Purpose: apartment/community-specific profile data.

Minimum columns:

- `id`
- `slug`
- `property_name`
- `legal_owner`
- `property_manager`
- `address`
- `area_slug`
- `parcel_id`
- `unit_count`
- `unit_mix`
- `rent_min`
- `rent_max`
- `fees`
- `concessions`
- `pet_policy`
- `parking_policy`
- `accessibility_features`
- `amenities`
- `tour_url`
- `apply_url`
- `availability_source`
- `paid_status`
- `fair_housing_certified_at`
- `last_verified_at`
- `status`
- `created_at`
- `updated_at`

### `profile_claims`

Purpose: let authorized representatives claim profiles without letting bad actors seize listings.

Minimum columns:

- `id`
- `profile_type`
- `profile_id`
- `claimant_member_id`
- `claimant_name`
- `claimant_role`
- `claimant_email`
- `claimant_phone`
- `authority_type`
- `proof_summary`
- `proof_private_path`
- `status`: submitted, needs_more_info, approved, rejected, conflicted, withdrawn
- `reviewer_id`
- `review_notes`
- `decided_at`
- `created_at`
- `updated_at`

### `profile_versions`

Purpose: preserve before/after history for profile edits.

Minimum columns:

- `id`
- `profile_type`
- `profile_id`
- `actor_type`
- `actor_id`
- `change_reason`
- `before_json`
- `after_json`
- `review_status`: auto_approved, pending_review, approved, rejected
- `reviewer_id`
- `created_at`

### `profile_credentials`

Purpose: track licenses, insurance, awards, registrations, and proof.

Minimum columns:

- `id`
- `profile_type`
- `profile_id`
- `credential_type`
- `credential_name`
- `credential_identifier`
- `issuing_authority`
- `source_url`
- `proof_private_path`
- `expires_at`
- `verification_status`
- `reviewer_id`
- `created_at`
- `updated_at`

### `profile_disputes`

Purpose: handle inaccurate, unsafe, disputed, or unauthorized profiles.

Minimum columns:

- `id`
- `profile_type`
- `profile_id`
- `reporter_name`
- `reporter_email`
- `issue_type`
- `evidence`
- `status`: submitted, triaged, investigating, resolved_corrected, resolved_no_change, removed, escalated_legal
- `public_note`
- `private_note`
- `reviewer_id`
- `created_at`
- `updated_at`

### `advertiser_accounts`

Purpose: separate advertiser identity from individual ad records.

Minimum columns:

- `id`
- `legal_name`
- `display_name`
- `category`
- `billing_contact_name`
- `billing_email`
- `campaign_contact_name`
- `campaign_email`
- `phone`
- `website_url`
- `status`
- `risk_flags`
- `created_at`
- `updated_at`

### `campaigns`

Purpose: represent purchased or proposed advertising packages.

Minimum columns:

- `id`
- `advertiser_account_id`
- `package_key`
- `placement`
- `label`
- `status`: inquiry, draft, awaiting_assets, review, approved, scheduled, live, completed, paused, rejected, canceled
- `start_date`
- `end_date`
- `goals`
- `utm_source`
- `utm_campaign`
- `terms_version`
- `sponsor_policy_version`
- `created_at`
- `updated_at`

### `ad_assets`

Purpose: store campaign creative and rights/review status.

Minimum columns:

- `id`
- `campaign_id`
- `asset_type`
- `headline`
- `body`
- `cta_text`
- `cta_url`
- `image_url`
- `alt_text`
- `rights_acknowledged_at`
- `review_status`
- `reviewer_id`
- `created_at`
- `updated_at`

### `claim_substantiation`

Purpose: support truth-in-advertising and sponsor-safe claims.

Minimum columns:

- `id`
- `entity_type`
- `entity_id`
- `claim_text`
- `claim_type`
- `source_url`
- `proof_private_path`
- `status`: needed, provided, approved, rejected, expired
- `reviewer_id`
- `created_at`
- `updated_at`

### `insertion_orders`

Purpose: durable ad contract/order record.

Minimum columns:

- `id`
- `advertiser_account_id`
- `campaign_id`
- `terms_version`
- `price_cents`
- `currency`
- `payment_terms`
- `deliverables`
- `cancellation_terms`
- `refund_make_good_terms`
- `accepted_by_name`
- `accepted_by_email`
- `accepted_at`
- `status`
- `created_at`
- `updated_at`

### `lead_recipients` and `lead_routes`

Purpose: prove where leads went and what was disclosed.

Minimum columns:

- `lead_recipients`: lead id, recipient type, recipient id, recipient category, compensation category, disclosure version, sent at, response status.
- `lead_routes`: lead id, route rule, actor, reason, status, created at.

### `audit_logs`

Purpose: one log for sensitive backend mutations.

Minimum columns:

- `id`
- `actor_type`
- `actor_id`
- `entity_type`
- `entity_id`
- `action`
- `source_route`
- `before_json`
- `after_json`
- `created_at`

## API Changes Required

### Public Lead Intake

Current: `app/api/leads/route.ts` stores boolean consent.

Required:

- Accept and validate `consentVersion`, `formVersion`, `sourceRoute`, `recipientCategory`, and `compensationDisclosureCategory`.
- Insert lead first, then insert `consent_events`.
- If routing is enabled, insert `lead_routes` and `lead_recipients`.
- Keep default routing disabled until policy/counsel approval.

### Contact and Advertising Inquiry

Current: `app/api/contact/route.ts` packs package and budget into the message field.

Required:

- Add explicit checkbox in `components/advertising-inquiry-form.tsx`.
- Store structured advertising fields.
- Insert `advertiser_accounts` and `campaigns` in draft/inquiry status only after spam checks.
- Insert `consent_events` for contact permission and advertising terms acknowledgement.

### Newsletter Subscribe

Current: `app/api/subscribe/route.ts` stores email, area, topic, source.

Required:

- Store opt-in consent event.
- Store unsubscribe and preference-update states.
- Keep source URL and form version.

### Membership Signup

Current: `app/api/members/route.ts` creates free member and mirrors subscriber.

Required:

- Add Terms/Privacy checkbox in `components/join-form.tsx`.
- Store terms and privacy acceptance in `consent_events`.
- Add account export/delete/correction request workflow.

### Member Profile

Current: `app/api/profile/route.ts` lets members update basic reader/member fields.

Required:

- Add `profile_versions` for every update.
- Add public/private visibility rules.
- Add claim flow for business/apartment/advertiser profiles.

### Admin Ads

Current: `app/api/admin/ads/route.ts` creates simple ad rows.

Required:

- Move from direct ad CRUD to advertiser account -> campaign -> assets -> review -> schedule.
- Require label, terms version, sponsor policy version, rights acknowledgement, and substantiation status.
- Link ads to insertion orders before paid campaigns go live.

## Permission Model

Roles should be explicit:

- `reader`
- `profile_owner`
- `apartment_manager`
- `agent_broker`
- `vendor`
- `advertiser`
- `sales_admin`
- `editorial_admin`
- `super_admin`

Rules:

- Readers manage private preferences and saved items.
- Profile owners can edit factual fields on profiles they control.
- Apartment managers can submit availability and policy updates, but high-risk claims require review.
- Advertisers can upload assets and view reporting, but cannot publish ads.
- Sales admins can manage campaigns, but cannot alter editorial articles or corrections.
- Editorial admins can publish/correct editorial content, but cannot approve paid claims alone.
- Super admin can assign roles and resolve conflicts.

## Review Gates

Manual review required for:

- First publication of business, apartment, agent, lender, insurance, or property manager profiles.
- Ownership, management, license, insurance, or credential changes.
- Sponsored labels, native ads, paid profiles, or affiliate placements.
- Fair-housing-sensitive language.
- Pricing, rent, fee, concession, guaranteed approval, or availability claims.
- "Best", "top", "highest", "lowest", "exclusive", "guaranteed", "free", "no fee", or award claims.
- Disputes, removals, refunds, make-goods, legal complaints, and corrections.
- Capital, investment, securities, lender, mortgage, referral-fee, or brokerage-adjacent workflows.

## Implementation Sequence

1. Add `lib/compliance/policy-versions.ts` with policy and consent copy constants.
2. Add an idempotent migration script for `policy_versions` and `consent_events`.
3. Update lead, contact, subscribe, and member APIs to write consent events.
4. Add form checkboxes and policy links to lead, advertising, subscribe, and join forms.
5. Add migration for business/apartment profiles, claims, credentials, versions, and disputes.
6. Build profile-claim intake and admin review queue.
7. Add advertiser account, campaign, ad asset, substantiation, and insertion-order tables.
8. Refactor ad CRUD into campaign workflow.
9. Add audit logs for profile, ad, lead, policy, and admin changes.
10. Extend `npm run release:audit-local`, `npm run smoke:submissions`, and production readiness checks for policy routes, consent events, labels, and schema.

## Completion Criteria

- Every public form shows the correct disclosure and policy links.
- Every public form writes a consent event or intentionally documented non-consent audit record.
- Business/apartment/advertiser profile owners can request claims and update factual information.
- High-risk profile and ad changes land in review queues instead of publishing automatically.
- Ads cannot go live without labels, approved assets, terms version, sponsor policy version, and insertion-order status.
- Lead routing cannot occur without stored recipient category and compensation disclosure.
- Admin and profile owner actions are audit logged.
- Lint, build, release audit, and submission smoke tests pass locally.
- Production deploy remains blocked until user, operator, and legal approval.
