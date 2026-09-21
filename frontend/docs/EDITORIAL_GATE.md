# CREN editorial gate

## Current policy — September 21, 2026

CREN uses a three-boundary publication process:

1. The cloud newsroom researches and stages a non-public `draft` through `scripts/publish-article.mjs`.
2. The image worker attaches a durable, reachable, unique hero and moves the review job to `READY_FOR_REVIEW`.
3. An authenticated editor inspects and scores the exact copy-image pair. Only the admin route can change the article to `live`.

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

The image worker may operate only on a machine-passed draft. It normalizes the hero to 1600×900 WebP, verifies the
public Blob URL, stores SHA-256 and perceptual fingerprints, and rejects exact or near duplicates. A successful job
updates both the article and staged submission, then records `READY_FOR_REVIEW`. It never changes article status to live.

## Human gate

The editor reviews the rendered candidate and scores all ten items in `lib/editorial-review.ts`. Approval requires:

- at least 17/20 overall
- every blocking item above zero
- accuracy, fairness, originality, and reader-visible evidence at 2/2
- an accountable reviewer identity
- an explicit `APPROVED` decision

At publication time, the server rebuilds the candidate from the staged evidence package, the currently persisted draft,
and any edits in the approval request. It then re-runs the deterministic gate, verifies the hero URL and fingerprints,
rejects duplicates, and validates the scorecard. A concurrent change, stale review state, missing image, unreachable
image, failed score, or missing reviewer remains non-public.

Successful publication records review status `APPROVED`, the human scores, reviewer, and timestamp. The image job moves
to `PUBLISHED`.

## Non-negotiable safeguards

- Never write a live row directly.
- Never weaken or bypass `articles_live_image_required`.
- Never infer approval from silence, a machine score, or a generated image.
- Never reuse an image URL or matching content fingerprint.
- Never publish changed copy against an older review.
- Re-report stale candidates before staging or approval.

## Run observability

The cloud routine starts and finishes a `newsroom_runs` record with `scripts/newsroom-run.mjs`. A completed
`NO_QUALIFYING_STORY` run is healthy; a missing, failed, or stuck run is not. Install the additive table with
`npm run newsroom:migrate-runs` after first checking with `npm run newsroom:migrate-runs -- --check`.

`npm run newsroom:automation-health` fails when a run is missing or stuck, a draft is stuck, a run failed after the
last completion, or publication exceeds its configured freshness threshold. The scheduled GitHub workflow preserves
the report and opens or updates a repository issue on failure.
