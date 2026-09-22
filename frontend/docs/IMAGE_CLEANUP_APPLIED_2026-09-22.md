# CREN image-only cleanup — September 22, 2026

Owner authorized replacing reused/unrealistic images and correcting image labels on the live site, with article text
unchanged and no paid image generation or purchases. This is a specific live-image repair, not new article-publication
authority. Source selection and pixel review remained with the image desk, not a separate owner review gate.

## Applied database repair

Batch `846edf78-0eff-4f81-8048-62da53160d2a` completed atomically for all 105 live articles:

- 13 flagged heroes replaced with individually reviewed, permitted archival photographs from Wikimedia Commons.
- 104 image alt/caption pairs corrected; the existing accurately credited archival bridge photograph retained unchanged.
- Final article corpus: 14 archival photographs and 91 clearly identified, natural-looking AI illustrations.
- All 67 stale fingerprint URLs repaired using actual current image bytes. Every image job and audit receipt verified.
- Every non-image article field, including title, body, status, date and author, independently compared unchanged.
- Existing images were not deleted or overwritten. Historical email approvals and proofs were not rewritten.

Private, ignored recovery evidence: `var/cren-images/repairs/846edf78-0eff-4f81-8048-62da53160d2a-before.json`,
`-planned.json`, and `-uploads.jsonl`. The upload journal is flushed before each delivery verification. Do not publish
these snapshots, blindly rerun the applied plan, or delete its old/new Blob URLs. A rollback requires a freshly scoped,
fenced image-only plan and the recorded prior image metadata; restore related fingerprint/job evidence consistently.

Curated plan: `var/cren-images/cleanup-plan-2026-09-22.json`. Source metadata, original bytes and reviewed final crops
are retained under `cleanup-commons-2026-09-22-r2`, `cleanup-italian-2026-09-22`, and `cleanup-alternates-2026-09-22`.
The blurry Hilltop photo and billboard-dominated South High Street candidate were rejected and never uploaded.
Captions distinguish archival context from current listings, named development sites, construction and reported events.
All required credits, license links and crop/adaptation notices are included.

## Website and recurrence protections

Repeated decorative images were removed from area identities and evergreen guide cards. Text/links remain; no empty
image placeholder is inserted. Three dedicated guide heroes remain individually used. Article cards may show the same
story's own hero; different stories do not share an image. Public article thumbnails retain the reviewed 16:9 frame on
mobile and desktop. Home/blog/area/topic cards display AI or archival-context disclosures, and article credit/license
links render as safe links rather than raw Markdown.

The existing source staging guard now checks raw article image URLs even when a fingerprint is missing. The fingerprint
sync defaults to read-only and uses fresh bytes plus a whole-corpus fenced transaction. A new offline reuse auditor
checks exact bytes, decoded pixels, perceptual similarity and common crops, and flags repeated non-article assets.
These checks are conservative evidence, not a guarantee against every transformation or proof of realism/licensing.

## Verification and deployment

- Proposed 105-image set passed fresh-byte identity and all-pairs perceptual/crop checks before upload.
- 68 isolated PostgreSQL tests passed, including stale state rejection and transaction rollback on SHA conflict.
- Five upload-journal/preflight tests passed; UI/image regression tests, full ESLint, TypeScript and diff checks passed.
- Final full suite: 389 passed, four explicitly skipped PostgreSQL groups, zero failed. The separate isolated editorial
  PostgreSQL run passed all 68 tests; unrelated intake integration was not rerun for this image-only change.
- Post-apply read-only fingerprint scan: 105 scanned, zero duplicate candidates, invalid images or stale cache issues.
- Image-only fallback sync corrected 103 of its 104 existing article records. Independent comparison confirmed every
  non-image field and all other snapshot data/meta unchanged; no additional article was inserted.
- Deployed/promoted `dpl_EU6BKBqCntQcykHQk7VCD7kQUZo7`, independently verified on both apex and www. Protected build,
  API metadata and homepage image/disclosure checks passed first. Previous public UI release is
  `dpl_26qrP9H8AHWcScbKFRNacrmJb3S8`; reverting UI alone does not roll back the database repair.
- Fresh public crawl: 248 pages returned 200; all 108 images downloaded/decoded. All 105 article image hashes, alt text
  and captions exactly matched the reviewed plan. All 5,778 asset comparisons plus crop probes found zero candidates,
  cross-story duplicates or shared guide images. Evidence: `var/cren-images/live-verified-2026-09-22`.
- Production desktop/mobile browser verification is finishing. An initial network-idle wait timed out on a healthy
  area page; the browser helper now verifies visible content and actual decoded images rather than background silence.

Paid revisions, paid cloud generation, workflow schedules, article copy and publication policy were not changed.
