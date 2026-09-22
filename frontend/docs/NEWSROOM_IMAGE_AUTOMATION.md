# CREN newsroom image automation

The image system prepares reviewable drafts. It has no publication authority.

## Cloud image path

1. The authenticated cron route starts the durable Vercel image workflow.
2. The workflow selects at most two machine-passed `draft` articles in `AWAITING_IMAGE` plus named legacy states.
3. It generates a story-specific hero through the configured image provider.
4. It normalizes the image to 1600×900 WebP and rejects exact or near-duplicate fingerprints.
5. It uploads to public Vercel Blob and verifies reachability and content type.
6. It updates the draft and staged submission, then records `READY_FOR_REVIEW` on both editorial and image jobs.
7. An authenticated editor reviews and publishes separately through `/admin/articles`.

Required production configuration is `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`,
`CREN_CLOUD_IMAGES_ENABLED=true`, and one complete image-provider credential path. The trigger may be called through the
PooledInvestments bridge with `NEWSROOM_CREN_TRIGGER_SECRET`, but that bridge cannot inspect CREN data or publish.

## Local recovery path

`npm run newsroom:image-backfill` is a bounded recovery tool. It follows the same draft-only, Blob, fingerprint, and
review-state rules. The LaunchAgent can prepare an image but cannot attach to a live article or publish one.

## Activation verification

Before enabling or refreshing the cloud path:

```bash
npm run test:image-pipeline
npm run newsroom:audit-public-images
npm run newsroom:sync-image-fingerprints
```

Fingerprint sync defaults to read-only; `--dry-run` is still accepted. A separately
authorized `npm run newsroom:sync-image-fingerprints -- --apply` refreshes the
complete checked corpus atomically. It reports malformed/stale cache entries,
fetches every current image, and refuses all writes on duplicate/invalid images,
changed URLs/timestamps/cache rows, or a changed shared publication generation.
It requires the existing fingerprint table and editorial publication-fence migration;
it never creates production tables implicitly. No article copy or public image changes.

Then stage one supervised draft, run the image workflow, confirm `READY_FOR_REVIEW`, approve it in the authenticated
admin, and verify Neon, `/api/public`, the article page, image reachability, and fingerprint uniqueness.
