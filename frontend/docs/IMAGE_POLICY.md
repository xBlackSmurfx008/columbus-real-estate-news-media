# CREN image policy: real photos first

Version `cren-image-v2-real-photo-first`, approved September 22, 2026, amended September 26, 2026. Article prompt v1.0.2.
The version string is unchanged so drafts already in the pipeline stay valid; the amendments only widen what qualifies.
Owner clarification: image selection and visual checks are delegated to the image desk. Do not ask the owner for
a separate image review or approval. Send one article proof; the owner's email approval publishes that exact package.

1. Use a relevant photograph of the actual site/event when its identity, context and reuse permission are verified.
   CREN-owned photos from the weekly photo run and reader photos with written permission count (`docs/PHOTO_INTAKE.md`).
2. Otherwise use a CREN chart or map built from public or openly licensed data (`scripts/render-cren-chart.mjs`,
   amendment A below) when the data answers the story's question, for example a map of the actual site.
3. Otherwise use an honest context photo of the same street or district, captioned with what it shows and the year
   taken (amendment D below), when the story is about the place's look or character.
4. Otherwise the cloud routine uses a CREN data card (`CREN_GRAPHIC`) rendered offline by
   `scripts/render-cren-graphic.mjs` from verified facts in the article. It is CREN's own work, so it needs no
   third-party license, and it re-seeds its layout tiles until it clears the near-duplicate check against committed
   images. Field rules are in `prompts/CLOUD_ROUTINE_HANDOFF.md`. A card never depicts or implies a photo of the site.
5. Keep an official rendering only when it best explains the story and its redistribution rights are clear; label it.
6. Outside the cloud routine, a natural photographic-style generic AI illustration with explicit disclosure remains a
   supervised fallback. It is never visual evidence of the named property, residents, ceremony or finished project.

## Amendment, September 26, 2026 (owner approved)

The owner approved four changes to clear the structural image hold recorded in the September 24 to 26 briefs: stories
that are newsworthy now (proposals, demolitions, zoning) rarely have a redistributable photo of the actual site.

### A. Charts and maps are a valid hero

A `CREN_GRAPHIC` built by CREN from public records or openly licensed data belongs to CREN and clears the image contract.
Set `image_brief.image_role: "DATA"`.

- Allowed inputs: government open data and public records (City of Columbus, Franklin County Auditor and GIS, Columbus
  Building and Zoning Services, MORPC, Census/ACS, HUD, FRED), and OpenStreetMap geometry with the attribution
  "© OpenStreetMap contributors (ODbL)" printed on the image. Record the dataset license in `license`.
- Not allowed: screenshots of Google Maps, Apple Maps, Zillow, Redfin, CoStar, LoopNet, MLS pages or any other
  proprietary map or chart; tracing a developer's site plan; paid data CREN has not licensed for redistribution.
- Render from `frontend/` with `node scripts/render-cren-chart.mjs --spec /tmp/chart.json --out content/images/DATE-slug.png`
  (run `npm ci` first so `sharp` is present). It produces a 1600x900 PNG in CREN colors with every label inside the
  mobile crop, refuses a spec whose `source_line` does not start with "Data:", prints the `cloud_image_asset` hashes,
  and re-seeds its header and footer bands until it clears the same near-duplicate guard as the data card.
- `image_provenance`: `type: "CREN_GRAPHIC"`, `source` = the dataset page (also the SELECTED `source_review` url),
  `license` = the data license or "public record", `permission_evidence` = "Original CREN graphic built from <dataset>;
  no third party image content", `credit` = "CREN graphic", `location_note` and `date_note` = the geography and the
  date the data was pulled. Caption pattern: "CREN graphic. Data: <agency or dataset>, pulled <date>." The validator
  holds any CREN_GRAPHIC (chart, map or data card) whose caption lacks "CREN" or lacks "data"/"source".
- Every number and point on the graphic must trace to the fetched dataset, exactly like body copy. A map marks a verified
  address or parcel only; never draw a proposed building footprint unless it comes from a public record.
- Visual review for graphics: `natural_appearance` means clean and faithful to the disclosed medium, `story_match` means
  the data answers the story's question, `truthful_caption` means the caption names the source and pull date.

### B. CREN takes its own photos

