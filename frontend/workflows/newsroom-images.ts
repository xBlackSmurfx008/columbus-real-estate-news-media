import { generateImage } from 'ai';
import OpenAI from 'openai';
import { getVercelOidcToken } from '@vercel/oidc';
import { put } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';
import sharp from 'sharp';
import { claimCloudImage, recordCloudImageHold as recordImageHold } from '../scripts/cloud-image-jobs.mjs';
import { planEditorialImage } from '../scripts/editorial-image-policy.mjs';
import { stageReviewedImage } from '../scripts/stage-reviewed-image.mjs';
import { prepareCloudSourceImage } from '@/lib/cloud-source-image';
import {
  buildCloudHeroPrompt,
  CREN_IMAGE_MODEL,
  CREN_OPENAI_IMAGE_MODEL,
} from '@/lib/cloud-newsroom-image';
import {
  fingerprintArticleImageBytes,
  hammingDistance,
  NEAR_DUPLICATE_MAX_DISTANCE,
} from '@/lib/article-image-fingerprint';

type Candidate = {
  articleId: string;
  title: string;
};

export type CrenImageWorkflowOutcome = {
  status: 'COMPLETED' | 'PARTIAL_SUCCESS' | 'FAILED' | 'SKIPPED';
  processed: number;
  attached: number;
  readyForReview: number;
  failed: number;
  reason?: string;
};

function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
  return neon(process.env.DATABASE_URL);
}

async function preflight(): Promise<{ ready: boolean; missing: string[] }> {
  'use step';
  const missing = ['DATABASE_URL', 'BLOB_READ_WRITE_TOKEN'].filter((name) => !process.env[name]);
  if (process.env.CREN_CLOUD_IMAGES_ENABLED !== 'true') missing.push('CREN_CLOUD_IMAGES_ENABLED=true');
  const hasImageService = Boolean(
    process.env.NEWSROOM_IMAGE_SERVICE_URL && process.env.NEWSROOM_IMAGE_SERVICE_SECRET,
  );
  let hasImageCredential = process.env.CREN_CLOUD_AI_IMAGES_ENABLED !== 'true' || Boolean(
    process.env.AI_GATEWAY_API_KEY
    || process.env.VERCEL_OIDC_TOKEN
    || process.env.OPENAI_API_KEY
    || hasImageService,
  );
  if (!hasImageCredential) {
    try {
      hasImageCredential = Boolean(await getVercelOidcToken());
    } catch {
      hasImageCredential = false;
    }
  }
  if (!hasImageCredential) {
    missing.push('AI_GATEWAY_API_KEY_OR_VERCEL_OIDC_TOKEN_OR_OPENAI_API_KEY');
  }
  return { ready: missing.length === 0, missing };
}

function usesGateway(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY
    || (!process.env.OPENAI_API_KEY && !usesImageService()),
  );
}

function usesImageService(): boolean {
  return Boolean(
    !process.env.AI_GATEWAY_API_KEY
    && !process.env.OPENAI_API_KEY
    && process.env.NEWSROOM_IMAGE_SERVICE_URL
    && process.env.NEWSROOM_IMAGE_SERVICE_SECRET,
  );
}

function selectedImageModel(): string {
  if (usesImageService()) return 'pooled-openai/gpt-image-1';
  return usesGateway()
    ? process.env.CREN_IMAGE_MODEL ?? CREN_IMAGE_MODEL
    : process.env.CREN_OPENAI_IMAGE_MODEL ?? CREN_OPENAI_IMAGE_MODEL;
}

async function generateCloudImage(prompt: string): Promise<Uint8Array> {
  if (usesImageService()) {
    const response = await fetch(process.env.NEWSROOM_IMAGE_SERVICE_URL!, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.NEWSROOM_IMAGE_SERVICE_SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(110_000),
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok) throw new Error(`IMAGE_SERVICE_HTTP_${response.status}`);
    if (!contentType.startsWith('image/')) throw new Error('IMAGE_SERVICE_INVALID_CONTENT_TYPE');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 1_000) throw new Error('IMAGE_SERVICE_TRUNCATED_RESPONSE');
    return bytes;
  }
  if (usesGateway()) {
    const generated = await generateImage({
      model: selectedImageModel(),
      prompt,
      size: '1536x1024',
      n: 1,
    });
    return generated.image.uint8Array;
  }

  if (!process.env.OPENAI_API_KEY) throw new Error('CLOUD_AI_CREDENTIAL_NOT_CONFIGURED');
  const response = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY }).images.generate({
    model: selectedImageModel(),
    prompt,
    size: '1536x1024',
    n: 1,
  });
  const encoded = response.data?.[0]?.b64_json;
  if (!encoded) throw new Error('IMAGE_PROVIDER_EMPTY_RESPONSE');
  return new Uint8Array(Buffer.from(encoded, 'base64'));
}

