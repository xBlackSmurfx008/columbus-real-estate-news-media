import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AI_IMAGE_CAPTION,
  IMAGE_POLICY_VERSION,
  planEditorialImage,
  validateImageAttachmentReview,
} from '../scripts/editorial-image-policy.mjs';

const articleId = 'local-image-policy-fixture';
const sourceSha256 = 'a'.repeat(64);
const sourceUrl = 'https://photos.example.test/columbus-project';
function sourcedPhoto() {
  return {
    article_id: articleId,
    source_sha256: sourceSha256,
    image_alt: 'A brick building and sidewalk at the documented Columbus project site.',
    image_caption: 'Columbus project site, September 2026. Photo: Example Photographer.',
    image_brief: {
      image_policy_version: IMAGE_POLICY_VERSION,
      source_asset_considered: true,
      source_review: [{ url: sourceUrl, note: 'Reviewed the original source file and its reuse permission.', outcome: 'SELECTED' }],
    },
    image_provenance: {
      type: 'LICENSED_PHOTO', source: sourceUrl, license: 'Written editorial-use license',
      permission_evidence: 'Owner permission reference: local-fixture-2026-09-22',
      credit: 'Example Photographer',
      caption: 'Columbus project site, September 2026. Photo: Example Photographer.',
      location_note: 'Verified location against the source project address.',
      date_note: 'Source records date of capture as September 2026.',
      verified_by: 'Local fixture image editor', verified_at: '2026-09-22T12:00:00Z',
    },
    visual_review: {
      reviewed_by: 'Local fixture image editor', reviewed_at: '2026-09-22T12:05:00Z',
      natural_appearance: true, geometry_and_shadows: true, no_synthetic_artifacts: true,
      story_match: true, truthful_caption: true, mobile_crop: true,
    },
  };
}
function aiFallback() {
  const article = sourcedPhoto();
  article.image_brief.source_review[0].outcome = 'RIGHTS_UNCLEAR';
  article.image_brief.source_review[0].note = 'The source offers no reusable photograph or permission contact.';
  article.image_brief.source_asset_note = 'No usable licensed source asset was available after the recorded review.';
  article.image_provenance = { type: 'AI_GENERATED', caption: AI_IMAGE_CAPTION };
  article.image_caption = AI_IMAGE_CAPTION;
  article.image_alt = 'AI-generated illustration of a generic Central Ohio brick building and sidewalk.';
  return article;
}
function assertHold(article, reason) {
  assert.deepEqual(planEditorialImage(article), { mode: 'NEEDS_RESEARCH', reason });
}

test('verified source photo is selected without authorizing generation or proving ownership automatically', () => {
  assert.deepEqual(planEditorialImage(sourcedPhoto()), {
    mode: 'SOURCE_ASSET', reason: 'Use the verified source file; never synthesize a replacement.',
  });
});

test('source photos require every recorded rights, credit, context and verification field', () => {
  for (const field of ['source', 'license', 'permission_evidence', 'credit', 'caption', 'location_note', 'date_note', 'verified_by', 'verified_at']) {
    for (const missing of [undefined, '', '   ']) {
      const article = sourcedPhoto(); article.image_provenance[field] = missing;
      assertHold(article, 'SOURCE_RIGHTS_AND_CONTEXT_REQUIRED');
    }
  }
  const invalidDate = sourcedPhoto(); invalidDate.image_provenance.verified_at = 'not a date';
  assertHold(invalidDate, 'SOURCE_RIGHTS_AND_CONTEXT_REQUIRED');
  const unrelatedSource = sourcedPhoto(); unrelatedSource.image_provenance.source = 'https://photos.example.test/another-file';
  assertHold(unrelatedSource, 'SOURCE_RIGHTS_AND_CONTEXT_REQUIRED');
});

test('source photo caption must retain the exact credit and match its article caption', () => {
  const missingCredit = sourcedPhoto(); missingCredit.image_provenance.caption = 'Columbus project site.';
  assertHold(missingCredit, 'SOURCE_CAPTION_MISMATCH');
  const differentCaption = sourcedPhoto(); differentCaption.image_caption = 'A different location and date.';
  assertHold(differentCaption, 'SOURCE_CAPTION_MISMATCH');
});

