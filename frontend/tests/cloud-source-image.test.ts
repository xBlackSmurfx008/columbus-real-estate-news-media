import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  CLOUD_IMAGE_REPOSITORY,
  CLOUD_SOURCE_IMAGE_MAX_BYTES,
  CLOUD_SOURCE_IMAGE_TIMEOUT_MS,
  prepareCloudSourceImage,
} from '../lib/cloud-source-image.ts';
import { AI_IMAGE_CAPTION, IMAGE_POLICY_VERSION } from '../scripts/editorial-image-policy.mjs';

// Transport fixture only; the downstream attachment worker decodes and fingerprints images.
const bytes = Buffer.alloc(1_200, 0x5a);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const blobSha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const commit = 'c'.repeat(40);
const assetPath = 'frontend/content/images/2026-09-22-columbus-site.jpg';
const sourceUrl = 'https://photos.example.test/site';
function fixture() {
  return {
    articleId: 'cloud-source-fixture',
    importCommitSha: commit,
    submission: {
      image_alt: 'A brick building and sidewalk at the documented Columbus project site.',
      image_caption: 'The documented Columbus project site. Photo: Fixture Photographer.',
      image_brief: {
        image_policy_version: IMAGE_POLICY_VERSION, source_asset_considered: true,
        source_asset_note: 'Selected a rights-cleared photograph from the original source.',
        source_review: [{ url: sourceUrl, note: 'Reviewed original image and written permission.', outcome: 'SELECTED' }],
      },
      image_provenance: {
        type: 'LICENSED_PHOTO', source: sourceUrl, license: 'Written editorial-use permission',
        permission_evidence: 'Fixture permission reference', credit: 'Fixture Photographer',
        caption: 'The documented Columbus project site. Photo: Fixture Photographer.',
        location_note: 'Source confirms the project location.', date_note: 'Source records September 2026.',
        verified_by: 'Cloud image desk', verified_at: '2026-09-22T12:00:00Z',
      },
      cloud_image_asset: {
        path: assetPath, git_blob_sha: blobSha, source_sha256: sha256,
        visual_review: {
          reviewed_by: 'Cloud image desk', reviewed_at: '2026-09-22T12:01:00Z',
          natural_appearance: true, geometry_and_shadows: true, no_synthetic_artifacts: true,
          story_match: true, truthful_caption: true, mobile_crop: true,
        },
      },
    },
  };
}
const noFetch: typeof fetch = async () => { assert.fail('Invalid submissions must not fetch'); };
const fetchBytes: typeof fetch = async () => new Response(bytes);

test('fetches only the fixed repository at a receipt-pinned commit and validates both hashes', async () => {
  let calls = 0;
  const result = await prepareCloudSourceImage(fixture(), { fetch: async (url, options) => {
    calls += 1;
    assert.equal(url, `https://raw.githubusercontent.com/${CLOUD_IMAGE_REPOSITORY}/${commit}/${assetPath}`);
    assert.equal(options?.redirect, 'error');
    assert.equal(options?.method, 'GET');
    assert.equal(options?.cache, 'no-store');
    assert.ok(options?.signal instanceof AbortSignal);
    assert.equal(CLOUD_SOURCE_IMAGE_TIMEOUT_MS, 15_000);
    return new Response(bytes);
  } });
  assert.equal(calls, 1);
  assert.deepEqual(result.sourceBytes, bytes);
  assert.equal(result.sourceSha256, sha256);
  assert.equal(result.gitBlobSha, blobSha);
  assert.equal(result.commitSha, commit);
  assert.equal(result.plan.mode, 'SOURCE_ASSET');
  assert.deepEqual(result.review.visual_review, fixture().submission.cloud_image_asset.visual_review);
});

test('rejects mutable refs, URL/path injection, invalid dates and malformed hashes before fetching', async () => {
  for (const value of ['main', 'HEAD', '', `${commit}/../main`, 'https://evil.test', 'A'.repeat(40)]) {
    const input = fixture(); input.importCommitSha = value;
    await assert.rejects(prepareCloudSourceImage(input, { fetch: noFetch }), /CLOUD_IMAGE_COMMIT_INVALID/);
  }
  for (const value of ['https://evil.test/photo.jpg', `${assetPath}?x=1`, `${assetPath}#x`,
    'frontend/content/images/../2026-09-22-site.jpg', 'frontend/content/images/2026-09-22-%2e%2e.jpg',
    'frontend/content/images/2026-02-30-site.jpg', 'frontend/content/images/2026-09-22-site.svg',
    'frontend/content/images/2026-09-22-folder/site.jpg', 'frontend/content/images/2026-09-22-site.JPG']) {
    const input = fixture(); input.submission.cloud_image_asset.path = value;
    await assert.rejects(prepareCloudSourceImage(input, { fetch: noFetch }), /CLOUD_IMAGE_PATH_INVALID/);
  }
  for (const key of ['git_blob_sha', 'source_sha256'] as const) {
    const input = fixture(); input.submission.cloud_image_asset[key] = 'not-a-hash';
    await assert.rejects(prepareCloudSourceImage(input, { fetch: noFetch }), /CLOUD_IMAGE_.*SHA_INVALID/);
  }
});

