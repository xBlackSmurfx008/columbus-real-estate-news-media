// Database access for the site-quality suite.
//
// Every DB-backed check calls `openDatabase()` and, when it returns null,
// reports SKIP with the returned reason. There is no code path where a missing
// DATABASE_URL turns into a PASS.

let cached;

export async function openDatabase() {
  if (cached !== undefined) return cached;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    cached = { sql: null, reason: "DATABASE_URL is not set in this environment" };
    return cached;
  }

  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(databaseUrl);
    await sql`SELECT 1`;
    cached = { sql, reason: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Never let a connection string reach the transcript or a log file.
    cached = { sql: null, reason: `database unreachable (${redact(message).slice(0, 200)})` };
  }
  return cached;
}

export function redact(value) {
  return String(value).replace(/\b(postgres(?:ql)?:\/\/)[^\s'")]+/gi, "$1[redacted]");
}

export async function tableExists(sql, table) {
  const rows = await sql.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1 LIMIT 1`,
    [table],
  );
  return rows.length > 0;
}
