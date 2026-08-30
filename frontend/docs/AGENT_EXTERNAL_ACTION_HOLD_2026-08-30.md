# CREN Agent External-Action Hold

Status: internal-only autonomy is enabled; external execution remains disabled.
Owner: Publisher and CTO.
Date: 2026-08-30.

## Enabled

- Durable agent state in Neon.
- Authenticated, capability-scoped agent APIs.
- Read-only dashboards, internal task creation, research packets, reports, and approval records.
- Daily internal Control Tower scan at `/api/cron/agent-control-tower`.
- CRM synchronization is explicitly enabled in Production and records bounded retries and dead letters.

## Disabled

- `AGENT_EXTERNAL_SENDS_ENABLED=false` in Production and Preview.
- `AGENT_AUTO_SEND_LOW_RISK=false` in Production and Preview.
- `CRM_SYNC_ENABLED=false` in Preview.
- Social DMs, SMS, automated calls, publication, payments, invoices, refunds, and paid lead routing.

## Required approval before external pilot

1. Name the email provider and sender identity.
2. Confirm physical address, unsubscribe, bounce, complaint, suppression, and rate-limit handling.
3. Confirm CRM payload authentication, idempotency, retry, dead-letter review, and replay ownership.
4. Obtain legal review of commercial, sponsored-content, fair-housing, privacy, payment, and communications terms.
5. Approve a small prospect cohort and an exact per-message approval procedure.

No code deploy, cron execution, or Neon migration changes this hold. The flags and provider credentials must be changed deliberately and recorded in the owner decision log.
