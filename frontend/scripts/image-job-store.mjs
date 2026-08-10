import { neon } from "@neondatabase/serverless";

export function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  return neon(process.env.DATABASE_URL);
}

export async function withRetry(operation, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, Math.min(500 * 2 ** (attempt - 1), 4_000)));
    }
  }
  throw lastError;
}

export async function ensureImageJobTable(sql) {
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
    CREATE TABLE IF NOT EXISTS newsroom_alert_deliveries (
      alert_key TEXT PRIMARY KEY,
      delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}
