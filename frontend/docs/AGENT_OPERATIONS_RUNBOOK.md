# Durable operations and CRM recovery

Implemented locally on September 22, 2026. This runbook is not evidence of production activation.

## What actually runs

- Confirmed intake is reloaded from `public_intake`; submitted caller metadata cannot override pipeline, email or consent. Only `VERIFIED` lead/contact/subscriber rows with a legacy source ID can enter the CRM outbox.
- `enqueueVerifiedIntakeCrm` writes the outbox and delivery job atomically. The coordinator reconciles missing outbox entries after an intake worker crashes between promotion and enqueue.
- Database jobs use stable dedupe keys, payload-conflict detection, atomic `FOR UPDATE SKIP LOCKED` claims, expiring leases and per-claim fencing tokens. Five attempts by default, maximum ten; exponential retry delay caps at one hour. Exhausted jobs stay visible as `DEAD_LETTER`.
- The CRM adapter retains the existing dedicated Bearer and `Idempotency-Key` contract. The only accepted destination is the exact HTTPS CREN receiver. Redirects are disabled, requests time out after five seconds, and a matching receiver receipt is required. HTTP 200 without the expected receipt is not delivery.
- Successful receipt persistence precedes job completion; a restart after receipt persistence does not resend. A crash before persistence can retry: receiver idempotency remains necessary. This is at-least-once transport, not a claim of distributed exactly-once delivery.
- Newsletter events are contact-only and a receiver receipt containing a deal is rejected. Separate acquisition requests remain in their own local outbox but are **blocked from delivery**: the current receiver fixes all records to the CREN brand. A dedicated acquisition receiver/brand/permission contract must be implemented and verified before that lane can open. Do not point it at the media endpoint or merely add a metadata label.
- Member newsletter permission is mirrored into the local subscriber table only. Member and preference-recovery events do not enter this CRM outbox. Existing CRM unsubscribe/bounce/complaint propagation still needs a receiver-side lifecycle contract; local consent/suppression is rechecked before queued newsletter delivery.
- Verified lead/contact rows are reconciled into the existing staffed inquiry queue with owner, business-hour SLA and a visible `verified-intake:media` or `verified-intake:acquisition` source. This does not establish role-based permission isolation for future staff; the current authenticated owner can see both.
- Daily/weekly/monthly cadence entries of kind `operations.scheduled_review` produce a durable **review report** with tasks and aggregate health. They do not perform the listed reporting, newsletters, outreach or publication. A completed review is not a completed business deliverable.
- The control tower records scheduled and manual heartbeats separately. An authenticated request with Vercel's cron User-Agent and the documented `x-vercel-cron-schedule` header matching `vercel.json` is classified as scheduled; this is application-level provenance, not independent provider execution attestation. Verify deployment cron history during activation.
- Legacy `/api/agent/*` Map-backed pilot endpoints are disabled in production. Legacy email/DM adapters cannot execute live sends; preview results are not treated as delivered. These pilots have not been wholesale converted to durable workflows.

## Configuration and installation gates

1. Apply and verify the public-intake migration and the existing inquiry queue before activation.
2. Inspect the operations migration: `node scripts/migrate-agent-operations.mjs --dry-run`. This is the default and requires no database.
3. Read-only installation check: `node scripts/migrate-agent-operations.mjs --check` with the intended database injected securely.
4. Only with explicit migration authority: `node scripts/migrate-agent-operations.mjs --apply --confirm=agent-operations`. It creates four new tables and two indexes transactionally. Existing historical `agent_*` tables are not overwritten.
5. Keep `CREN_OPERATIONS_ENABLED=false`, `CREN_CADENCE_ENABLED=false` and `CRM_SYNC_ENABLED=false` until the corresponding rollout gates pass.
6. `CREN_OPERATIONS_ENABLED=true` permits the authenticated coordinator. `CREN_CADENCE_ENABLED=true` additionally schedules review reports. `CREN_OPERATIONS_MAX_AGE_MINUTES` defaults to 150 for the hourly trigger, bounded 30–1440.
7. `CRM_SYNC_ENABLED=true` plus the existing dedicated `CRM_SYNC_SECRET` enables only the media connector. `CRM_SYNC_URL` defaults to `https://crm.mradams.xyz/api/v1/inbound/cre-news` and must match exactly. Never reuse an admin, cron or editorial secret. Historical `CREN_CRM_SYNC_*` aliases remain supported. Receiver secret-digest migration is separate coordinated work; the existing receiver was not changed here.
8. Review `/admin/operations` or authenticated GET `/api/admin/agent-control-tower`. Cron GET `/api/cron/agent-control-tower?dryRun=1` is read-only and requires `CRON_SECRET`. A normal GET also requires enabled operations and can deliver verified media CRM events when CRM is separately enabled; it does not send marketing email.

## Verification

`node --experimental-strip-types --test tests/agent-operations.test.mjs`

Pure checks cover consent, pipeline, URL configuration and receipt validation. Integration checks use a fresh Unix-socket-only PostgreSQL cluster, never `DATABASE_URL`: concurrent claims, duplicate conflict, worker restart, stale lease rejection, bounded retries/dead letters, persisted receipt recovery, revoked consent, acquisition blocking and review-only reports. Set `CREN_TEST_POSTGRES_BIN` to the directory containing `initdb`, `pg_ctl` and `psql`; otherwise the default is the locally installed PostgreSQL 18. Without binaries, integration coverage is explicitly skipped rather than falsely reported as verified. Temporary test clusters are stopped at teardown; their isolated temporary directories remain for OS cleanup/diagnosis, containing synthetic data only.

## Activation and recovery still required

No production migration, configuration, deployments, CRM records, outreach or publication were performed for this implementation. Independently verify receiver idempotency under retries, dedicated secret ownership, scoped permissions, opt-out propagation, actual scheduled execution and one marked end-to-end lead after explicit approval. Acquisition deployment is deliberately blocked until the business identity and separated receiving pipeline are approved.

Dead-letter repair is an operator decision: investigate the controlled error code, correct the specific cause, preserve the original event history/receipt and authorize a targeted retry. Do not reset all jobs, replace dedupe keys or assume failed sends were never accepted. There is no broad reset endpoint. Pausing flags preserves queued state; reverting code does not remove tables or receipts.

Technical basis: PostgreSQL documents [SKIP LOCKED for queue-like tables](https://www.postgresql.org/docs/current/sql-select.html); Vercel documents [cron authentication, concurrency and retry limitations](https://vercel.com/docs/cron-jobs/manage-cron-jobs). The local receiver implementation was inspected to retain its existing wire contract; no live receiver request was made.
