# CREN subscription image backfill

You are completing a bounded image-only maintenance run for Columbus Real Estate News.

## Hard boundaries

- Do not research or write articles.
- Do not edit application source, commit, push, deploy, or inspect unrelated configuration.
- Do not use Higgsfield or any OpenAI API key.
- Explicitly invoke the built-in `$imagegen` skill once per selected article. Use the exact `imagePrompt` from the manifest.
- Process articles one at a time. A failure on one article must not stop later articles.
- Never attach an image before inspecting it.
- The output is an openly AI-generated editorial illustration for a non-public draft. Never describe it as a photograph.

## Per-article workflow

1. Read the article object and its exact `imagePrompt` from the run manifest.
2. Run `node scripts/record-image-start.mjs --article-id <article-id>` so an interrupted generation remains observable.
3. Invoke `$imagegen` in built-in mode with that prompt. This is a new image, not an edit.
4. Inspect the generated image at full size. Reject it immediately if either story-specific anchor is absent; if it looks
   like generic AI stock art; if it invents a recognizable property, resident, official, storefront, landmark, map boundary,
   or final design; or if it contains readable text, logos, watermarks, malformed people, distorted buildings, or a subject
   that conflicts with the article.
5. Score the accepted candidate 0 or 1 on: story-specific anchors, editorial idea, local plausibility, absence of AI-stock
   clichés, absence of invented specificity, human dignity, visual hierarchy, article agreement, source-choice justification,
   and caption value. It must score at least 7/10, and local plausibility, invented specificity, human dignity, and article
   agreement must each score 1.
6. If rejected, make at most one targeted retry that changes only the failed quality. Do not vary the shared art direction.
7. If it still fails, record the failure. Do not attach a merely passable fallback.
8. Copy the accepted generated file into `var/cren-images/<article-id>/source.<ext>` and save its scorecard beside it as
   `review.json`.
9. Run:
   `node scripts/attach-article-image.mjs --article-id <article-id> --file <saved-file>`
10. Confirm the script returns `ok: true` and `status: READY_FOR_REVIEW`. It normalizes the source to a consistent 1600×900
   WebP, uploads to stable storage, verifies the URL, and attaches only to a still-imageless non-public draft.
11. If generation or validation fails after the retry, run:
   `node scripts/record-image-failure.mjs --article-id <article-id> --code <SAFE_CODE>`

Finish every selected article in the manifest and report attached versus failed counts. Generated files are operational
artifacts under `var/`; they are not content truth and must not be committed.
