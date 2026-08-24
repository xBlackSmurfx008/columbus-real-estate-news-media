import { generateImage } from 'ai';
import OpenAI from 'openai';
import { getVercelOidcToken } from '@vercel/oidc';
import { put, del } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';
import sharp from 'sharp';
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
import { verifyArticleImageUrl } from '@/lib/article-image';
import { validateAutoPublicationCandidate } from '@/lib/auto-publication';

type Candidate = {
  articleId: string;
  title: string;
};

export type CrenImageWorkflowOutcome = {
  status: 'COMPLETED' | 'PARTIAL_SUCCESS' | 'FAILED' | 'SKIPPED';
  processed: number;
  attached: number;
  published: number;
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
  let hasImageCredential = Boolean(
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
      AND r.status IN ('READY_FOR_AUTOMATION', 'AWAITING_HUMAN_REVIEW')
      AND (
        (
          (a.image_url IS NULL OR a.image_url LIKE '/images/heroes/%' OR a.image_url LIKE '%/placeholder-%')
          AND (j.status IS NULL OR j.status IN ('PENDING', 'FAILED', 'READY_FOR_REVIEW'))
        )
        OR (j.status = 'READY_FOR_REVIEW' AND j.image_url = a.image_url)
      )
    ORDER BY a.created_at ASC
    LIMIT 2
  `;
  return rows.map((row) => ({ articleId: row.id, title: row.title }));
}

async function publishCandidate(articleId: string): Promise<{ published: boolean; reason?: string }> {
  const sql = db();
  const [current] = await sql`
    SELECT
      a.*,
      r.status AS review_status,
      r.submission,
      f.image_url AS fingerprint_image_url,
      f.sha256 AS fingerprint_sha256,
      f.perceptual_hash AS fingerprint_perceptual_hash
    FROM articles a
    JOIN editorial_review_jobs r ON r.article_id = a.id
    LEFT JOIN article_image_fingerprints f ON f.article_id = a.id
    WHERE a.id = ${articleId}
  `;
  if (!current) return { published: false, reason: 'ARTICLE_NOT_FOUND' };

  const fingerprint = current.fingerprint_image_url ? {
    image_url: current.fingerprint_image_url,
    sha256: current.fingerprint_sha256,
    perceptual_hash: current.fingerprint_perceptual_hash,
  } : null;
  const validation = validateAutoPublicationCandidate({
    article: current,
    reviewStatus: current.review_status,
    submission: current.submission,
    fingerprint,
  });
  if (!validation.ready || !validation.submission || !validation.machineReport) {
    return { published: false, reason: validation.reasons.join(',') || 'PUBLICATION_GATE_FAILED' };
  }

  const submission = validation.submission;
  const imageUrl = String(submission.image_url);
  if (!await verifyArticleImageUrl(imageUrl)) {
    return { published: false, reason: 'IMAGE_NOT_REACHABLE' };
  }
  const duplicateRows = await sql`
    SELECT article_id, sha256, perceptual_hash
    FROM article_image_fingerprints
    WHERE article_id <> ${articleId}
  `;
  const duplicate = duplicateRows.find((row) =>
    row.sha256 === fingerprint?.sha256
    || hammingDistance(row.perceptual_hash, fingerprint?.perceptual_hash ?? '')
      <= NEAR_DUPLICATE_MAX_DISTANCE);
  if (duplicate) return { published: false, reason: `IMAGE_DUPLICATE:${duplicate.article_id}` };

  const updated = await sql`
    UPDATE articles SET
      status = 'live',
      title = ${submission.title},
      category = ${submission.category},
      excerpt = ${submission.excerpt},
      body = ${submission.body},
      author = ${submission.author},
      date = ${submission.date},
      read_time = ${submission.read_time ?? null},
      area_slug = ${submission.area_slug ?? null},
      topic_slug = ${submission.topic_slug ?? null},
      tags = ${JSON.stringify(Array.isArray(submission.tags) ? submission.tags : [])}::jsonb,
      image_url = ${imageUrl},
      meta_description = ${submission.meta_description},
      image_alt = ${submission.image_alt},
      image_caption = ${
        submission.image_provenance && typeof submission.image_provenance === 'object'
          ? (submission.image_provenance as Record<string, unknown>).caption ?? null
          : null
      },
      fact_checked_at = ${submission.fact_checked_at ?? null},
      updated_at = NOW()
    WHERE id = ${articleId}
      AND status = 'draft'
      AND updated_at = ${current.updated_at}
      AND image_url = ${imageUrl}
    RETURNING id
  `;
  if (updated.length === 0) return { published: false, reason: 'ARTICLE_CHANGED_BEFORE_PUBLICATION' };

  await sql`
    UPDATE editorial_review_jobs SET
      status = 'AUTO_PUBLISHED',
      machine_score = ${validation.machineReport.score},
      machine_possible = ${validation.machineReport.possible},
      machine_report = ${JSON.stringify(validation.machineReport)}::jsonb,
      human_score = NULL,
      human_scores = NULL,
      human_decision = 'NOT_REQUIRED',
      reviewer = 'cloud-newsroom',
      reviewed_at = NOW(),
      updated_at = NOW()
    WHERE article_id = ${articleId}
  `;
  await sql`
    UPDATE article_image_jobs SET
      status = 'PUBLISHED',
      last_error_code = NULL,
      completed_at = COALESCE(completed_at, NOW()),
      updated_at = NOW()
    WHERE article_id = ${articleId}
  `;
  return { published: true };
}

async function processCandidate(candidate: Candidate): Promise<{
  attached: boolean;
  published: boolean;
  reason?: string;
}> {
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
    if (!current || current.status !== 'draft') {
      return { attached: false, published: false, reason: 'ARTICLE_NOT_ELIGIBLE' };
    }
    const currentImage = String(current.image_url ?? '');
    if (currentImage && !currentImage.startsWith('/images/heroes/') && !currentImage.includes('/placeholder-')) {
      const publication = await publishCandidate(candidate.articleId);
      return { attached: false, ...publication };
    }

    const imageBrief = current.submission?.image_brief ?? null;
    const prompt = buildCloudHeroPrompt({
      title: current.title,
      areaSlug: current.area_slug,
      imageBrief,
    });
    const model = selectedImageModel();
    await sql`
      INSERT INTO article_image_jobs (article_id, status, prompt, model, attempts, started_at, updated_at)
      VALUES (${candidate.articleId}, 'GENERATING', ${prompt}, ${model}, 1, NOW(), NOW())
      ON CONFLICT (article_id) DO UPDATE SET
        status = 'GENERATING',
        prompt = EXCLUDED.prompt,
        model = EXCLUDED.model,
        attempts = article_image_jobs.attempts + 1,
        last_error_code = NULL,
        started_at = NOW(),
        updated_at = NOW()
    `;

    const generated = await generateCloudImage(prompt);
    const normalized = await sharp(Buffer.from(generated))
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
        AND status = ${current.status}
        AND (image_url IS NULL OR image_url LIKE '/images/heroes/%' OR image_url LIKE '%/placeholder-%')
      RETURNING id
    `;
    if (updated.length === 0) {
      await sql`
        DELETE FROM article_image_fingerprints
        WHERE article_id = ${candidate.articleId} AND image_url = ${blob.url}
      `;
      await del(blob.url).catch(() => undefined);
      return { attached: false, published: false, reason: 'ARTICLE_CHANGED_DURING_GENERATION' };
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
    const publication = await publishCandidate(candidate.articleId);
    if (!publication.published) throw new Error(publication.reason ?? 'AUTO_PUBLICATION_FAILED');
    return { attached: true, published: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 100) : 'IMAGE_WORKFLOW_FAILED';
    if (blobUrl && !articleAttached) {
      await sql`
        DELETE FROM article_image_fingerprints
        WHERE article_id = ${candidate.articleId} AND image_url = ${blobUrl}
      `.catch(() => undefined);
      await del(blobUrl).catch(() => undefined);
    }
    if (articleAttached) {
      await sql`
        UPDATE article_image_jobs
        SET status = 'READY_FOR_REVIEW', last_error_code = ${reason}, updated_at = NOW()
        WHERE article_id = ${candidate.articleId}
      `.catch(() => undefined);
    } else {
      await sql`
        UPDATE article_image_jobs
        SET status = 'FAILED', last_error_code = ${reason}, updated_at = NOW()
        WHERE article_id = ${candidate.articleId}
      `.catch(() => undefined);
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
      published: 0,
      failed: 0,
      reason: `cloud images not configured: missing ${configuration.missing.join(', ')}`,
    };
  }

  const candidates = await selectCandidates();
  if (candidates.length === 0) {
    return { status: 'COMPLETED', processed: 0, attached: 0, published: 0, failed: 0 };
  }

  let attached = 0;
  let published = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      const result = await processCandidate(candidate);
      if (result.attached) attached += 1;
      if (result.published) published += 1;
      if (!result.published) failed += 1;
    } catch {
      failed += 1;
    }
  }
  return {
    status: failed === 0 ? 'COMPLETED' : published > 0 ? 'PARTIAL_SUCCESS' : 'FAILED',
    processed: candidates.length,
    attached,
    published,
    failed,
    ...(failed > 0 ? { reason: `${failed} candidate publication job(s) failed` } : {}),
  };
}
