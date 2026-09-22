# CREN editorial gate

## Current policy — September 22, 2026

CREN uses a three-boundary publication process:

1. The cloud newsroom commits a verified JSON package to GitHub. The protected Vercel importer reads today's immutable
   artifacts and atomically stages a non-public draft, review evidence and import receipt. It never executes remote code.
2. The image worker attaches a durable, reachable, unique hero and moves the review job to `READY_FOR_REVIEW`.
3. The owner replies APPROVE or APPROVED to the exact proof. A provider-verified owner email triggers guarded publication of that unchanged copy-image pair. No second admin click or manually entered scorecard is required. Owner approval never invents numeric editorial scores.

The production `articles_live_image_required` database constraint remains in place. It is the final database backstop,
not the primary workflow. Neither the cloud text routine nor an image worker has publication authority.

## Draft contract

Every automated submission must follow `prompts/ARTICLE_WRITING.md` and include:

- `prompt_version`, `answer_summary`, `primary_keyword`, `meta_description`, `fact_checked_at`, and `canonical_event_key`
- an exact Columbus-area `location`
- source, claim, and entity ledgers
- reader-visible inline evidence links
- a story-specific image brief, image alt text, and truthful provenance caption

The deterministic gate blocks thin copy, unsupported numbers or statuses, raw citation tokens, promotional language,
weak source structure, missing metadata, and untraceable claims. Passing creates a draft and a durable machine report;
it does not publish.

## Image gate

New drafts use article prompt v1.0.2 and `docs/IMAGE_POLICY.md`: real photos first, with recorded source/permission,
credit and location/date context. AI is an explicitly justified natural-looking illustration fallback, not a fabricated
photograph of the reported property. Both workers use the shared acquisition gate and prompt. Selected source assets
never enter a generation provider. Legacy approved artifacts remain reviewable; missing-image legacy drafts need real
photo research before a new image can be attached. No published image is silently replaced by this policy change.

The image worker may operate only on a machine-passed draft. It normalizes the hero to 1600×900 WebP, verifies the
public Blob URL, stores SHA-256 and perceptual fingerprints, and rejects exact or near duplicates. A successful job
updates both the article and staged submission, then records `READY_FOR_REVIEW`. It never changes article status to live.
The local attachment helper requires an exact-file visual review, complete source choice and unchanged draft snapshot;
it defaults to dry-run. Image URL, alt, caption, provenance and fingerprints are staged atomically. Source photos receive
only ordinary crop/resize/compression, not generative reconstruction. The proof includes image and caption in HTML and
plain text. A new image or caption changes the approval hash and requires a new proof.

## Owner approval gate

Image selection and visual checks are delegated to the image desk; no separate owner image review is required.
The owner receives the full rendered article package in email. An unqualified approval from the configured owner,
authenticated using the receiving provider's server-computed DKIM/DMARC verdict and bound to the unique proof token,
is the human publication decision. Corrections remain drafts until a revised proof receives its own approval.

Email publication records the actual owner identity, exact proof hash, original receipt ID, authentication evidence,
policy version and timestamp. `human_scores` and `human_score` remain NULL: an approval is not a numerical evaluation.
The old ten-part manually entered scorecard remains available for the separate legacy admin publication path, but is
not a post-email requirement. This policy supersedes the earlier extra-login/scorecard requirement at the owner's direction.

At publication time, the server rebuilds the candidate from the staged evidence package, the currently persisted draft,
and any edits in the approval request. It then re-runs the deterministic gate, verifies the hero URL and fingerprints,
rejects duplicates, and validates the email authority. A concurrent change, stale review state, missing image,
unreachable image, failed machine gate or unverified owner remains non-public.

Successful publication records review status `APPROVED`, the owner's decision, reviewer, and timestamp. The image job moves
to `PUBLISHED`.

## Non-negotiable safeguards

- Never write a live row directly.
- Never weaken or bypass `articles_live_image_required`.
- Never infer approval from silence, a machine score, or a generated image.
- Never reuse an image URL or matching content fingerprint.
- Never publish changed copy against an older review.
- Re-report stale candidates before staging or approval.

## Run observability

The legacy direct-DB routine used `scripts/newsroom-run.mjs`. The cloud-only importer now records its own truthful
`vercel-github-import` staged receipt in `newsroom_runs`, plus checked/blocked/failure details in `cren_cloud_import_runs`.
An import receipt is not proof of discovery, source accuracy or publication. Empty import polls must not manufacture
successful no-story reporting runs. A completed
`NO_QUALIFYING_STORY` run is healthy; a missing, failed, or stuck run is not. Install the additive table with
`npm run newsroom:migrate-runs` after first checking with `npm run newsroom:migrate-runs -- --check`.

`npm run newsroom:automation-health` fails when a run is missing or stuck, a draft is stuck, a run failed after the
last completion, or publication exceeds its configured freshness threshold. The scheduled GitHub workflow preserves
the report and opens or updates a repository issue on failure when GitHub runners are available. The production Vercel
cron independently calls `/api/cron/newsroom-health` every day and sends a Telegram alert on an unhealthy result, so
the monitor does not depend on GitHub Actions availability.

