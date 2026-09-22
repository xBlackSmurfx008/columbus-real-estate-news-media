import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { prepareCloudDraft, titlesDuplicate } from '../scripts/cloud-draft-import.mjs';
import { IMAGE_POLICY_VERSION } from '../scripts/editorial-image-policy.mjs';

const date = '2026-09-22';
const now = new Date('2026-09-22T18:00:00Z');
const fixture = JSON.parse(await readFile(new URL('../content/articles/2026-09-16-columbus-east-side-permanently-affordable-condos-community-land-trust.json', import.meta.url), 'utf8'));
function valid() {
  const article = structuredClone(fixture);
  article.prompt_version = 'cren-article-v1.0.2'; article.date = date; article.fact_checked_at = now.toISOString();
  article.source_ledger = article.source_ledger.map(source => ({ ...source, fetched_at: now.toISOString() }));
  article.image_url = null; delete article.image_sha256;
  const source = 'https://photos.example.test/fixture-original';
  article.image_brief = { ...article.image_brief, image_policy_version: IMAGE_POLICY_VERSION,
    source_asset_considered: true, source_review: [{ url: source, outcome: 'SELECTED', note: 'Local fixture source and permission review.' }] };
  article.image_provenance = { type: 'LICENSED_PHOTO', source, license: 'Written editorial permission',
    permission_evidence: 'Local fixture permission record', credit: 'Example Photographer',
    caption: 'Project site. Photo: Example Photographer.', location_note: 'Verified project location.', date_note: 'September 2026.',
    verified_by: 'Fixture image editor', verified_at: now.toISOString() };
  article.image_caption = article.image_provenance.caption;
  article.image_alt = 'A brick building and sidewalk at the documented Columbus project site.';
  article.cloud_image_asset = { path: `frontend/content/images/${date}-fixture-photo.webp`,
    git_blob_sha: 'd'.repeat(40), source_sha256: 'e'.repeat(64), visual_review: {
      reviewed_by: 'Fixture image editor', reviewed_at: now.toISOString(), natural_appearance: true,
      geometry_and_shadows: true, no_synthetic_artifacts: true, story_match: true, truthful_caption: true, mobile_crop: true,
    } };
  return { path: `frontend/content/articles/${date}-fixture.json`, commit: 'a'.repeat(40), blobSha: 'b'.repeat(40), sha256: 'c'.repeat(64), article };
}

test('cloud draft preparation accepts current fresh sourced-photo policy and does not mutate source evidence', () => {
  const artifact = valid(); const before = structuredClone(artifact);
  const prepared = prepareCloudDraft(artifact, date, now);
  assert.equal(prepared.report.passed, true); assert.equal(prepared.imageMode, 'SOURCE_ASSET');
  assert.equal(prepared.article.image_url, null); assert.equal(prepared.article.id, prepared.id);
  assert.match(prepared.id, /^2026-09-22-/); assert.deepEqual(artifact, before);
});

test('cloud draft source path, date and commit/blob/content digest bindings fail closed', () => {
  for (const patch of [{ path: '../fixture.json' }, { path: 'frontend/content/articles/2026-09-21-fixture.json' },
    { path: `frontend/content/articles/${date}-fixture.json/extra` }, { commit: 'not-a-commit' },
    { blobSha: 'f'.repeat(39) }, { sha256: 'x'.repeat(64) }]) {
    assert.throws(() => prepareCloudDraft({ ...valid(), ...patch }, date, now), /IMPORT_SOURCE_BINDING_REQUIRED/);
  }
  assert.throws(() => prepareCloudDraft(valid(), '2026/09/22', now), /IMPORT_SOURCE_BINDING_REQUIRED/);
});

test('cloud import rejects old writing policy, live status and prepared remote images', () => {
  for (const [field, value, error] of [['prompt_version', 'cren-article-v1.0.1', /IMPORT_CURRENT_WRITING_POLICY_REQUIRED/],
    ['status', 'live', /IMPORT_DRAFT_ONLY/], ['image_url', 'https://photos.example.test/photo.jpg', /IMPORT_IMAGE_PREPARATION_REQUIRED/],
    ['image_sha256', 'd'.repeat(64), /IMPORT_IMAGE_PREPARATION_REQUIRED/]]) {
    const artifact = valid(); artifact.article[field] = value;
    assert.throws(() => prepareCloudDraft(artifact, date, now), error);
  }
});

