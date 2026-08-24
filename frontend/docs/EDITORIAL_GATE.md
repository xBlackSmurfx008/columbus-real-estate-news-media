# CREN editorial gate

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
Markdown links in the body. Passing drafts are
saved with `status='draft'` and a durable machine report in `editorial_review_jobs`. Passing drafts use
`READY_FOR_AUTOMATION`; the legacy `AWAITING_HUMAN_REVIEW` value is accepted only so already-staged work can drain.

## Automatic publication decision

The cloud newsroom re-runs all 18 deterministic checks against the exact staged submission after the final image URL is
attached. It also requires the database draft to match that submission, a durable HTTPS hero, a successful reachability
check, and stored SHA-256 and perceptual fingerprints with no exact or near duplicate in the corpus.

Only that exact article-image pair can transition to `live`. A changed draft, failed source/copy check, missing image,
unreachable Blob, missing fingerprint, or duplicate image leaves the article non-public. Successful runs record
`AUTO_PUBLISHED`, `human_decision='NOT_REQUIRED'`, and the automation identity instead of manufacturing human scores.

## Image policy

Prefer licensed real photography, official plans/renderings, public-record maps, or CREN-made graphics. Subscription
image generation is a fallback for explanatory editorial illustration. Generated work uses one consistent CREN house
style and is never labeled as a photograph or used to imply an unverified property, person, design, or project status.

The cloud image job processes only machine-passed drafts. Its temporary `READY_FOR_REVIEW` state means the durable image
has been attached and is ready for the final automatic gate; it is not a request for human approval. After publication
the job records `PUBLISHED`. The workflow cannot attach or replace an image on a live article.