test('requires the canonical article source rights and exact visual-review checks, not nested overrides', async () => {
  const noRights = fixture(); noRights.submission.image_provenance.permission_evidence = '';
  Object.assign(noRights.submission.cloud_image_asset, { image_provenance: fixture().submission.image_provenance });
  await assert.rejects(prepareCloudSourceImage(noRights, { fetch: noFetch }), /SOURCE_RIGHTS_AND_CONTEXT_REQUIRED/);
  for (const key of ['natural_appearance', 'geometry_and_shadows', 'no_synthetic_artifacts', 'story_match', 'truthful_caption', 'mobile_crop'] as const) {
    const input = fixture(); input.submission.cloud_image_asset.visual_review[key] = false;
    await assert.rejects(prepareCloudSourceImage(input, { fetch: noFetch }), /FULL_SIZE_IMAGE_REVIEW_REQUIRED/);
  }
  const noReviewer = fixture(); noReviewer.submission.cloud_image_asset.visual_review.reviewed_by = '';
  await assert.rejects(prepareCloudSourceImage(noReviewer, { fetch: noFetch }), /FULL_SIZE_IMAGE_REVIEW_REQUIRED/);
});

test('rejects a fully disclosed AI fallback without fetching or generating', async () => {
  const input = fixture();
  input.submission.image_provenance.type = 'AI_GENERATED';
  input.submission.image_provenance.caption = input.submission.image_caption = AI_IMAGE_CAPTION;
  input.submission.image_alt = 'AI-generated illustration of a generic Central Ohio street and brick building.';
  input.submission.image_brief.source_review[0].outcome = 'UNAVAILABLE';
  await assert.rejects(prepareCloudSourceImage(input, { fetch: noFetch }), /CLOUD_IMAGE_SOURCE_ASSET_REQUIRED/);
});

test('rejects changed bytes and a non-Git SHA1 independently', async () => {
  await assert.rejects(prepareCloudSourceImage(fixture(), { fetch: async () => new Response(Buffer.alloc(1_200, 0x5b)) }), /SOURCE_SHA_MISMATCH/);
  const input = fixture(); input.submission.cloud_image_asset.git_blob_sha = createHash('sha1').update(bytes).digest('hex');
  await assert.rejects(prepareCloudSourceImage(input, { fetch: fetchBytes }), /GIT_BLOB_SHA_MISMATCH/);
});

test('rejects HTTP failures, redirect responses, missing bodies and undersized source files', async () => {
  for (const response of [new Response(null, { status: 404 }), new Response(null, { status: 302, headers: { location: 'https://evil.test' } })]) {
    await assert.rejects(prepareCloudSourceImage(fixture(), { fetch: async () => response }), /FETCH_FAILED/);
  }
  const redirected = new Response(bytes);
  Object.defineProperty(redirected, 'redirected', { value: true });
  await assert.rejects(prepareCloudSourceImage(fixture(), { fetch: async () => redirected }), /FETCH_FAILED/);
  await assert.rejects(prepareCloudSourceImage(fixture(), { fetch: async () => new Response(null) }), /BODY_MISSING/);
  await assert.rejects(prepareCloudSourceImage(fixture(), { fetch: async () => new Response('tiny') }), /SIZE_INVALID/);
});

test('bounds advertised and streamed bytes and cancels overflow without calling arrayBuffer', async () => {
  for (const advertised of [String(CLOUD_SOURCE_IMAGE_MAX_BYTES + 1), 'Infinity', '-1']) {
    let canceled = false;
    const response = new Response(new ReadableStream({ cancel() { canceled = true; } }), { headers: { 'content-length': advertised } });
    await assert.rejects(prepareCloudSourceImage(fixture(), { fetch: async () => response }), /SIZE_INVALID/);
    assert.equal(canceled, true);
  }
  let canceled = false;
  const response = new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(CLOUD_SOURCE_IMAGE_MAX_BYTES)); controller.enqueue(new Uint8Array(1)); },
    cancel() { canceled = true; },
  }));
  response.arrayBuffer = async () => { assert.fail('Must stream with a byte bound'); };
  await assert.rejects(prepareCloudSourceImage(fixture(), { fetch: async () => response }), /SIZE_INVALID/);
  assert.equal(canceled, true);
});

test('snapshots reviewed metadata before asynchronous acquisition', async () => {
  const input = fixture();
  const result = await prepareCloudSourceImage(input, { fetch: async () => {
    input.submission.image_provenance.caption = 'Changed after review';
    input.submission.cloud_image_asset.source_sha256 = 'a'.repeat(64);
    input.importCommitSha = 'd'.repeat(40);
    return new Response(bytes);
  } });
  assert.equal(result.sourceSha256, sha256);
  assert.equal(result.commitSha, commit);
  assert.notEqual((result.review.image_provenance as { caption: string }).caption, 'Changed after review');
});
