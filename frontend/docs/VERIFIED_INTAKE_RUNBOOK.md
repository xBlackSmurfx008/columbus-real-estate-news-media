# Verified public intake

Local implementation, September 22, 2026. Not deployed or activated. No provider messages or production writes were made during implementation.

## Contract

Public contact, lead, newsletter and member forms send bounded JSON with an Origin, a named `website_url` honeypot and a Turnstile token. Real advertiser `company` is preserved. Server verification requires the expected hostname **and** endpoint action. Missing configuration, database schema or challenge service fails closed; there is no production bypass.

PostgreSQL counters enforce per-IP/per-email limits across instances, with hourly mailbox and global confirmation caps. Vercel's overwritten `x-vercel-forwarded-for` is the only accepted client-IP input in Vercel; other hosting environments share a conservative `local` bucket until their trusted-proxy adapter is explicitly implemented. HMAC hashes prevent raw email/IP storage in rate-limit keys. False positives can still occur on shared networks. This is layered abuse control, not proof a seller is genuine or owns property.

`202 pendingVerification` means a row in `public_intake`, **not** a sales lead or subscription. Confirmation mail links contain an expiring random token in the URL fragment, not query/log/referrer data. The page strips it and requires an explicit POST; email link scanners do not consume it by GET. Only its SHA-256 digest is persisted. Provider acceptance is recorded as `ACCEPTED` with an ID, not delivered. An ambiguous send/process crash remains pending until its 30-minute expiry; a failed/expired attempt can be retried with a rotated token. Identical successful pending submissions do not resend.

The confirmation SQL locks the pending row and atomically inserts the legacy record, consumes the token and records `source_id`. Replays cannot create duplicate leads. Existing member accounts are never overwritten, and member credentials are removed from the pending payload after confirmation. Newsletter mirroring from member signup requires its own explicit opt-in. Existing suppressions and inactive subscribers are never reactivated by signup, member signup or profile editing.

CRM outbox handoff is after verification; the durable control tower reconciles missed handoffs and inquiry queue ownership/SLA records. No synchronous sales notification occurs for pending data. A verified mailbox still needs human qualification; CRM acquisition delivery remains separately blocked pending an approved separated receiver. Member and preference-access records are not CRM sales records.

## Media and acquisitions

Pipeline, source authority and `is_test=false` are server-owned. Client-supplied source/campaign/test labels cannot bypass controls or suppress genuine counts. Attribution `sourceRoute` is descriptive only. Newsletters are media contacts, never acquisition consent. Seller personas require a separately checked consent naming the configured acquiring entity; missing entity or mismatched public/server identity blocks intake. Capital-partner intake is explicitly disabled pending approved business/legal scope. These safeguards do not establish a separate legal entity.

Consent copy, policy versions, form version, exact acquisition disclosure and choices are persisted together in the intake ledger. Legacy compliance mirrors are not the source of truth for this new path. Source ledgers and verified records are retained; no automatic interpretation of supplied property claims or external instructions is authorized.

## Preferences and suppression

After newsletter confirmation the browser receives a Secure (production), HttpOnly, SameSite=Strict, 30-minute preference cookie. Supplied email addresses are ignored when saving preferences; identity comes from that cookie. `/subscriber-preferences` also requests a fresh rate-limited email access link without creating a signup or marketing consent, including when a prior preference session expired. Requests for unknown addresses return the same public response and send nothing.

Authenticated opt-out writes permanent suppression and marks the subscriber inactive atomically; queued newsletter consent is withdrawn and the CRM worker also checks suppression before delivery. Provider bounce/complaint synchronization and future newsletter one-click unsubscribe must use this same suppression table; their live provider hooks are not implemented here. Resubscription of suppressed addresses is intentionally blocked until a reviewed owner-authenticated resubscription flow exists. Do not remove suppressions through signup retries or cleanup.

## Configuration and release order

1. Review the additive schema with `node scripts/migrate-intake-security.mjs` (dry-run, no database required). `--check` is read-only. Applying requires explicit production authority plus `--apply --confirm=intake-security`. Requires existing leads/contacts/members/subscribers schema and unique email indexes on members/subscribers. Check output validates table presence, not a full legacy-schema certification.
2. Set `INTAKE_HASH_SECRET` to a dedicated random secret of at least 32 characters; `INTAKE_PUBLIC_ORIGIN` to the canonical HTTPS origin; `TURNSTILE_SECRET_KEY`; `TURNSTILE_EXPECTED_HOSTNAMES` as comma-separated exact hostnames; and public build-time `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Use Cloudflare test keys only in controlled test environments. Existing `RESEND_API_KEY`/sender configuration supplies the confirmation transport.
3. Owner confirmed the public business identity **CREN**. Set matching `CREN_ACQUISITION_ENTITY_NAME=CREN` and build-time `NEXT_PUBLIC_CREN_ACQUISITION_ENTITY_NAME=CREN`. Consent identifies CREN's property-acquisition service separately from the newsroom/newsletter. Names alone do not enable intake: `CREN_ACQUISITION_INTAKE_ENABLED` and build-time `NEXT_PUBLIC_CREN_ACQUISITION_INTAKE_ENABLED` remain false until separate CRM receiver readiness and approved activation.
4. Apply schema before deploying guarded routes, or all public intake and login limits fail closed. Recover a missing-migration login outage through the separately authorized migration—not a bypass flag.
5. With owner approval, test an actual browser challenge → provider acceptance/delivery → mailbox confirmation → local row → outbox receipt → queue SLA. Test expired/replayed links, shared IPs, opt-out, changed consent, provider outage and challenge outage. Do not call migration, build or mocked acceptance proof of live email completion.

## Reusable local verification

```sh
node --experimental-strip-types --test tests/intake-security.test.mjs tests/submission-smoke.test.mjs
CREN_TEST_PG_BIN=/opt/homebrew/opt/postgresql@18/bin node --experimental-strip-types --test tests/intake-postgres.test.mjs
node scripts/migrate-intake-security.mjs
```

The PostgreSQL test creates an isolated temporary localhost cluster; it never uses `DATABASE_URL`, existing databases or provider credentials. It verifies atomic promotion/replay, four concurrent claims, suppression, cookie-bound identity, preference reentry, member opt-in and account overwrite protection. Its cluster is stopped and its own generated directory removed in teardown. Without `CREN_TEST_PG_BIN`, that test is visibly skipped.

`scripts/submission-smoke.mjs` now refuses valid automated public submissions: actual Turnstile and mailbox confirmation require attended testing. `--execute --invalid-payload` remains an explicitly authorized validation-only check; it sets Origin and never claims real delivery or verified lead creation.

## Retention

`node scripts/prune-intake-security.mjs` reports counts only by default. After approval, `--apply --confirm=prune-intake` deletes expired counters and preference sessions and redacts pending/quarantined PII older than 30 days. Verified evidence and permanent suppression remain. No schedule is activated by this helper. Review retention with the owner before production activation; a quarantine review UI and safe manual release path remain future work.

Technical basis: [Cloudflare server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) requires single-use token validation, expected hostname/action checks and expiry handling. This code does not rely on the client widget alone.
