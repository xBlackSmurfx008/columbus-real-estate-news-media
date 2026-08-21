import { generateImage } from 'ai';
import { put, del } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';
import sharp from 'sharp';
import { buildCloudHeroPrompt, CREN_IMAGE_MODEL } from '@/lib/cloud-newsroom-image';
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
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    missing.push('AI_GATEWAY_API_KEY_OR_VERCEL_OIDC_TOKEN');
  }
  return { ready: missing.length === 0, missing };
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
    WHERE a.status = 'live'
      AND (a.image_url IS NULL OR a.image_url LIKE '/images/heroes/%' OR a.image_url LIKE '%/placeholder-%')
      AND (j.status IS NULL OR j.status IN ('PENDING', 'FAILED', 'READY_FOR_REVIEW'))
    ORDER BY a.created_at ASC
    LIMIT 2
  `;
  return rows.map((row) => ({ articleId: row.id, title: row.title }));
}

async function processCandidate(candidate: Candidate): Promise<{ attached: boolean; reason?: string }> {
  'use step';
  const sql = db();
  let blobUrl: string | undefined;
  let articleAttached = false;

  try {
    const [current] = await sql`
      SELECT a.id, a.title, a.area_slug, a.image_url, a.status, r.submission
      FROM articles a
      JOIN editorial_review_jobs r ON r.article_id = a.id
      WHERE a.id = ${candidate.articleId}
    `;
    if (!current || current.status !== 'live') return { attached: false, reason: 'ARTICLE_NOT_LIVE' };
    const currentImage = String(current.image_url ?? '');
    if (currentImage && !currentImage.startsWith('/images/heroes/') && !currentImage.includes('/placeholder-')) {
      return { attached: false, reason: 'IMAGE_ALREADY_ATTACHED' };
    }

    const imageBrief = current.submission?.image_brief ?? null;
    const prompt = buildCloudHeroPrompt({
      title: current.title,
      areaSlug: current.area_slug,
      imageBrief,
    });
    await sql`
      INSERT INTO article_image_jobs (article_id, status, prompt, model, attempts, started_at, updated_at)
      VALUES (${candidate.articleId}, 'GENERATING', ${prompt}, ${CREN_IMAGE_MODEL}, 1, NOW(), NOW())
      ON CONFLICT (article_id) DO UPDATE SET
        status = 'GENERATING',
        prompt = EXCLUDED.prompt,
        model = EXCLUDED.model,
        attempts = article_image_jobs.attempts + 1,
        last_error_code = NULL,
        started_at = NOW(),
        updated_at = NOW()
    `;

    const generated = await generateImage({
      model: CREN_IMAGE_MODEL,
      prompt,
      size: '1536x1024',
      n: 1,
    });
    const normalized = await sharp(Buffer.from(generated.image.uint8Array))
      .rotate()
      .resize(1600, 900, { fit: 'cover', position: 'attention' })
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
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'image/webp',
        cacheControlMaxAge: 31_536_000,
      },
    );
    blobUrl = blob.url;
    const verification = await fetch(blob.url, { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
    if (!verification.ok || verification.headers.get('content-type')?.startsWith('image/') !== true) {
      throw new Error('BLOB_VERIFICATION_FAILED');
    }

    await sql`
      INSERT INTO article_image_fingerprints (article_id, image_url, sha256, perceptual_hash, verified_at)
      VALUES (
        ${candidate.articleId}, ${blob.url}, ${fingerprint.sha256},
        ${fingerprint.perceptualHash}, NOW()
      )
      ON CONFLICT (article_id) DO UPDATE SET
        image_url = EXCLUDED.image_url,
        sha256 = EXCLUDED.sha256,
        perceptual_hash = EXCLUDED.perceptual_hash,
        verified_at = NOW()
    `;
    const updated = await sql`
      UPDATE articles
      SET image_url = ${blob.url}, updated_at = NOW()
      WHERE id = ${candidate.articleId}
        AND status = 'live'
        AND (image_url IS NULL OR image_url LIKE '/images/heroes/%' OR image_url LIKE '%/placeholder-%')
      RETURNING id
    `;
    if (updated.length === 0) {
      await sql`
        DELETE FROM article_image_fingerprints
        WHERE article_id = ${candidate.articleId} AND image_url = ${blob.url}
      `;
      await del(blob.url).catch(() => undefined);
      return { attached: false, reason: 'ARTICLE_CHANGED_DURING_GENERATION' };
    }
    articleAttached = true;

    await sql`
      UPDATE editorial_review_jobs
      SET submission = jsonb_set(submission, '{image_url}', to_jsonb(${blob.url}::text), true),
          updated_at = NOW()
      WHERE article_id = ${candidate.articleId}
    `;
    await sql`
      UPDATE article_image_jobs SET
        status = 'READY_FOR_REVIEW',
        source_sha256 = ${fingerprint.sha256},
        image_url = ${blob.url},
        last_error_code = NULL,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE article_id = ${candidate.articleId}
    `;
    return { attached: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 100) : 'IMAGE_WORKFLOW_FAILED';
    if (blobUrl && !articleAttached) {
      await sql`
        DELETE FROM article_image_fingerprints
        WHERE article_id = ${candidate.articleId} AND image_url = ${blobUrl}
      `.catch(() => undefined);
      await del(blobUrl).catch(() => undefined);
    }
    await sql`
      UPDATE article_image_jobs
      SET status = 'FAILED', last_error_code = ${reason}, updated_at = NOW()
      WHERE article_id = ${candidate.articleId}
    `.catch(() => undefined);
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
      failed: 0,
      reason: `cloud images not configured: missing ${configuration.missing.join(', ')}`,
    };
  }

  const candidates = await selectCandidates();
  if (candidates.length === 0) return { status: 'COMPLETED', processed: 0, attached: 0, failed: 0 };

  let attached = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      const result = await processCandidate(candidate);
      if (result.attached) attached += 1;
    } catch {
      failed += 1;
    }
  }
  return {
    status: failed === 0 ? 'COMPLETED' : attached > 0 ? 'PARTIAL_SUCCESS' : 'FAILED',
    processed: candidates.length,
    attached,
    failed,
    ...(failed > 0 ? { reason: `${failed} candidate image job(s) failed` } : {}),
  };
}