test('renderings must be disclosed and cannot masquerade as licensed photographs', () => {
  const rendering = sourcedPhoto(); rendering.image_provenance.type = 'OFFICIAL_RENDERING';
  assertHold(rendering, 'RENDERING_DISCLOSURE_REQUIRED');
  rendering.image_caption = rendering.image_provenance.caption = 'Official rendering. Credit: Example Photographer.';
  assert.equal(planEditorialImage(rendering).mode, 'SOURCE_ASSET');
  rendering.image_provenance.type = 'LICENSED_PHOTO';
  assertHold(rendering, 'PHOTO_PROVENANCE_CONFLICT');
  rendering.image_caption = rendering.image_provenance.caption = 'AI-generated view. Credit: Example Photographer.';
  assertHold(rendering, 'PHOTO_PROVENANCE_CONFLICT');
});

test('AI fallback requires actual source-review records instead of only a considered flag', () => {
  for (const sourceReview of [undefined, [], [{ outcome: 'UNAVAILABLE' }],
    [{ url: sourceUrl, outcome: 'UNAVAILABLE', note: '' }],
    [{ url: sourceUrl, outcome: 'NOT_CHECKED', note: 'A claim without review.' }],
    Array.from({ length: 11 }, () => ({ url: sourceUrl, outcome: 'UNAVAILABLE', note: 'Checked.' }))]) {
    const article = aiFallback(); article.image_brief.source_review = sourceReview;
    assertHold(article, 'REAL_PHOTO_RESEARCH_REQUIRED');
  }
  for (const flag of [undefined, false, 'true']) {
    const article = aiFallback(); article.image_brief.source_asset_considered = flag;
    assertHold(article, 'REAL_PHOTO_RESEARCH_REQUIRED');
  }
  const oldPolicy = aiFallback(); oldPolicy.image_brief.image_policy_version = 'previous-policy';
  assertHold(oldPolicy, 'REAL_PHOTO_RESEARCH_REQUIRED');
});

test('source review rejects non-web and credential-bearing evidence URLs', () => {
  for (const url of ['file:///tmp/photo.jpg', 'data:image/png;base64,AAAA', 'javascript:alert(1)',
    'https://user:secret@example.test/image', '/relative/photo.jpg', 'not a URL']) {
    const article = aiFallback(); article.image_brief.source_review[0].url = url;
    assertHold(article, 'REAL_PHOTO_RESEARCH_REQUIRED');
  }
});

test('AI fallback requires a recorded reason and exact public disclosure', () => {
  const valid = aiFallback();
  assert.deepEqual(planEditorialImage(valid), { mode: 'AI_FALLBACK', reason: valid.image_brief.source_asset_note });
  const noReason = aiFallback(); delete noReason.image_brief.source_asset_note;
  assertHold(noReason, 'AI_FALLBACK_REASON_REQUIRED');
  for (const caption of ['', 'Illustration.', 'A photograph of the actual property.', `${AI_IMAGE_CAPTION} `]) {
    const article = aiFallback(); article.image_provenance.caption = caption;
    assertHold(article, 'AI_DISCLOSURE_REQUIRED');
  }
  const mismatch = aiFallback(); mismatch.image_caption = 'Undisclosed generated scene.';
  assertHold(mismatch, 'AI_DISCLOSURE_REQUIRED');
  const falseAlt = aiFallback(); falseAlt.image_alt = 'The actual project groundbreaking.';
  assertHold(falseAlt, 'AI_ALT_DISCLOSURE_REQUIRED');
});

test('a selected real source blocks generation even when fallback reason and AI disclosure exist', () => {
  const article = aiFallback();
  article.image_brief.source_review.push({ url: 'https://photos.example.test/available', outcome: 'SELECTED', note: 'A suitable licensed original is available.' });
  assertHold(article, 'USE_SELECTED_SOURCE_ASSET');
  assert.throws(() => validateImageAttachmentReview(article, articleId, sourceSha256), /USE_SELECTED_SOURCE_ASSET/);
});

test('attachment review binds the exact article and source-file bytes', () => {
  const review = sourcedPhoto();
  assert.equal(validateImageAttachmentReview(review, articleId, sourceSha256).mode, 'SOURCE_ASSET');
  assert.throws(() => validateImageAttachmentReview(undefined, articleId, sourceSha256), /IMAGE_REVIEW_FILE_MISMATCH/);
  assert.throws(() => validateImageAttachmentReview(review, 'another-article', sourceSha256), /IMAGE_REVIEW_FILE_MISMATCH/);
  assert.throws(() => validateImageAttachmentReview(review, articleId, 'b'.repeat(64)), /IMAGE_REVIEW_FILE_MISMATCH/);
  delete review.source_sha256;
  assert.throws(() => validateImageAttachmentReview(review, articleId, sourceSha256), /IMAGE_REVIEW_FILE_MISMATCH/);
});

