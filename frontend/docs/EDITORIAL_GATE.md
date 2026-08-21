# CREN editorial gate

CREN uses a two-stage publication process. Automation may research, draft, run deterministic checks, and prepare an
image. Only an authenticated editor can make an article public.

All automated drafting must follow `prompts/ARTICLE_WRITING.md`. The newsroom sequence is research and source
classification, evidence mapping, original reporting, drafting, skeptical editing, deterministic validation, human
review, and authenticated publication. If the reporting is insufficient, the drafting step returns `NEEDS_REPORTING`
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
saved with `status='draft'` and a durable machine report in `editorial_review_jobs`.

## Human decision

The authenticated article editor shows the headline, dek, full body, and full-size hero together. The editor scores
ten criteria from 0–2: accuracy, Columbus news value, usefulness, clarity, educational interest, fairness, original
reporting value, SEO/AEO fit, voice, and reader-visible evidence. Publication requires 17/20. Accuracy, fairness,
original reporting value, and reader-visible evidence must each score 2; no blocking criterion may score zero.

The editor must also confirm that the hero is story-specific, locally plausible, non-deceptive, and free from AI-stock
clichés. The API rejects a transition to `live` when the machine gate, human score, image, or image approval is absent.

## Image policy

Prefer licensed real photography, official plans/renderings, public-record maps, or CREN-made graphics. Subscription
image generation is a fallback for explanatory editorial illustration. Generated work uses one consistent CREN house
style and is never labeled as a photograph or used to imply an unverified property, person, design, or project status.

The local image job processes only machine-passed drafts. Accepted outputs are stored as `READY_FOR_REVIEW`; the job
cannot attach or replace an image on a live article.
