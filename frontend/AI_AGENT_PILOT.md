# AI Comms Agent Pilot Runbook

## Current status — August 28, 2026

The agent routes and admin-session protection are implemented in the deployed
branch `feat/site-map` at `3fc9ba8`. This pilot has not been included in the
current production member/profile verification, so the UAT checks below remain
open evidence requirements. Keep high-risk outbound actions approval-gated.

## Start
1. `npm install`
2. `npm run dev`

## Endpoints
- Inbound email processing: `POST /api/agent/email`
- Inbound social DM processing: `POST /api/agent/social`
- Human approval send/reject: `POST /api/agent/approve`
- CRM snapshot/upsert: `GET|POST /api/agent/crm`
- Calendar slots/event create: `GET|POST /api/agent/schedule`
- Onboarding tasks: `GET|POST|PATCH /api/agent/onboarding`
- Reporting digest/alerts: `GET|POST /api/agent/report`
- Pilot UAT flow: `POST /api/agent/pilot`

## Example Inbound Request
```json
{
  "from": "lead@example.com",
  "subject": "Media kit and pricing",
  "body": "Please send package options and a call time."
}
```

## Approval Policy in this build
- Low-risk messages auto-send.
- Medium/high-risk messages require approval via `/api/agent/approve`.

## Provider Modes
- Gmail staged mode (default) or API mode (`GOOGLE_GMAIL_MODE=api` + `GOOGLE_GMAIL_ACCESS_TOKEN`)
- Google Calendar staged mode (default) or API mode (`GOOGLE_CALENDAR_MODE=api` + `GOOGLE_CALENDAR_ACCESS_TOKEN`)
- Social DM staged mode (default) or API mode (`SOCIAL_DM_MODE=api` + `SOCIAL_DM_API_URL` + `SOCIAL_DM_API_KEY`)

## Pilot Validation Checklist
- Confirm low-risk inquiries auto-send and log activities.
- Confirm high-risk threads move to `pending_approval`.
- Approve a pending thread and verify send status changes to `sent`.
- Create a `won` deal and verify onboarding tasks are generated.
- Trigger daily digest and verify metrics + alerts output.