test('attachment requires every full-size visual inspection attestation, reviewer and valid review date', () => {
  const absent = sourcedPhoto(); delete absent.visual_review;
  assert.throws(() => validateImageAttachmentReview(absent, articleId, sourceSha256), /FULL_SIZE_IMAGE_REVIEW_REQUIRED/);
  for (const check of ['natural_appearance', 'geometry_and_shadows', 'no_synthetic_artifacts', 'story_match', 'truthful_caption', 'mobile_crop']) {
    for (const invalid of [undefined, false, 'true', 1]) {
      const review = sourcedPhoto(); review.visual_review[check] = invalid;
      assert.throws(() => validateImageAttachmentReview(review, articleId, sourceSha256), /FULL_SIZE_IMAGE_REVIEW_REQUIRED/);
    }
  }
  for (const [field, value] of [['reviewed_by', '   '], ['reviewed_at', 'not a date']]) {
    const review = sourcedPhoto(); review.visual_review[field] = value;
    assert.throws(() => validateImageAttachmentReview(review, articleId, sourceSha256), /FULL_SIZE_IMAGE_REVIEW_REQUIRED/);
  }
});

test('attachment alt text is required and enforces inclusive 40-to-160 character limits', () => {
  for (const alt of [undefined, '', ' '.repeat(40), 'a'.repeat(39), 'a'.repeat(161)]) {
    const review = sourcedPhoto(); review.image_alt = alt;
    assert.throws(() => validateImageAttachmentReview(review, articleId, sourceSha256), /IMAGE_ALT_REQUIRED/);
  }
  for (const size of [40, 160]) {
    const review = sourcedPhoto(); review.image_alt = 'a'.repeat(size);
    assert.equal(validateImageAttachmentReview(review, articleId, sourceSha256).mode, 'SOURCE_ASSET');
  }
});

test('visual review cannot bypass missing source rights or AI disclosure', () => {
  const source = sourcedPhoto(); delete source.image_provenance.permission_evidence;
  assert.throws(() => validateImageAttachmentReview(source, articleId, sourceSha256), /SOURCE_RIGHTS_AND_CONTEXT_REQUIRED/);
  const generated = aiFallback(); generated.image_provenance.caption = 'Photograph.';
  assert.throws(() => validateImageAttachmentReview(generated, articleId, sourceSha256), /AI_DISCLOSURE_REQUIRED/);
  assert.equal(validateImageAttachmentReview(aiFallback(), articleId, sourceSha256).mode, 'AI_FALLBACK');
});

test('CREN data graphics may lead a story when the caption names CREN and the data source', () => {
  const graphic = sourcedPhoto();
  graphic.image_brief.image_role = 'DATA';
  graphic.image_provenance.type = 'CREN_GRAPHIC';
  graphic.image_provenance.credit = 'CREN graphic';
  graphic.image_caption = graphic.image_provenance.caption = 'CREN graphic. Data: City of Columbus building permits, pulled Sept. 26, 2026.';
  assert.equal(planEditorialImage(graphic).mode, 'SOURCE_ASSET');
  graphic.image_caption = graphic.image_provenance.caption = 'CREN graphic of permits.';
  assertHold(graphic, 'GRAPHIC_DATA_SOURCE_CAPTION_REQUIRED');
  const photoAsData = sourcedPhoto(); photoAsData.image_brief.image_role = 'DATA';
  assertHold(photoAsData, 'DATA_ROLE_REQUIRES_GRAPHIC');
});

test('context photos must be licensed photographs whose caption states the year taken', () => {
  const context = sourcedPhoto();
  context.image_brief.image_role = 'CONTEXT';
  context.image_caption = context.image_provenance.caption = 'S. Front St. in the Brewery District, 2014. Photo: Example Photographer.';
  assert.equal(planEditorialImage(context).mode, 'SOURCE_ASSET');
  context.image_caption = context.image_provenance.caption = 'S. Front St. in the Brewery District. Photo: Example Photographer.';
  assertHold(context, 'CONTEXT_CAPTION_YEAR_REQUIRED');
  const renderingContext = sourcedPhoto(); renderingContext.image_brief.image_role = 'CONTEXT';
  renderingContext.image_provenance.type = 'OFFICIAL_RENDERING';
  renderingContext.image_caption = renderingContext.image_provenance.caption = 'Official rendering, 2026. Credit: Example Photographer.';
  assertHold(renderingContext, 'CONTEXT_ROLE_REQUIRES_PHOTO');
  const unknownRole = sourcedPhoto(); unknownRole.image_brief.image_role = 'MOOD';
  assertHold(unknownRole, 'IMAGE_ROLE_INVALID');
});
