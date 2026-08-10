# CREN editorial gate

CREN uses a two-stage publication process. Automation may research, draft, run deterministic checks, and prepare an
image. Only an authenticated editor can make an article public.

## Draft contract

`scripts/publish-article.mjs` accepts Markdown plus structured metadata. In addition to the display fields, every draft
must include:

- `answer_summary`, `primary_keyword`, `meta_description`, `fact_checked_at`, and `canonical_event_key`
- `location: { name, state: "OH" }`
- `source_ledger`: two fetched, independent sources with IDs, fetch times, HTTP status, titles, publishers, and at least
  one `PRIMARY` source
- `claim_ledger`: exact material sentences and the source IDs supporting them
- `entity_ledger`: named people, organizations, projects, and their source IDs
- `image_brief`: the editorial idea, two story-specific anchors, source-asset consideration, and explicit avoid list
- `image_alt` and `image_provenance`, including a visible `AI-generated illustration` caption when applicable

The staging command rejects HTML bodies, promotional lead-generation copy, pressure/hype language, untraceable numeric
or project-status claims, weak source structure, formulaic investor advice, and incomplete metadata. Passing drafts are
saved with `status='draft'` and a durable machine report in `editorial_review_jobs`.

## Human decision

The authenticated article editor shows the headline, dek, full body, and full-size hero together. The editor scores
nine criteria from 0–2: accuracy, Columbus news value, usefulness, clarity, educational interest, fairness, original
reporting value, SEO/AEO fit, and voice. Publication requires 14/18. Accuracy, Columbus value, fairness, and original
reporting value cannot score zero.

The editor must also confirm that the hero is story-specific, locally plausible, non-deceptive, and free from AI-stock
clichés. The API rejects a transition to `live` when the machine gate, human score, image, or image approval is absent.

## Image policy

Prefer licensed real photography, official plans/renderings, public-record maps, or CREN-made graphics. Subscription
image generation is a fallback for explanatory editorial illustration. Generated work uses one consistent CREN house
style and is never labeled as a photograph or used to imply an unverified property, person, design, or project status.

The local image job processes only machine-passed drafts. Accepted outputs are stored as `READY_FOR_REVIEW`; the job
cannot attach or replace an image on a live article.
