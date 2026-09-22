import { createHash, randomUUID } from 'node:crypto';
import { evaluateArticle } from './editorial-quality-lib.mjs';
import { canonicalizeAuthor, isApprovedAuthor } from './newsroom-authors.mjs';
import { planEditorialImage, validateImageAttachmentReview } from './editorial-image-policy.mjs';

export const cloudImportSchema = [
  `ALTER TABLE article_image_jobs ADD COLUMN IF NOT EXISTS cloud_lease_token UUID`,
  `CREATE TABLE IF NOT EXISTS cren_cloud_draft_imports (
    source_path TEXT PRIMARY KEY, source_commit TEXT NOT NULL, blob_sha TEXT NOT NULL,
    content_sha256 TEXT NOT NULL, article_id TEXT NOT NULL UNIQUE REFERENCES articles(id),
    canonical_event_key TEXT NOT NULL UNIQUE, imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS cren_cloud_import_runs (
    id UUID PRIMARY KEY, source_commit TEXT, status TEXT NOT NULL,
    results JSONB NOT NULL DEFAULT '[]', started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ, error_code TEXT
  )`,
];
const tokens = value => new Set(String(value).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
  .filter(word => word.length > 2 && !new Set('the a an of in on to as at is are was were and or for with from that this its it by into over after amid but if then than so'.split(' ')).has(word)));
export function titlesDuplicate(a, b) {
  const left = tokens(a), right = tokens(b);
  const union = new Set([...left, ...right]);
  return union.size > 0 && [...left].filter(word => right.has(word)).length / union.size >= 0.4;
}
const fail = code => { throw new Error(code); };
export function prepareCloudDraft(artifact, date, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !new RegExp(`^frontend/content/articles/${date}-[a-z0-9-]+\\.json$`).test(artifact.path)
    || !/^[a-f0-9]{40}$/.test(artifact.commit) || !/^[a-f0-9]{40}$/.test(artifact.blobSha)
    || !/^[a-f0-9]{64}$/.test(artifact.sha256)) fail('IMPORT_SOURCE_BINDING_REQUIRED');
  const article = structuredClone(artifact.article);
  if (!article || Array.isArray(article) || typeof article !== 'object') fail('IMPORT_ARTICLE_REQUIRED');
  // New cloud submissions must explicitly adopt the current source/rights policy.
  if (article.prompt_version !== 'cren-article-v1.0.2') fail('IMPORT_CURRENT_WRITING_POLICY_REQUIRED');
  if (article.status && article.status !== 'draft') fail('IMPORT_DRAFT_ONLY');
  if (article.image_url != null || article.image_sha256 != null) fail('IMPORT_IMAGE_PREPARATION_REQUIRED');
  const factTime = Date.parse(article.fact_checked_at);
  if (!Number.isFinite(factTime) || factTime > now.getTime() + 300_000 || now.getTime() - factTime > 48 * 3600_000) fail('IMPORT_FRESH_REPORTING_REQUIRED');
  const parsed = new Date(article.date);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) fail('IMPORT_ARTICLE_DATE_MISMATCH');
  article.author = canonicalizeAuthor(article.author);
  if (!isApprovedAuthor(article.author)) fail('IMPORT_BYLINE_REQUIRED');
  if (!['market-trends','schools','development','local-politics','events-lifestyle'].includes(article.topic_slug)) fail('IMPORT_TOPIC_REQUIRED');
  const image = planEditorialImage(article);
  if (image.mode === 'NEEDS_RESEARCH') fail(image.reason);
  if(image.mode==='SOURCE_ASSET') {
    const asset=article.cloud_image_asset;
    if(!asset || !new RegExp(`^frontend/content/images/${date}-[a-z0-9]+(?:-[a-z0-9]+)*\\.(jpg|jpeg|png|webp)$`).test(asset.path??'')
      || !/^[a-f0-9]{40}$/.test(asset.git_blob_sha??'') || !/^[a-f0-9]{64}$/.test(asset.source_sha256??'')) fail('IMPORT_CLOUD_IMAGE_ASSET_REQUIRED');
    try { validateImageAttachmentReview({...article,article_id:'import-candidate',source_sha256:asset.source_sha256,
      visual_review:asset.visual_review},'import-candidate',asset.source_sha256); }
    catch { fail('IMPORT_CLOUD_IMAGE_REVIEW_REQUIRED'); }
  }
  const report = evaluateArticle(article);
  if (!report.passed) fail(`IMPORT_GATE_FAILED:${report.failedCodes.join(',')}`);
  const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  if (!slug) fail('IMPORT_SLUG_REQUIRED');
  const id = `${date}-${slug}`;
  if (article.id && article.id !== id) fail('IMPORT_ARTICLE_ID_MISMATCH');
  // Remote files cannot inject approval state or provider fields into the staged package.
  for (const key of ['human_score','human_scores','human_decision','reviewer','reviewed_at','approved','published_at']) {
    if (article[key] != null) fail('IMPORT_APPROVAL_FIELDS_FORBIDDEN');
  }
  return { article: { ...article, id, image_url: null }, report, id, slug, imageMode: image.mode };
}

