# CREN subscription image backfill

You are completing a bounded image-only maintenance run for Columbus Real Estate News.

## Hard boundaries

- Do not research or write articles.
- Do not edit application source, commit, push, deploy, or inspect unrelated configuration.
- Do not use Higgsfield or any OpenAI API key.
- Explicitly invoke the built-in `$imagegen` skill once per selected article. Use the exact `imagePrompt` from the manifest.
- Process articles one at a time. A failure on one article must not stop later articles.
- Never attach an image before inspecting it.

## Per-article workflow

1. Read the article object and its exact `imagePrompt` from the run manifest.
2. Run `node scripts/record-image-start.mjs --article-id <article-id>` so an interrupted generation remains observable.
3. Invoke `$imagegen` in built-in mode with that prompt. This is a new image, not an edit.
4. Inspect the generated image. Reject it if it has readable text, logos, watermarks, distorted buildings, malformed people,
   a generic skyline-only scene, or a subject that conflicts with the article.
5. If rejected, make at most one targeted retry that changes only the failed quality. Do not vary the shared art direction.
6. Copy the accepted generated file into `var/cren-images/<article-id>/source.<ext>`.
7. Run:
   `node scripts/attach-article-image.mjs --article-id <article-id> --file <saved-file>`
8. Confirm the script returns `ok: true`. It normalizes the source to a consistent 1600×900 WebP, uploads to stable public
   storage, verifies the URL, and conditionally attaches only to a still-imageless live article.
9. If generation or validation fails after the retry, run:
   `node scripts/record-image-failure.mjs --article-id <article-id> --code <SAFE_CODE>`

Finish every selected article in the manifest and report attached versus failed counts. Generated files are operational
artifacts under `var/`; they are not content truth and must not be committed.