## Email proof, corrections, and approval

After a candidate reaches `READY_FOR_REVIEW`, send the exact copy-image pair to the accountable editor with:

```bash
DATABASE_URL=... CREN_EDITOR_REVIEW_EMAIL=... CREN_EDITOR_REVIEW_DOMAIN=... RESEND_API_KEY=... \
  npm run newsroom:email-review -- send --article-id <id> --confirm send-editorial-proof
```

The email contains the complete article and hero, not a fabricated proposed scorecard. Its unique Reply-To address routes
signed Resend `email.received` webhooks to `/api/webhooks/resend/editorial-review`. Receipts and actions have separate,
append-only ledgers. Before recording any reply, the webhook requires the configured owner, one proof address in the
provider-fetched `to` field, and receiving-server aligned DKIM/DMARC evidence. Unauthenticated replies are acknowledged
and ignored without changing proofs or creating correction jobs; provider retrieval failures remain retryable.
An authenticated, token-bound edit is still untrusted draft content: receiving it immediately revokes approval and
queues a durable correction job. Replays resume an interrupted handoff without duplicating jobs.

The bounded correction worker applies copy edits through a configured AI Gateway model, preserves source/image
records, re-runs the machine gate and saves a field-level before/after diff. It atomically stages only if the draft,
evidence, proof version and correction lease are still current. An edit requiring new reporting or a new image is
`BLOCKED` with `NEEDS_REPORTING`; it must not invent evidence. It does not publish. The proof sweep sends initial
ready drafts and corrected versions, using a durable version plus provider idempotency key. Only a successfully sent
new proof supersedes earlier versions. Pending corrections block proof sending. Ambiguous sends retain `SENDING`;
after 23 hours they require provider reconciliation because Resend idempotency keys expire after 24 hours.

Outbound proof delivery uses `RESEND_API_KEY` for CREN's verified sender. Inbound retrieval uses the separately scoped
`RESEND_RECEIVING_API_KEY` for the dedicated receiving subdomain. Never substitute one key for the other implicitly.

Only a standalone `APPROVE` / `APPROVED` (optionally `THIS VERSION`) becomes an approval request. A conservative
contact-only signature is tolerated and retained in the receipt; conditional approval or mixed edits remain edits.
Folded quoted-mail headers are excluded from interpretation. The signed webhook authenticates delivery, then the
server retrieves the receipt directly from Resend and validates its top-level `authentication` object. Resend documents
this object as receiving-server results, not sender-supplied headers. Require From-aligned DKIM `pass` and DMARC `pass`
or `gray` (which includes a monitoring-only/no policy when DKIM passes). SPF is recorded, not used to override DKIM.
Never trust an Authentication-Results header, webhook-supplied body or `received_for` header-derived address as approval.
Require a single exact configured owner mailbox and one proof address in the provider's `to` field, exact event ID/body/time,
no non-inline attachments, latest version and unchanged complete candidate/image bytes. Legacy null authentication fails closed.

For a historical parser mistake, the same authenticated receipt can publish only if its false correction job has never
started and no other correction/later reply conflicts. The original receipt/action remains immutable. Only that false job
is retired atomically. Publication is recorded in `editorial_email_publications`; prior admin confirmations remain historical.

Its single database commit locks the proof, correction jobs and current draft/evidence snapshot, validates that approval is still
latest, and updates the article, review, image fingerprint and consumed approval together. A shared publication-generation
row fences concurrent duplicate-image checks across both publishers; proof reservations also advance the previous proof's
timestamp to prevent a new-version race. Hashes bind the complete
artifact (including sources, claims, prompt version and provenance) and freshly fetched, decoded image bytes—not
merely the image URL. Failed checks stay non-public with durable error codes and provider retry; the admin retry control
re-fetches the authentic email rather than granting approval. Inspect state with:

```bash
DATABASE_URL=... npm run newsroom:email-review -- status --article-id <id>
```

### Worker setup and local verification

This implementation is local until an authorized migration/deployment and real mailbox canary succeed. Nothing here
activates a scheduler, sends outreach, provisions an owner account or purchases model usage.

```bash
# No database access or writes: print the additive migration.
node scripts/migrate-editorial-email-reviews.mjs --dry-run
# Read-only schema readiness. Existing v1 table alone is insufficient.
node scripts/migrate-editorial-email-reviews.mjs --check
# Only after explicit environment-specific migration approval:
node scripts/migrate-editorial-email-reviews.mjs --apply --confirm=editorial-email-v2
# Default worker command is a read-only queue/proof audit.
node --experimental-strip-types scripts/editorial-correction-worker.mjs
# Authorized execution: at most one correction/model call and two proof sends per invocation.
node --experimental-strip-types scripts/editorial-correction-worker.mjs --apply --send-proofs --confirm=editorial-worker
```