async function selectCandidates(): Promise<Candidate[]> {
  'use step';
  const sql = db();
  await sql`
    CREATE TABLE IF NOT EXISTS article_image_jobs (
      article_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'PENDING',
      prompt TEXT,
      model TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error_code TEXT,
      source_sha256 TEXT,
      image_url TEXT,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS article_image_fingerprints (
      article_id TEXT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      sha256 TEXT NOT NULL UNIQUE,
      perceptual_hash TEXT NOT NULL,
      verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  const rows = await sql`
    SELECT a.id, a.title
    FROM articles a
    JOIN editorial_review_jobs r ON r.article_id = a.id
    LEFT JOIN article_image_jobs j ON j.article_id = a.id
    WHERE a.status = 'draft'
      AND r.status IN ('AWAITING_IMAGE', 'READY_FOR_AUTOMATION', 'AWAITING_HUMAN_REVIEW')
      AND (
        (
          (a.image_url IS NULL OR a.image_url LIKE '/images/heroes/%' OR a.image_url LIKE '%/placeholder-%')
          AND (j.status IS NULL OR (j.status IN ('PENDING', 'FAILED') AND j.attempts < 3)
            OR (j.status = 'GENERATING' AND j.attempts < 3 AND j.started_at < NOW() - INTERVAL '10 minutes'))
        )
      )
    ORDER BY a.created_at ASC
    LIMIT 2
  `;
  return rows.map((row) => ({ articleId: row.id, title: row.title }));
}

async function processCandidate(candidate: Candidate): Promise<{
  attached: boolean;
  readyForReview: boolean;
  reason?: string;
}> {
  'use step';
  const sql = db();
  let articleAttached = false;
  let leaseToken: string | null = null;

  try {
    const [current] = await sql`
      SELECT a.id, a.title, a.area_slug, a.image_url, a.status, r.submission,
        a.updated_at::text AS article_updated_at, r.updated_at::text AS review_updated_at
      FROM articles a
      JOIN editorial_review_jobs r ON r.article_id = a.id
      WHERE a.id = ${candidate.articleId}
    `;
    if (!current || current.status !== 'draft') {
      return { attached: false, readyForReview: false, reason: 'ARTICLE_NOT_ELIGIBLE' };
    }
    const acquisition = planEditorialImage(current.submission);
    if (acquisition.mode === 'NEEDS_RESEARCH') {
      await recordImageHold(sql, candidate.articleId, acquisition.reason);
      return { attached: false, readyForReview: false, reason: acquisition.reason };
    }
    if (acquisition.mode === 'AI_FALLBACK' && process.env.CREN_CLOUD_AI_IMAGES_ENABLED !== 'true') {
      await recordImageHold(sql, candidate.articleId, 'PAID_CLOUD_IMAGE_GENERATION_DISABLED');
      return { attached: false, readyForReview: false, reason: 'PAID_CLOUD_IMAGE_GENERATION_DISABLED' };
    }
    const currentImage = String(current.image_url ?? '');
    if (currentImage && !currentImage.startsWith('/images/heroes/') && !currentImage.includes('/placeholder-')) {
      return { attached: false, readyForReview: false, reason: 'IMAGE_ALREADY_ATTACHED_REQUIRES_EXACT_REVIEW' };
    }

    const imageBrief = current.submission?.image_brief ?? null;
    const imageCaption = String(current.submission.image_provenance.caption);
    const originalAlt = String(current.submission.image_alt ?? 'Generic Central Ohio residential streetscape.');
    const imageAlt = (acquisition.mode === 'SOURCE_ASSET' || /^AI-generated illustration/i.test(originalAlt)
      ? originalAlt : `AI-generated illustration: ${originalAlt}`).slice(0, 160);
    const prompt = buildCloudHeroPrompt({
      title: current.title,
      areaSlug: current.area_slug,
      imageBrief,
    });
    const model = acquisition.mode === 'SOURCE_ASSET' ? 'verified-source-asset' : selectedImageModel();
    leaseToken = await claimCloudImage(sql,{articleId:candidate.articleId,prompt,model});
    if (!leaseToken) return { attached: false, readyForReview: false, reason: 'IMAGE_JOB_ALREADY_CLAIMED_OR_COMPLETE' };
    let sourceBytes: Uint8Array | undefined;
    if (acquisition.mode === 'SOURCE_ASSET') {
      const [receipt] = await sql`SELECT source_commit FROM cren_cloud_draft_imports WHERE article_id = ${candidate.articleId}`;
      if (!receipt) {
        await recordImageHold(sql, candidate.articleId, 'CLOUD_IMAGE_IMPORT_RECEIPT_REQUIRED', leaseToken);
        return { attached: false, readyForReview: false, reason: 'CLOUD_IMAGE_IMPORT_RECEIPT_REQUIRED' };
      }
      const prepared = await prepareCloudSourceImage({ articleId: candidate.articleId,
        submission: current.submission, importCommitSha: String(receipt.source_commit) });
      sourceBytes = prepared.sourceBytes;
    }
    const generated = sourceBytes ?? await generateCloudImage(prompt);
    const normalized = await sharp(Buffer.from(generated))
      .rotate()
      .resize(1600, 900, { fit: 'cover', position: sourceBytes ? 'centre' : 'attention' })
      .webp({ quality: 86, effort: 5 })
      .toBuffer();
    const fingerprint = await fingerprintArticleImageBytes(normalized);
    const existing = await sql`
      SELECT article_id, sha256, perceptual_hash
      FROM article_image_fingerprints
      WHERE article_id <> ${candidate.articleId}
    `;
    const duplicate = existing.find((row) => row.sha256 === fingerprint.sha256
      || hammingDistance(row.perceptual_hash, fingerprint.perceptualHash) <= NEAR_DUPLICATE_MAX_DISTANCE);
    if (duplicate) throw new Error(`IMAGE_DUPLICATE:${duplicate.article_id}`);

    const blob = await put(
      `cren/articles/${candidate.articleId}/hero-${fingerprint.sha256.slice(0, 16)}.webp`,
      normalized,
      {
        access: 'public',
        addRandomSuffix: true,
        allowOverwrite: false,
        contentType: 'image/webp',
        cacheControlMaxAge: 31_536_000,
      },
    );
    const verification = await fetch(blob.url, { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
    if (!verification.ok || verification.headers.get('content-type')?.startsWith('image/') !== true) {
      throw new Error('BLOB_VERIFICATION_FAILED');
    }

    const submission = { ...current.submission, id: candidate.articleId, image_url: blob.url,
      image_sha256: fingerprint.sha256, image_caption: imageCaption, image_alt: imageAlt };
    await stageReviewedImage(sql, { articleId: candidate.articleId,
      snapshot: { article_updated_at: current.article_updated_at, review_updated_at: current.review_updated_at, submission: current.submission },
      candidate: submission, fingerprint, model, cloudLeaseToken: leaseToken });
    articleAttached = true;
    await sql`
      UPDATE newsroom_runs SET
        image_ready_count = (
          SELECT COUNT(*)::int
          FROM jsonb_array_elements_text(staged_article_ids) AS staged(article_id)
          JOIN article_image_jobs ON article_image_jobs.article_id = staged.article_id
          WHERE article_image_jobs.status IN ('READY_FOR_REVIEW', 'PUBLISHED')
        ),
        updated_at = NOW()
      WHERE staged_article_ids ? ${candidate.articleId}
    `.catch(() => undefined);
    return { attached: true, readyForReview: true };
  } catch (error) {
    const reason = error instanceof Error && /^[A-Z][A-Z0-9_]{0,99}$/.test(error.message)
      ? error.message : 'IMAGE_WORKFLOW_FAILED';
    // Retain an uncommitted Blob for reconciliation; never delete potentially referenced bytes on an ambiguous response.
    if (articleAttached) {
      await sql`
        UPDATE article_image_jobs
        SET status = 'READY_FOR_REVIEW', last_error_code = ${reason}, updated_at = NOW()
        WHERE article_id = ${candidate.articleId}
      `.catch(() => undefined);
    } else {
      await recordImageHold(sql, candidate.articleId, reason, leaseToken,
        ['CLOUD_IMAGE_FETCH_FAILED','IMAGE_WORKFLOW_FAILED','BLOB_VERIFICATION_FAILED'].includes(reason)).catch(() => undefined);
    }
    throw error;
  }
}

export async function crenNewsroomImagesWorkflow(): Promise<CrenImageWorkflowOutcome> {
  'use workflow';
  const configuration = await preflight();
  if (!configuration.ready) {
    return {
      status: 'SKIPPED',
      processed: 0,
      attached: 0,
      readyForReview: 0,
      failed: 0,
      reason: `cloud images not configured: missing ${configuration.missing.join(', ')}`,
    };
  }

  const candidates = await selectCandidates();
  if (candidates.length === 0) {
    return { status: 'COMPLETED', processed: 0, attached: 0, readyForReview: 0, failed: 0 };
  }

  let attached = 0;
  let readyForReview = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      const result = await processCandidate(candidate);
      if (result.attached) attached += 1;
      if (result.readyForReview) readyForReview += 1;
      if (!result.readyForReview) failed += 1;
    } catch {
      failed += 1;
    }
  }
  return {
    status: failed === 0 ? 'COMPLETED' : readyForReview > 0 ? 'PARTIAL_SUCCESS' : 'FAILED',
    processed: candidates.length,
    attached,
    readyForReview,
    failed,
    ...(failed > 0 ? { reason: `${failed} candidate image preparation job(s) failed` } : {}),
  };
}
