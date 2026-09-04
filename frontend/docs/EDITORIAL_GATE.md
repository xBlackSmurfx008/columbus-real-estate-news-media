# CREN editorial gate

## Current status — September 4, 2026 (owner-directed update)

Owner decision (given live in-session, 2026-09-04): `scripts/publish-article.mjs` now inserts
new articles with `status='live'` immediately once the deterministic gate passes — there is no
separate image-gated staging step and no pre-publish approval queue for the daily automated
newsroom. This supersedes the "Draft contract" / "Automatic publication decision" sections below,
which described the prior two-phase flow (stage as `draft`, wait for a durable verified hero image,
then auto-publish). That flow had left three consecutive days of gate-passed articles (Sep 2, 3, 4)
sitting as non-public drafts, which is what prompted this change. A missing hero never blocks
publication either way — old or new flow — the durable image job fills it in after the fact.
The `validateAutoPublicationCandidate` machinery (`lib/auto-publication.ts`) and the
`editorial_review_jobs` / image-fingerprint gate in the admin `PUT /api/admin/articles/[id]` route
are unchanged and still apply to any article an admin edits or promotes manually through the admin
panel; they just no longer sit in the path of the daily automated publish.

## Prior status — August 29, 2026 (superseded above)

The fail-closed automatic gate is deployed at `3fc9ba8`. Production currently
has 87 live articles, including 73 historically approved repair rows and one
recorded automatic publication. The gate remains the publication authority.
Readiness is still being reconciled for four near-duplicate image assets with
failed replacement jobs and 13 live rows with legacy queued review statuses.

CREN uses a fail-closed automatic publication process. Automation may research, draft, run deterministic checks, prepare
an image, and make the finished article public without a separate approval queue.

All automated drafting must follow `prompts/ARTICLE_WRITING.md`. The newsroom sequence is research and source
classification, evidence mapping, original reporting, drafting, skeptical editing, deterministic validation, verified
image attachment, and automatic publication. If the reporting is insufficient, the drafting step returns `NEEDS_REPORTING`
instead of manufacturing a complete-looking article.

Every submission records `prompt_version: "cren-article-v1.0.0"` so the newsroom can identify which standard produced
and reviewed a draft.

## Draft contract

`scripts/publish-article.mjs` accepts Markdown plus structured metadata. In addition to the display fields, every draft
must include:

- `answer_summary`, `primary_keyword`, `meta_description`, `fact_checked_at`, and `canonical_event_key`
- `location: { name, state: "OH" }`
- `source_ledger`: two fetched, independent sources with IDs, fetch times, HTTP status, titles, publishers, and at least
  one semantically correct `PRIMARY` source; important analysis should normally use three or more independent origins
- `claim_ledger`: exact material sentences and the source IDs supporting them
- `entity_ledger`: named people, organizations, projects, and their source IDs
- `image_brief`: the editorial idea, two story-specific anchors, source-asset consideration, and explicit avoid list
- `image_alt` and `image_provenance`, including a visible `AI-generated illustration` caption when applicable

The staging command rejects bodies under 350 words, HTML, raw citation tokens, invisible source ledgers, promotional
lead-generation copy, pressure/hype language, untraceable numeric or project-status claims, weak source structure,
formulaic investor advice, and incomplete metadata. At least two independent ledger sources must appear as reader-visible
Markdown links in the body. As of the September 4, 2026 update above, passing articles are inserted directly with
`status='live'` plus a durable machine report in `editorial_review_jobs` (still recorded as `READY_FOR_AUTOMATION`
for the historical audit trail). The legacy `AWAITING_HUMAN_REVIEW` value is accepted only so already-staged work
predating this change can drain.

## Automatic publication decision (legacy path — admin-edited/manually-staged articles only)

This section describes the two-phase flow that still applies to any article staged as `draft` through the admin panel
or an older tool, not to the daily `publish-article.mjs` newsroom run (see the September 4, 2026 update above).

The cloud image job re-runs all 18 deterministic checks against the exact staged submission after the final image URL is
attached. It also requires the database draft to match that submission, a durable HTTPS hero, a successful reachability
check, and stored SHA-256 and perceptual fingerprints with no exact or near duplicate in the corpus.

Only that exact article-image pair can transition from `draft` to `live` through this path. A changed draft, failed
source/copy check, missing image, unreachable Blob, missing fingerprint, or duplicate image leaves the article
non-public. Successful runs record `AUTO_PUBLISHED`, `human_decision='NOT_REQUIRED'`, and the automation identity
instead of manufacturing human scores.

## Image policy

Prefer licensed real photography, official plans/renderings, public-record maps, or CREN-made graphics. Subscription
image generation is a fallback for explanatory editorial illustration. Generated work uses one consistent CREN house
style and is never labeled as a photograph or used to imply an unverified property, person, design, or project status.

The cloud image job processes only machine-passed drafts. Its temporary `READY_FOR_REVIEW` state means the durable image
has been attached and is ready for the final automatic gate; it is not a request for human approval. After publication
the job records `PUBLISHED`. The workflow cannot attach or replace an image on a live article.
