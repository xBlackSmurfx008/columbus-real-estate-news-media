# CREN image sourcing and fallback plan

Written 2026-09-19. Companion to `NEWSROOM_IMAGE_AUTOMATION.md`, which describes
the cloud generation workflow. This document covers what to do when the
generator is unavailable, and how to use licensed third-party images correctly.

## The actual blocker is storage, not generation

The instinct is that heroes are blocked because Higgsfield is out of credits.
That is not what the code shows.

Every image path in this repo — generated, licensed, photographed, or drawn —
ends at the same step: upload the bytes to public Vercel Blob and write the
resulting `https://...public.blob.vercel-storage.com/` URL to `articles.image_url`.
That upload needs `BLOB_READ_WRITE_TOKEN`, which is **not set** in the routine
environment.

Two things follow, and they are the whole point of this document:

1. **A second image generator fixes nothing on its own.** Swapping Higgsfield
   for another model still produces bytes that cannot be stored.
2. **Third-party images are already supported.** `scripts/attach-article-image.mjs`
   takes any local file, normalizes it to 1600×900 WebP, fingerprints it,
   rejects exact and near duplicates, uploads it, and attaches it. It does not
   care where the file came from. The missing piece is not code — it is the
   token, plus a documented way to pick a licensed image and carry its credit.

`scripts/article-image-policy.mjs` accepts only three durable hosts:
`images.unsplash.com`, `*.cloudfront.net`, and `*.public.blob.vercel-storage.com`.
Anything from Wikimedia, a city website, or a developer press kit must therefore
be **mirrored into our own Blob store**, not hotlinked. That is also the correct
etiquette: Wikimedia explicitly discourages hotlinking, and hotlinked images rot.

### Credentials, in the order they unblock work

| Variable | Unblocks | Status |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | **Everything.** Placeholder cards, licensed images, every generator. | unset |
| `OPENAI_API_KEY` or `AI_GATEWAY_API_KEY` | Cloud hero generation | unset |
| `NEWSROOM_IMAGE_SERVICE_URL` + `_SECRET` | Shared generation service (both required) | unset |
| `CREN_CLOUD_IMAGES_ENABLED=true` | Arms the cloud workflow (fails closed otherwise) | unset |

Set the Blob token first. It is the only one that is a hard prerequisite for
all the others.

## Publication rule: a missing hero never blocks a story

Two rules in this codebase contradicted each other, and the contradiction is
why nothing published between 2026-09-13 and 2026-09-18.

- CLAUDE.md (owner policy, 2026-08-25) says images never block publication, and
  the hero is attached as soon as possible *after* publish.
- The `articles_live_image_required` CHECK constraint (owner requirement,
  2026-08-14) forbade any live article from having a null `image_url`.

`scripts/list-missing-images.mjs` settles which one the system was built for: its
work queue selects `status = 'live' AND image_url IS NULL`, so the backfill
workflow assumes live imageless rows exist and is the mechanism the newer policy
depends on.

`scripts/migrate-live-image-policy.mjs` relaxes the constraint to match. A live
article may now have a null `image_url`, meaning "hero pending backfill". What
the constraint still rejects is a live row whose `image_url` is set but is not
`https://` — in particular the local `/images/heroes/<id>.webp` path, which only
resolves after a deploy and is therefore not a publication image.

`scripts/publish-article.mjs` resolves the hero *before* its INSERT. This matters:
the constraint is evaluated by the INSERT itself, so the old code's
attach-afterwards ordering meant the placeholder fallback could never run.

## Source ladder

Work down this ladder and stop at the first tier that yields a truthful,
story-specific image. Tiers 1–4 are free and need no generator.

**Tier 1 — Public record and official sources.** City of Columbus, Franklin
County Auditor parcel photos and maps, MORPC, ODOT, OHFA, and state agency
releases. These are the best fit for CREN: they are primary sources, usually
public record, and inherently story-specific. Credit the agency and link the
record.

**Tier 2 — Official press kits and renderings.** Developer, architect, and
institutional press pages. These are copyrighted but frequently grant editorial
use with credit. Use only when the page states press/editorial use, or after
written permission. Record who granted it. Never scrape a rendering off an
article and call it a press image.

**Tier 3 — Openly licensed photography.** Wikimedia Commons and Openverse both
have free APIs with no key required. Wikimedia is strong on Columbus buildings,
neighborhoods, and landmarks. Every file carries a specific license — public
domain, CC0, CC BY, CC BY-SA — and the attribution requirements differ per file.
Read the license on the file page; do not assume.