A weekly photo run (about 30 minutes, one phone) of sites in the news builds a CREN-owned library. Reader-submitted photos
with written permission also qualify. Intake, rights wording and file handling are in `docs/PHOTO_INTAKE.md`. Owned and
reader photos use `type: "LICENSED_PHOTO"`, `image_role: "SUBJECT"` when they show the story site.

### C. Recurring data formats

The routine always has a publishable option on a slow news day. The formats and their primary sources are in
`docs/RECURRING_DATA_FORMATS.md`; each ships with a CREN_GRAPHIC hero, so none depends on finding a photo.

### D. Honest context photos

A rights-cleared photo of the surrounding area may lead a story about a site that has no usable photo. Set
`image_role: "CONTEXT"` and keep `type: "LICENSED_PHOTO"`.

- The caption states what the photo actually shows, where, and the year taken, for example: "S. Front St. in the Brewery
  District, 2014. Photo: Davis.4497, CC BY SA 3.0." The validator holds a context caption without a year.
- The caption and alt text must not say or imply the photo shows the story's building, lot or project. If the subject
  building is visible, say so only when verified; otherwise say "nearby" or name the street.
- The photo must be of the same street, block or named district as the story. A photo of a different neighborhood, or a
  generic skyline for a site specific story, fails `story_match`.
- Wikimedia Commons CC BY and CC BY SA files qualify when the credit and license name are in the caption. Record the
  Commons file page as `source`. Unknown capture dates are stated as such and cannot be used as context photos.
- Prefer A (a map of the actual site) over D when both are possible; a context photo is the better choice when the story
  is about a place's look or character.

## Source choice record

`image_brief` carries `image_policy_version`, `source_asset_considered: true`, a nonempty `source_asset_note`,
and `source_review`: one to ten actual inspected pages, each with `url`, `outcome` and `note`.
Outcomes are SELECTED, UNAVAILABLE, RIGHTS_UNCLEAR or UNSUITABLE. Explain relevance and permission limitations.
A selected source blocks AI fallback. A boolean saying research occurred is not sufficient. Never fabricate evidence.

For LICENSED_PHOTO (including CREN-owned photos), OFFICIAL_RENDERING, PUBLIC_RECORD_GRAPHIC or CREN_GRAPHIC,
`image_provenance` records: type, caption, source URL matching the selected record, license, permission_evidence,
credit, location_note, date_note, verified_by and verified_at. Caption includes credit and any important date/context
limitation. An unknown capture date must be stated honestly; do not substitute the webpage date as capture date.
An official rendering's caption must say rendering. Public access is not a license and attribution alone is not permission.
These records document an editor's verification; automated checks cannot establish actual ownership or authenticity.

For AI_GENERATED, caption exactly:

> AI-generated illustration; not a photograph of the actual property or event.

Alt text also identifies the image as an AI illustration. No copied photo credit or claims that it shows the actual site.
Use believable everyday light, natural colors, eye-level perspective, realistic materials and ordinary imperfections.
Avoid painterly/cut-paper textures, glossy CGI, cinematic grading, fake text, perfect symmetry and invented specificity.
Cloud and local workers share the same prompt builder. Existing provider/budget flags are not changed by this policy.

## Acquisition and visual review

The cloud writer can research, choose and inspect a permitted source file, committing original bytes and the
`cloud_image_asset` receipt described in `prompts/CLOUD_ROUTINE_HANDOFF.md`. The cloud attachment worker retrieves
only the fixed repository at the import receipt's immutable commit, validates both byte hashes, decodes and center-crops
the source and stages it atomically. No Mac or second owner image approval is required. Missing evidence is held.
Because GitHub is public, the recorded rights must also allow redistribution of the original asset there; permission
limited to CREN website display is insufficient. Do not commit private permission correspondence.
Paid cloud generation requires the separate `CREN_CLOUD_AI_IMAGES_ENABLED=true`; it is currently off. The local
attachment helper remains available for supervised recovery, not as a dependency of the cloud-only path.
It does not autonomously acquire photo rights. No license purchase, permission-request email or provider spend increase
is authorized by this policy. Source failures must not be silently relabeled as generated photography.

