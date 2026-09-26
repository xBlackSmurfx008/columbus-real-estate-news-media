import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { buildCardSvg, hammingDistance, MIN_CARD_DISTANCE, perceptualHash, renderCard } from '../scripts/cren-graphic-lib.mjs';
import { fingerprintArticleImageBytes, NEAR_DUPLICATE_MAX_DISTANCE } from '../lib/article-image-fingerprint-core.ts';
import { validateImageAttachmentReview } from '../scripts/editorial-image-policy.mjs';

const spec = {
  kicker: 'Development · Arena District',
  headline: 'Downtown Commission approves 242 apartments for Vine Street parking lot',
  facts: [{ value: '242', label: 'apartments' }, { value: 'Sept. 22', label: 'commission vote' }],
  location: '120 Vine St., Columbus',
  source: 'Source: Columbus Downtown Commission, case COA2600944',
};

test('card renders a deterministic 1600x900 PNG', async () => {
  const first = await renderCard(spec);
  const second = await renderCard(spec);
  assert.equal(first.sourceSha256, second.sourceSha256);
  const meta = await sharp(first.bytes).metadata();
  assert.deepEqual([meta.format, meta.width, meta.height], ['png', 1600, 900]);
});

test('card perceptual hash matches the attachment worker fingerprint', async () => {
  const card = await renderCard(spec);
  assert.equal(card.perceptualHash, (await fingerprintArticleImageBytes(card.bytes)).perceptualHash);
});

test('cards re-seed until clear of existing images and the worker duplicate threshold', async () => {
  const first = await renderCard(spec);
  const second = await renderCard({ ...spec, headline: 'A different verified Columbus headline for the next story' },
    { compareHashes: [first.perceptualHash] });
  assert.ok(second.minDistance >= MIN_CARD_DISTANCE);
  assert.ok(hammingDistance(first.perceptualHash, await perceptualHash(second.bytes)) > NEAR_DUPLICATE_MAX_DISTANCE);
});

test('card text is escaped and oversized fields are rejected', () => {
  assert.match(buildCardSvg({ ...spec, location: 'A & B <St>' }), /A &amp; B &lt;St&gt;/);
  assert.throws(() => buildCardSvg({ ...spec, facts: [] }), /CARD_FACTS_INVALID/);
  assert.throws(() => buildCardSvg({ ...spec, headline: 'x'.repeat(111) }), /CARD_HEADLINE_INVALID/);
});

test('a CREN_GRAPHIC data card satisfies the source-asset image gate', async () => {
  const card = await renderCard(spec);
  const source = 'https://www.columbus.gov/Business-Development/Commissions/Downtown-Commission';
  const plan = validateImageAttachmentReview({
    article_id: 'candidate', source_sha256: card.sourceSha256,
    image_alt: 'CREN data card summarizing the Downtown Commission approval of 242 apartments at 120 Vine St.',
    image_brief: {
      image_policy_version: 'cren-image-v2-real-photo-first', source_asset_considered: true,
      source_asset_note: 'No redistributable photo of the site was found; a CREN data card built from the commission record is used.',
      source_review: [{ url: source, outcome: 'SELECTED', note: 'Primary record the card facts come from.' }],
    },
    image_provenance: {
      type: 'CREN_GRAPHIC', source, caption: 'CREN graphic. Data: Columbus Downtown Commission.',
      license: 'CREN original work', permission_evidence: 'Created by CREN from public records; no third-party imagery.',
      credit: 'CREN graphic', location_note: '120 Vine St., Columbus', date_note: 'Created Sept. 26, 2026',
      verified_by: 'CREN cloud image desk', verified_at: '2026-09-26T16:00:00Z',
    },
    visual_review: { reviewed_by: 'CREN cloud image desk', reviewed_at: '2026-09-26T16:00:00Z', natural_appearance: true,
      geometry_and_shadows: true, no_synthetic_artifacts: true, story_match: true, truthful_caption: true, mobile_crop: true },
  }, 'candidate', card.sourceSha256);
  assert.equal(plan.mode, 'SOURCE_ASSET');
});
