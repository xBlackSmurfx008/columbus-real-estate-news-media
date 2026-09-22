import { randomUUID } from 'node:crypto';

export async function claimCloudImage(sql, {articleId,prompt,model}) {
  const token=randomUUID();
  const [row]=await sql`
    INSERT INTO article_image_jobs(article_id,status,prompt,model,attempts,started_at,updated_at,cloud_lease_token)
    SELECT id,'GENERATING',${prompt},${model},1,NOW(),NOW(),${token}::uuid FROM articles
    WHERE id = ${articleId} AND status='draft'
      AND (image_url IS NULL OR image_url LIKE '/images/heroes/%' OR image_url LIKE '%/placeholder-%')
    ON CONFLICT(article_id) DO UPDATE SET status='GENERATING',prompt=EXCLUDED.prompt,model=EXCLUDED.model,
      attempts=article_image_jobs.attempts+1,last_error_code=NULL,started_at=NOW(),updated_at=NOW(),cloud_lease_token=EXCLUDED.cloud_lease_token
    WHERE (article_image_jobs.status IN ('PENDING','FAILED') AND article_image_jobs.attempts < 3)
      OR (article_image_jobs.status='GENERATING' AND article_image_jobs.attempts < 3
        AND article_image_jobs.started_at < NOW() - INTERVAL '10 minutes')
    RETURNING article_id
  `;
  return row?token:null;
}

export async function recordCloudImageHold(sql, articleId, reason, leaseToken=null, retryable=false) {
  const status=retryable?'FAILED':'BLOCKED';
  await sql`
    INSERT INTO article_image_jobs(article_id,status,last_error_code,updated_at)
    SELECT id,${status},${reason},NOW() FROM articles WHERE id = ${articleId} AND status = 'draft'
      AND (image_url IS NULL OR image_url LIKE '/images/heroes/%' OR image_url LIKE '%/placeholder-%')
    ON CONFLICT(article_id) DO UPDATE SET status = EXCLUDED.status,last_error_code = EXCLUDED.last_error_code,updated_at = NOW()
      WHERE article_image_jobs.status NOT IN ('READY_FOR_REVIEW','PUBLISHED')
        AND ((${leaseToken}::uuid IS NULL AND article_image_jobs.status <> 'GENERATING')
          OR article_image_jobs.cloud_lease_token = ${leaseToken}::uuid)
  `;
}
