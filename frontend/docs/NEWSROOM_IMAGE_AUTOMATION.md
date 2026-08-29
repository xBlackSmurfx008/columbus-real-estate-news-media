# CREN newsroom image automation

## Current status — August 29, 2026

The cloud image workflow and guarded automatic-publication path are deployed
at `3fc9ba8`. Production uptime passes, and the public-image audit confirms
87/87 live images are reachable with no missing or broken public assets.

Readiness reconciliation remains open: four live articles have near-duplicate
image URLs without reserved fingerprints, six live articles have no image-job
rows, and 13 live articles still have queued editorial statuses. The next
operational job is to replace those duplicate assets and reconcile workflow
records before increasing publication volume.

The cloud newsroom publishes a completed article and its durable, unique hero without a separate approval queue. It
fails closed unless the exact staged copy and final image pass every publication check together.

## Cloud image path

1. Vercel Cron calls `/api/cron/newsroom-images` through the active PooledInvestments bridge at 11:17 UTC.
   `CRON_SECRET` or the separate bridge secret authenticates the request, and the route
   starts a durable Vercel Workflow; the route itself does no editorial work.
2. The workflow selects at most two `draft` articles whose review job is `READY_FOR_AUTOMATION` (or the legacy
   `AWAITING_HUMAN_REVIEW`) and whose image is missing, rejected, or already finished in `READY_FOR_REVIEW`.
3. The image provider generates a story-specific illustration. Credential precedence is an explicit
   `AI_GATEWAY_API_KEY`, direct `OPENAI_API_KEY`, the authenticated PooledInvestments image service, then ambient Vercel
   OIDC. The shared service keeps its non-exportable OpenAI key in the PooledInvestments runtime and returns only a
   normalized image; it cannot publish, query either database, or accept arbitrary model settings.
4. The workflow normalizes the output to 1600×900 WebP, computes SHA-256 and a 64-bit perceptual dHash, and rejects an
   exact or near duplicate of any stored article hero.
5. The image is uploaded to public Vercel Blob and verified over HTTPS. The fingerprint is reserved before the draft is
   updated, so two concurrent jobs cannot attach the same bytes. The staged submission and `article_image_jobs` record
   briefly move to `READY_FOR_REVIEW` while the article remains `draft`.
6. The workflow immediately re-runs the 18-check gate against that exact submission, verifies the draft still matches,
   rechecks image reachability and duplicate fingerprints, and changes the article to `live`. It records
   `AUTO_PUBLISHED` and `PUBLISHED`; no human score or image-approval checkbox is required.

## Activation and rollback

The cloud path fails closed unless `CREN_CLOUD_IMAGES_ENABLED=true`. Required production values are `DATABASE_URL`,
`BLOB_READ_WRITE_TOKEN`, and `CRON_SECRET`, plus one image credential path. For the shared service, configure both
`NEWSROOM_IMAGE_SERVICE_URL` and `NEWSROOM_IMAGE_SERVICE_SECRET`; a partial pair is not usable. Direct fallback uses
`OPENAI_API_KEY`, while AI Gateway can use `AI_GATEWAY_API_KEY` or Vercel's request-scoped OIDC token.

Before enabling cloud images, run:

`npm run test:image-pipeline`

`npm run newsroom:audit-public-images`

`npm run newsroom:sync-image-fingerprints`

After one successful cloud publication is verified on the public article page, unload the local
`com.cren.image-backfill` LaunchAgent. Rollback is immediate: remove or set `CREN_CLOUD_IMAGES_ENABLED=false`; the cron
will keep firing but the workflow exits before claiming a job.

## Local recovery path

The existing subscription-backed `npm run newsroom:image-backfill` is a manual recovery tool only. It uses the same
durable URL and exact/perceptual duplicate policy, but the active unattended path is the cloud workflow.

The production schedule currently uses PooledInvestments' active Vercel Cron registry to call the same trigger with a
separate `NEWSROOM_CREN_TRIGGER_SECRET`. This is a cloud-to-cloud start only; Pooled cannot select candidates, inspect
CREN data, attach images, or publish. Direct CREN cron configuration remains in `vercel.json` for a future registry
repair.