/** One SQL statement stages the article, evidence, immutable import receipt and truthful run membership. */
export async function stageCloudDraft(sql, artifact, { date, now = new Date(), apply = false } = {}) {
  const [receipt] = await sql`SELECT * FROM cren_cloud_draft_imports WHERE source_path = ${artifact.path}`;
  if (receipt) {
    if (receipt.blob_sha !== artifact.blobSha || receipt.content_sha256 !== artifact.sha256) fail('IMPORT_PATH_CHANGED_REQUIRES_REVIEW');
    return { status: 'ALREADY_STAGED', articleId: receipt.article_id, path: artifact.path };
  }
  const { article, report, id, slug, imageMode } = prepareCloudDraft(artifact, date, now);
  const [fence] = await sql`SELECT generation::text AS generation FROM editorial_publication_fence WHERE id = 1`;
  if (!fence) fail('IMPORT_PUBLICATION_FENCE_REQUIRED');
  const existing = await sql`SELECT a.id,a.title,a.canonical_slug,r.submission->>'canonical_event_key' AS event_key
    FROM articles a LEFT JOIN editorial_review_jobs r ON r.article_id = a.id`;
  if (existing.some(row => row.id === id || row.canonical_slug === slug || row.event_key === article.canonical_event_key
    || titlesDuplicate(row.title, article.title))) fail('IMPORT_EXISTING_STORY_REQUIRES_REVIEW');
  if (!apply) return { status: 'READY_TO_STAGE', articleId: id, path: artifact.path, imageMode };
  const runId = `github-import-${createHash('sha256').update(`${artifact.path}:${artifact.blobSha}`).digest('hex')}`;
  const [result] = await sql`
    WITH guard AS MATERIALIZED (
      SELECT generation FROM editorial_publication_fence WHERE id = 1 FOR UPDATE
    ), inserted AS (
      INSERT INTO articles(id,canonical_slug,status,featured,category,category_class,icon,title,excerpt,body,
        author,date,read_time,area_slug,topic_slug,tags,image_url,meta_description,image_alt,image_caption,fact_checked_at)
      SELECT ${id},${slug},'draft',false,${article.category},${article.category_class ?? 'card-img-market'},${article.icon ?? '$'},
        ${article.title},${article.excerpt},${article.body},${article.author},${article.date},${article.read_time ?? '5 min read'},
        ${article.area_slug ?? null},${article.topic_slug},${JSON.stringify(article.tags)}::jsonb,NULL,
        ${article.meta_description},${article.image_alt},${article.image_provenance.caption},${article.fact_checked_at}::timestamptz
      FROM guard WHERE generation = ${fence.generation}::bigint
        AND NOT EXISTS (SELECT 1 FROM cren_cloud_draft_imports WHERE source_path = ${artifact.path})
      RETURNING id
    ), reviewed AS (
      INSERT INTO editorial_review_jobs(article_id,status,machine_score,machine_possible,machine_report,submission)
      SELECT id,'AWAITING_IMAGE',${report.score},${report.possible},${JSON.stringify(report)}::jsonb,
        ${JSON.stringify(article)}::jsonb FROM inserted
    ), receipt AS (
      INSERT INTO cren_cloud_draft_imports(source_path,source_commit,blob_sha,content_sha256,article_id,canonical_event_key)
      SELECT ${artifact.path},${artifact.commit},${artifact.blobSha},${artifact.sha256},id,${article.canonical_event_key} FROM inserted
    ), run AS (
      INSERT INTO newsroom_runs(run_id,source,status,story_result,staged_count,staged_article_ids,details,completed_at)
      SELECT ${runId},'vercel-github-import','COMPLETED','STAGED',1,jsonb_build_array(id),
        ${JSON.stringify({ commit: artifact.commit, path: artifact.path, role: 'draft-import-not-discovery' })}::jsonb,NOW() FROM inserted
    ), fenced AS (
      UPDATE editorial_publication_fence SET generation = generation + 1 WHERE id = 1 AND EXISTS(SELECT 1 FROM inserted)
    ) SELECT COUNT(*)::int AS count FROM inserted
  `;
  if (result?.count !== 1) fail('IMPORT_CONCURRENT_CHANGE_RETRY');
  return { status: 'STAGED', articleId: id, path: artifact.path, imageMode };
}

export async function runCloudImport(sql, source, { apply = false, now = new Date() } = {}) {
  const id = randomUUID();
  if (apply) await sql`INSERT INTO cren_cloud_import_runs(id,status) VALUES (${id},'RUNNING')`;
  try {
    const batch = await source();
    const results = [];
    for (const artifact of batch.artifacts) {
      try { results.push(await stageCloudDraft(sql, artifact, { date: batch.date, now, apply })); }
      catch (error) {
        const message = error instanceof Error ? error.message : '';
        const code = /^(IMPORT_[A-Z_]+|REAL_PHOTO_RESEARCH_REQUIRED|SOURCE_[A-Z_]+|AI_[A-Z_]+|IMAGE_[A-Z_]+|USE_SELECTED_SOURCE_ASSET|RENDERING_DISCLOSURE_REQUIRED|PHOTO_PROVENANCE_CONFLICT)(?::[A-Za-z0-9_, -]+)?$/.test(message)
          ? message : 'IMPORT_STAGE_FAILED';
        results.push({ status: 'HELD', path: artifact.path, code });
      }
    }
    const status = results.some(row => row.status === 'HELD') ? 'BLOCKED' : results.length ? 'CHECKED' : 'NO_ARTIFACTS';
    if (apply) await sql`UPDATE cren_cloud_import_runs SET status = ${status},source_commit = ${batch.commit},
      results = ${JSON.stringify(results)}::jsonb,completed_at = NOW() WHERE id = ${id}`;
    return { ok: status !== 'BLOCKED', status, commit: batch.commit, date: batch.date, results, published: 0 };
  } catch {
    if (apply) await sql`UPDATE cren_cloud_import_runs SET status = 'FAILED',error_code = 'GITHUB_IMPORT_UNAVAILABLE',completed_at = NOW() WHERE id = ${id}`;
    throw new Error('GITHUB_IMPORT_UNAVAILABLE');
  }
}