test('cloud import requires fresh reporting, matching article date, approved author and topic', () => {
  for (const factTime of ['2026-09-20T17:59:59Z', '2026-09-22T18:05:01Z', 'invalid']) {
    const artifact = valid(); artifact.article.fact_checked_at = factTime;
    assert.throws(() => prepareCloudDraft(artifact, date, now), /IMPORT_FRESH_REPORTING_REQUIRED/);
  }
  for (const [field, value, error] of [['date', '2026-09-21', /IMPORT_ARTICLE_DATE_MISMATCH/],
    ['author', 'Unapproved Fixture Writer', /IMPORT_BYLINE_REQUIRED/], ['topic_slug', 'acquisition', /IMPORT_TOPIC_REQUIRED/]]) {
    const artifact = valid(); artifact.article[field] = value;
    assert.throws(() => prepareCloudDraft(artifact, date, now), error);
  }
});

test('cloud import cannot bypass photo research, rights or article evidence gates', () => {
  const noResearch = valid(); noResearch.article.image_brief.source_review = [];
  assert.throws(() => prepareCloudDraft(noResearch, date, now), /REAL_PHOTO_RESEARCH_REQUIRED/);
  const noRights = valid(); delete noRights.article.image_provenance.permission_evidence;
  assert.throws(() => prepareCloudDraft(noRights, date, now), /SOURCE_RIGHTS_AND_CONTEXT_REQUIRED/);
  const noEvidence = valid(); noEvidence.article.claim_ledger = [];
  assert.throws(() => prepareCloudDraft(noEvidence, date, now), /IMPORT_GATE_FAILED/);
});

test('remote draft cannot select another article identity or import human approval fields', () => {
  const wrongId = valid(); wrongId.article.id = 'already-live-article';
  assert.throws(() => prepareCloudDraft(wrongId, date, now), /IMPORT_ARTICLE_ID_MISMATCH/);
  for (const field of ['human_score', 'human_scores', 'human_decision', 'reviewer', 'reviewed_at', 'approved', 'published_at']) {
    const artifact = valid(); artifact.article[field] = field === 'approved' ? false : 'remote-value';
    assert.throws(() => prepareCloudDraft(artifact, date, now), /IMPORT_APPROVAL_FIELDS_FORBIDDEN/);
  }
});

test('title deduplication catches word-order variants but accepts genuinely different subjects', () => {
  assert.equal(titlesDuplicate('Columbus transit board approves station repairs', 'Station repairs approved by Columbus transit board'), true);
  assert.equal(titlesDuplicate('Columbus transit board approves station repairs', 'Dublin school calendar lists autumn family workshops'), false);
  assert.equal(titlesDuplicate('', 'and the'), false);
});

test('selected source images require a date-bound committed image path and both exact-file digests', () => {
  const missing = valid(); delete missing.article.cloud_image_asset;
  assert.throws(() => prepareCloudDraft(missing, date, now), /IMPORT_CLOUD_IMAGE_ASSET_REQUIRED/);
  for (const patch of [{ path: 'frontend/content/images/2026-09-21-fixture.webp' }, { path: '../fixture.webp' },
    { path: `frontend/content/images/${date}-fixture.svg` }, { path: `frontend/content/images/${date}-fixture.webp/extra` },
    { git_blob_sha: 'a'.repeat(39) }, { git_blob_sha: 'x'.repeat(40) }, { source_sha256: 'b'.repeat(63) }, { source_sha256: '' }]) {
    const artifact = valid(); Object.assign(artifact.article.cloud_image_asset, patch);
    assert.throws(() => prepareCloudDraft(artifact, date, now), /IMPORT_CLOUD_IMAGE_ASSET_REQUIRED/);
  }
});

test('selected source file requires every full-size review attestation before draft staging', () => {
  const missing = valid(); delete missing.article.cloud_image_asset.visual_review;
  assert.throws(() => prepareCloudDraft(missing, date, now), /IMPORT_CLOUD_IMAGE_REVIEW_REQUIRED/);
  for (const check of ['natural_appearance', 'geometry_and_shadows', 'no_synthetic_artifacts', 'story_match', 'truthful_caption', 'mobile_crop']) {
    for (const invalid of [undefined, false, 'true']) {
      const artifact = valid(); artifact.article.cloud_image_asset.visual_review[check] = invalid;
      assert.throws(() => prepareCloudDraft(artifact, date, now), /IMPORT_CLOUD_IMAGE_REVIEW_REQUIRED/);
    }
  }
  for (const patch of [{ reviewed_by: '' }, { reviewed_at: 'invalid' }]) {
    const artifact = valid(); Object.assign(artifact.article.cloud_image_asset.visual_review, patch);
    assert.throws(() => prepareCloudDraft(artifact, date, now), /IMPORT_CLOUD_IMAGE_REVIEW_REQUIRED/);
  }
});
