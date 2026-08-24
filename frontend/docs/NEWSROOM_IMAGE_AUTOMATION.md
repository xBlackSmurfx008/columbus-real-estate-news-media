# CREN newsroom image automation

Automation may stage machine-passed drafts, but it cannot publish. The image workflow prepares a durable, unique hero
for a non-public draft. An authenticated editor then approves the exact copy and image together.

## Cloud image path

1. Vercel Cron calls `/api/cron/newsroom-images` at 11:10 UTC. `CRON_SECRET` authenticates the request and the route
   starts a durable Vercel Workflow; the route itself does no editorial work.
2. The workflow selects at most two `draft` articles whose review job is `AWAITING_HUMAN_REVIEW` and whose image is
   missing or still a rejected local `/images/heroes/` path.
3. The image provider generates a story-specific illustration. Credential precedence is an explicit
   `AI_GATEWAY_API_KEY`, direct `OPENAI_API_KEY`, the authenticated PooledInvestments image service, then ambient Vercel
   OIDC. The shared service keeps its non-exportable OpenAI key in the PooledInvestments runtime and returns only a
   normalized image; it cannot publish, query either database, or accept arbitrary model settings.
4. The workflow normalizes the output to 1600×900 WebP, computes SHA-256 and a 64-bit perceptual dHash, and rejects an
   exact or near duplicate of any stored article hero.
5. The image is uploaded to public Vercel Blob and verified over HTTPS. The fingerprint is reserved before the draft is
   updated, so two concurrent jobs cannot attach the same bytes. The review submission and `article_image_jobs` record
   are updated to `READY_FOR_REVIEW`; the article remains `draft`.
6. The admin publication endpoint re-runs the deterministic copy gate against the exact candidate, re-downloads and
   fingerprints the approved image, requires 17/20 human review with full marks on the blocking evidence criteria, and
   only then permits an authenticated transition to `live`.

## Activation and rollback

The cloud path fails closed unless `CREN_CLOUD_IMAGES_ENABLED=true`. Required production values are `DATABASE_URL`,
`BLOB_READ_WRITE_TOKEN`, and `CRON_SECRET`, plus one image credential path. For the shared service, configure both
`NEWSROOM_IMAGE_SERVICE_URL` and `NEWSROOM_IMAGE_SERVICE_SECRET`; a partial pair is not usable. Direct fallback uses
`OPENAI_API_KEY`, while AI Gateway can use `AI_GATEWAY_API_KEY` or Vercel's request-scoped OIDC token.

Before enabling cloud images, run:

`npm run test:image-pipeline`

`npm run newsroom:audit-public-images`

`npm run newsroom:sync-image-fingerprints`

After one successful cloud attachment is verified in the admin review screen, unload the local
`com.cren.image-backfill` LaunchAgent. Rollback is immediate: remove or set `CREN_CLOUD_IMAGES_ENABLED=false`; the cron
will keep firing but the workflow exits before claiming a job.

## Local recovery path

The existing subscription-backed `npm run newsroom:image-backfill` remains a temporary fallback while cloud billing is
unavailable. It now uses the same durable URL and exact/perceptual duplicate policy. It must be retired only after the
cloud path has completed and verified a real production image.