Configuration: `DATABASE_URL`, `AI_GATEWAY_API_KEY`, explicitly selected `CREN_EDITORIAL_REVISION_MODEL`,
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CREN_EDITOR_REVIEW_EMAIL`, `CREN_EDITOR_REVIEW_DOMAIN`,
`RESEND_RECEIVING_API_KEY`, `RESEND_EDITORIAL_WEBHOOK_SECRET`. No provider or mail call runs at module import.
The model is selected by the operator from current provider availability; the worker invents no default model.

Correction claims use `FOR UPDATE SKIP LOCKED`, a five-minute lease, and at most three crash-recovery claims. Provider,
reporting or gate failures become `BLOCKED` for operator triage; exhausted leases also become `BLOCKED`, never permanent
`RUNNING`. HTML-only mail and attachments are not automatically interpreted; their empty plain-text receipt remains
visible in the admin review GET API. The GET API also returns correction status, error and the proposed diff.
Edits received during an ambiguous `SENDING` attempt are still queued. If another edit arrives after a prior revision
has already been staged, the changed draft becomes `BLOCKED` with `DRAFT_CHANGED_REQUIRES_REBASE`; a reporter must
reconcile the accumulated edits before a revised proof is sent. The system must not silently discard that late edit.

Focused unit tests: `node --experimental-strip-types --test tests/editorial-email-review.test.ts tests/editorial-correction-worker.test.ts`.
The real PostgreSQL lifecycle test is opt-in, refuses non-loopback URLs or database names outside `cren_editorial_test*`,
and truncates **only that explicitly dedicated test database**. Run it with `CREN_TEST_DATABASE_URL` and
`node --experimental-strip-types --test tests/editorial-workflow-postgres.test.ts`. It covers concurrent proof reservation,
receipt-crash replay, spoofed sender, late edits, out-of-order approval, model adapter/gate/diff/staging/proof handoff,
changed evidence/image bytes, atomic publication and exhausted leases. No test sends real mail or invokes a paid model.

Reusable isolated runner: `node scripts/test-editorial-postgres.mjs` starts a fresh temporary loopback-only PostgreSQL
cluster, runs the lifecycle suite and stops it in `finally`. It does not read or pass `DATABASE_URL`. Set
`CREN_TEST_PG_BIN` if local PostgreSQL binaries are outside the common paths. Test files/logs are retained for inspection.

Live acceptance: deploy with migrated schema, send a real proof, reply with an edit, observe the correction and revised proof,
then reply APPROVE or APPROVED. Verify authenticated automatic publication and its exact public copy/image. An extra
admin login, scorecard or publication command must not be required on the normal email path.
Model edits remain proposals needing factual human inspection even when the deterministic gate passes.

### Supervised corrections with paid revisions disabled

`scripts/manual-editorial-correction.mjs` supports an explicitly reviewed replacement plan without calling a model.
The plan fixes one job ID, article ID, full candidate hash, expected correction first lines, explanation and unique
literal replacements. Editable fields are title, excerpt, body, answer_summary, meta_description and explicitly
identified claim text; source records, claim source IDs and image fields cannot be changed by this helper.
Keep plans in gitignored `var/editorial-manual/` and inspect the entire received edit, not just its first line.

```bash
node --experimental-strip-types scripts/manual-editorial-correction.mjs --plan=var/editorial-manual/PLAN.json
# After owner-requested edits are reviewed and dry-run passes:
node --experimental-strip-types scripts/manual-editorial-correction.mjs --plan=var/editorial-manual/PLAN.json \
  --apply --confirm=manual-editorial-correction
```

It reuses the leased worker with an exact job scope, revalidates the current artifact and correction set, and stages
only a passing non-public revision with a durable diff. It sends nothing and cannot publish. Sending the revised proof
is a separate supervised action; `sweepEditorialProofs` accepts `articleId` to constrain it to the reviewed article.
Retries after a failed claim require checking the reason and current state; never reset unrelated jobs or attempt counts.
Optimistic locks retain the exact PostgreSQL microsecond timestamp as text, not a rounded JavaScript Date.

Provider references: [received-email fields](https://resend.com/docs/api-reference/emails/retrieve-received-email),
[webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests),
[24-hour idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

### Scoped recovery of an already received approval

`scripts/publish-approved-email.mjs` defaults to a read-only preflight, re-fetches the real provider receipt and requires
both exact article and email IDs. It cannot manufacture an approval. Authorized `--apply --confirm=publish-approved-email`
saves a private rollback snapshot before the atomic publication. Private artifacts are gitignored and excluded from deployments.
It calls no paid model and sends no mail. Example (credentials injected privately):

```bash
node --experimental-strip-types scripts/publish-approved-email.mjs --article-id=ARTICLE_ID --email-id=PROVIDER_EMAIL_ID
# After specific article publication authorization:
node --experimental-strip-types scripts/publish-approved-email.mjs --article-id=ARTICLE_ID --email-id=PROVIDER_EMAIL_ID \
  --apply --confirm=publish-approved-email
```
