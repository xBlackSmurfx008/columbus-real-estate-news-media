# CREN live image review — September 22, 2026

Result: **not an all-clear**. Most images look photographic, but the homepage lead fails the requested natural-photography style. Several realistic-looking images imply unsupported places or construction progress, and stale captions/alt text undermine credibility.

## Scope and evidence

- Public snapshot captured 2026-09-22 at 16:42:52 UTC.
- 248 public pages returned HTTP 200: sitemap pages plus additional linked area hubs.
- 105 live article heroes and six shared guide assets: 111 distinct image URLs.
- All 111 downloaded and decoded; no missing/broken images or exact-byte duplicate groups. The separate database-backed public-image audit also passed all 105 heroes.
- Every image was visually inspected on numbered contact sheets. Questionable candidates received original-size inspection; two independent image-review batches covered 49–111. This is visual triage, not a guarantee against every subtle artifact.
- Browser checked homepage at desktop and mobile widths; all 11 homepage images decoded after scrolling them into view. Initial unscrolled screenshots contain normal lazy-load blanks and must not be used as broken-image evidence.
- Evidence folder: `var/cren-images/live-review-2026-09-22/`. `manifest.json` records URL, article/page usages, captions, alt text, dimensions, exact SHA-256 and local file for every image. Numbered sheets are in `sheets/`; exact downloaded bytes are in `originals/`.
- No database content, public images, publication status, deployment, schedules or spending changed. No paid generation.

## Highest-priority image corrections

Numbers refer to the evidence manifest, not stable database IDs.

| Image | Finding | Recommended action, not applied |
| --- | --- | --- |
| 1 — East Side condos | Flat vector/painterly buildings, simplified machinery, solid-color foliage. Clearly not natural-looking photography. Live caption still says a photograph should replace it before publication. Alt claims the actual Broad/Gould site. | Replace first with a rights-cleared site or relevant contextual photograph. Do not disguise an invented property view as a real location. |
| 81 — May listings | Nearly every visible home has the same completely blank listing board. The repeating staged pattern weakens realism. | Replace with an ordinary housing scene without repeated blank props. |
| 105 — 2025 inventory | Two prominent blank property boards look like mockups. | Replace or select a more natural housing scene. |
| 78 — Zone In capacity | Bus-stop pedestrians have conspicuously repeated white shirts, dark trousers and pink bags. Suspicious repetition, not proof of cloned people. | Replacement candidate; do not certify artifact-free. |
| 95 — Italian Village rezoning | Cranes, substantial framing and partially built apartment blocks visually imply active construction, while the headline says construction is not set. Alt describes nonexistent translucent conceptual masses. | Use a verified present-day site image or context that does not imply project progress. |
| 93 — Bright Road proposal | Finished luxury homes are visible; proposed footprint markings described in alt are absent. | Correct context/image and alt together. |
| 88 — Hilltop RISE | Polished storefronts/furnished interiors could imply completed renovation despite the story's uncertainty. | Prefer verified present condition or neutral context. |
| 98 — Book Festival | Detailed tents/rotunda setting is not evidence of Main Library/Topiary Park; alt claims that location. | Verify the actual location or replace with appropriately disclosed generic context. |

Other blank-sign scenes, including 20, 25, 39 and 91, merit cleanup as a repeated stylistic pattern. Natural-looking park scenes 54/73 and several specific restaurant/building scenes must remain clearly illustrative unless their real location is independently established.

Images not singled out above generally have plausible lighting, texture and perspective at the inspected scale. This is **not** documentary authentication or blanket publication approval. An illustration can look photographic and still mislead through its subject, caption or placement.

## Verified labeling defects

- **12** captions still say `CREN editorial graphic (placeholder pending illustration)`: images 19–24 and 27–32. Their current assets are photo-like scenes, not placeholder cards.
- Including image 1's pre-publication instruction, **13** captions contain stale/pending production language.
- **Eight clear absent graphic-element claims:** 40 (grant-recipient map), 51 (district map), 74 (historical inset), 80 (mortgage-rate line), 83 (ballot columns), 84 (comparison panel), 90 (attendance map), 91 (method panels). The pixels do not contain those elements.
- Image 25 alt says aerial view; pixels show eye-level sidewalk/houses. Image 60 alt describes homes but pixels show a civic building. Image 72's proposed translucent buildings are absent. Image 77 lacks the funding documents/apartments in alt. Image 79 lacks policy-document annotations. These examples warrant a full metadata reconciliation, not a simple keyword substitution.
- **90/105** captions explicitly identify AI generation. Of those, 79 alt descriptions omit AI wording and 53 omit even illustration/visualization wording. This is an accessibility/context inconsistency, not by itself a legal finding.
- The remaining captions are 12 placeholders, one archival photo credit (4), one editorial-illustration-only caption (33), and the incorrect map caption (40). Do not infer their provenance from this classification.
- Live article pages for 1, 19 and 40 reproduce the problematic captions.
- Homepage and `/blog` contain no visible AI/illustration labels on cards. A disclaimer only on the destination article does not help a reader scanning those cards.
- Image 4's photographer/license Markdown is printed literally in the live figcaption, without clickable attribution links. Preserve attribution and fix safe rendering; do not remove credits.

## Guide imagery

All six guide assets (106–111) look generally photographic, though several are polished/staged and one is a split composition. No clear major anatomy defect found. They are reused across many unrelated area pages, so they cannot establish the appearance of any named neighborhood, restaurant, park, provider or listing.

Live `/things-to-do`, `/housing-search` and `/directory` display representative-image disclaimers (respectively not a named venue, actual listing, or listed provider). Those labels do not explicitly say AI-generated. `/areas/dublin` had no visible representative/illustration/photography disclosure in the browser text checked. Provenance was not authenticated in this audit; check generation/source receipts before adding provenance-specific labels.

## Repair order

1. Replace image 1 and prioritize the other visual/context failures above. Use actual rights-cleared photos first; no purchased assets or generation spend without authority.
2. Reconcile all 105 hero captions and alts against current pixels and source/generation receipts. Remove obsolete chart/map/placeholder claims, not truthful AI disclosure.
3. Show concise provenance labels wherever generated images appear, including feed cards and applicable area/guide pages. Keep exact named-site claims only when supported.
4. Enforce current image/caption/alt/provenance consistency in publication and replacement workflows. Reachability, hashes and uniqueness cannot establish realistic appearance.
5. Re-run technical and visual checks after authorized repair; retain original URLs/metadata for rollback and preserve owner article/email approval rules. No additional standalone owner image-review loop is proposed.

## Reusable audit

Created `scripts/prepare-live-image-review.mjs`, reusing the existing public-site HTML parser and bounded HTTP helpers. Public GETs only; no credentials required. Produces local originals, numbered contact sheets and a manifest; requires a new evidence directory and never uploads or publishes.

```sh
node scripts/prepare-live-image-review.mjs --output var/cren-images/live-review-UNIQUE-RUN
```

Verified successful full inventory run, Node syntax check and refusal to reuse an existing output directory. Registered the helper in `/Users/mr.adams/CODEX_WORKFLOWS.md`.

Limitations: no reverse-image authentication or full rights audit; source claims were not independently established for all assets. Inventory covers API heroes and server-rendered image elements, not authenticated pages, transient client-only advertisements, CSS background imagery or every possible interactive state. Current public API listed no ads. These limits prevent claiming that every possible site image is certified realistic/authentic.