**Tier 4 — CREN-made data graphics.** For market, policy, and trend stories, a
chart built from our own verified market data is truthful, unique, free of
licensing risk, and more informative than any photograph. `editorial-card-lib.mjs`
already renders SVG to WebP with sharp, so the rendering path exists. This tier
is underused and should be the default for market-data stories.

**Tier 5 — Generated illustration.** Last resort, and only where the editorial
standard permits it. Per `cren-copywriting`, a generated image must read as a
clearly illustrative CREN house-style graphic, never a fake documentary
photograph, and must be captioned "AI-generated illustration."

**Never:** generic stock that implies a specific property, and the standing
blocklist — handshakes, keys, money, arrows, glowing houses, hardhat-and-blueprint
still lifes, glass towers, skyline montages, and invented properties. Note that
`images.unsplash.com` is on the durable-host allowlist for historical reasons.
That makes it technically usable but rarely editorially appropriate, because
generic stock cannot honestly illustrate a specific parcel or filing.

## Attribution is not optional

Any Tier 1–3 image carries a licence obligation, and a wrong credit is a
correction. Every non-generated hero must record, in `image_provenance`:

- the source and a link to the page the file came from;
- the creator or agency as the licence names them;
- the licence itself, by name and version (e.g. "CC BY-SA 4.0"), with a link;
- any modification we made — our pipeline always crops to 1600×900, and CC BY-SA
  requires that adaptations be flagged and share-alike preserved.

The public caption must name the creator and the licence. "Photo: Jane Doe,
CC BY-SA 4.0, via Wikimedia Commons (cropped)" is correct; "via Wikimedia" is not.

A practical rule that avoids most risk: **prefer public domain, CC0, and CC BY
over CC BY-SA**, because share-alike raises questions about the surrounding page
that we should not have to argue about. Skip any file whose licence is unclear
or marked non-commercial — CREN carries advertising, so NC-licensed work does
not qualify.

## Higgsfield

Higgsfield is not wired into this repository. There are no references to it in
`scripts/`, `app/`, or `lib/`; it reaches articles only through the external
local LaunchAgent, and `HIGGSFIELD_CREDENTIALS_B64` is the sole trace of it in
the routine environment. The documented cloud chain
(`AI_GATEWAY_API_KEY` → `OPENAI_API_KEY` → shared service → Vercel OIDC) does not
include it.

So the recommendation is not to buy more Higgsfield credits. It is to stop
depending on a generator that the pipeline does not actually know about:

1. Treat Higgsfield as retired for newsroom heroes unless someone deliberately
   integrates it behind the same normalize/fingerprint/upload path.
2. Fund one credential in the documented chain instead. An OpenAI key is the
   least-effort option and is already supported.
3. Track spend monthly against articles published, and set a hard budget. Tiers
   1–4 should carry most stories, so generation should be a small line item. If
   it is not, the ladder is being skipped.

## What to build, in order

1. **Set `BLOB_READ_WRITE_TOKEN` in the routine environment.** Owner action.
   Nothing below works without it, and it alone restores placeholder cards.
2. **Add licence fields to the attach path.** Extend
   `scripts/attach-article-image.mjs` with required `--source-url`, `--creator`,
   and `--license` arguments for any non-generated image, and have it refuse to
   attach a Tier 1–3 image without them. Done when attaching a licensed image
   without a credit fails loudly.
3. **Add `scripts/find-licensed-image.mjs`.** Query Openverse and Wikimedia
   Commons for a story's subject, filter to commercially usable licences, and
   print candidates with licence and attribution already formatted. Read-only:
   it proposes, a human or the newsroom routine picks. Done when it returns
   usable candidates for a real Columbus address or landmark.
4. **Add a data-graphic generator for market stories (Tier 4).** Reuse the
   existing SVG→WebP path, driven by `lib/market-data.ts` canonical values.
   Done when a market story can publish with a truthful chart hero and no
   external dependency at all.
5. **Fund one generation credential and enable the cloud path.** Then run the
   documented preflight: `npm run test:image-pipeline`,
   `npm run newsroom:audit-public-images`, `npm run newsroom:sync-image-fingerprints`.

Steps 2–4 are ordinary in-repo work and need no new credentials. Step 1 is the
only true blocker, and it is an owner action.