Local attachment requires review.json with article_id, base_submission_sha256 (from the manifest), source_sha256
(SHA-256 of the exact input file), image_brief, image_provenance, image_alt and visual_review.
The visual_review contains actual reviewed_by and reviewed_at plus true values ONLY after inspecting each:
natural_appearance, geometry_and_shadows, no_synthetic_artifacts, story_match, truthful_caption and mobile_crop.
For genuine renderings/graphics, natural_appearance means faithful to the explicitly disclosed medium, not pretending
that the rendering is a photo. These are image-desk checks, not a task for the owner. Include the final image in the
article proof for transparency; there is no separate image approval gate.

Inspect original resolution and the centered 16:9 crop. Crop/resize/compression is permitted; AI reconstruction of a
news photograph is not. Hold weak images. At most one targeted generation retry, never an unlimited spend loop.

```bash
# Read-only source decision; emits a generation prompt only for a permitted fallback.
node scripts/review-image-choice.mjs --review var/cren-images/ARTICLE_ID/review.json
# Read-only attachment preflight; credentials injected privately.
node scripts/attach-article-image.mjs --article-id ARTICLE_ID --file SOURCE --review REVIEW.json
# Stage the reviewed image on a draft only; does not publish or email.
node scripts/attach-article-image.mjs --article-id ARTICLE_ID --file SOURCE --review REVIEW.json --apply --confirm attach-reviewed-image
```

The attachment transaction binds the unchanged draft/evidence snapshot and writes URL, caption, alt, provenance,
review and fingerprint together. Existing live heroes cannot be replaced through this helper. A failed/ambiguous upload
may leave an unreferenced Blob for later reconciliation; never delete content-addressed bytes blindly.
Owner email approval covers the exact article/image/caption. Any replacement changes the hash and requires a new proof.
Technical reachability and duplicate checks are necessary, but do not prove naturalness or truthfulness.

## Unique imagery and public-site audits

A story may reuse its own hero as a thumbnail linking to that same story. Different stories must not share a photo,
including renamed, recompressed or obviously cropped copies. Area identities and evergreen guide cards must not borrow
a story photo or rotate generic stock images across unrelated places. Until a unique, verified image is available,
use the text-only guide card. Preserve the reviewed 16:9 frame on public cards, including mobile layouts.

`node scripts/prepare-live-image-review.mjs --output var/cren-images/NEW_RUN` is a public, read-only crawl that saves
an image inventory and contact sheets. Then run
`node scripts/audit-image-reuse.mjs --manifest var/cren-images/NEW_RUN/manifest.json --output var/cren-images/NEW_RUN/reuse-audit.json`.
It checks byte identity, decoded pixels, perceptual similarity and common crop variants, and reports reused guide assets.
Exit 1 means an unresolved match, repeated guide image or audit error. Visually inspect candidates and final source
files; a clean fingerprint report does not certify realism, licensing or every possible transformed duplicate.

After an authorized image repair, `node scripts/sync-image-fingerprints.mjs` previews the current live corpus against
freshly downloaded bytes. Its explicit `--apply` updates the cache only after a complete, fenced preflight. A stale
cache is not evidence that a candidate is unique. The source staging path also checks current article URLs directly.

Owner-authorized exceptions for already-live images use `scripts/apply-live-image-cleanup.mjs --plan FILE` first.
An exact whole-live-corpus plan must bind current image URLs and byte hashes, reviewed replacement bytes and rights
captions. Applying requires `--apply --confirm image-only-cleanup`, preserves article copy/status and historical email
approvals, journals uploads, saves a private before-state and atomically writes image fields, fingerprints and receipts.
This is not an unattended publication bypass. Never apply it without explicit authority for the named image cleanup.

## Installed worker alignment

The cloud-only migration supersedes the local schedule once deployed and verified. Retain the local plist for recovery,
but unload and persistently disable its service to avoid competing workers after login. Do not re-enable, reinstall
or kickstart it without explicit intent. The retained plist is recoverable; no local images or credentials were deleted.

The local LaunchAgent must point at the repaired checkout, not an older prompt/provider. Preserve its existing times.
`CREN_IMAGE_ENV_FILE` may point to the existing private 0600 environment file; never embed secrets in the plist.
Installer defaults to dry-run, backs up its prior plist privately on apply, reloads only com.cren.image-backfill,
and does not kickstart generation:

```bash
CREN_IMAGE_ENV_FILE=/absolute/private/.env.local node scripts/install-image-backfill.mjs
CREN_IMAGE_ENV_FILE=/absolute/private/.env.local node scripts/install-image-backfill.mjs --apply --confirm=install-cren-image-worker
```
