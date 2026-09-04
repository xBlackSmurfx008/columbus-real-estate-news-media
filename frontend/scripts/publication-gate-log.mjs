// Durable record of blocked publication attempts (owner plan 2026-09-04, item
// 11: "failed publication gates" is a weekly scorecard signal).
//
// WHY THIS EXISTS: scripts/publish-article.mjs enforces a deterministic
// editorial gate and, until now, a block was a console message and exit code 1
// — it left no trace. A scorecard row that can only ever print 0 is not a
// measurement, it is decoration. This module gives every block a row, so the
// weekly review can see which gate is actually catching things and whether the
// newsroom is drafting stories that pass on the first try.
//
// DESIGN RULES:
//   - Logging must never change publication behaviour. Every call is wrapped;
//     a database failure here is swallowed and reported to stderr, and the
//     caller's exit code is untouched.
//   - The table is created lazily, on the first block. A fresh database
//     therefore has no table, and the scorecard reports that state honestly
//     ("logging is active, nothing has been blocked yet") rather than as a
//     measured zero.
//   - No PII and no article body: gate, reason, and the offending field only.

export const GATE_LOG_TABLE = "publication_gate_events";

/** Gate identifiers. One per `process.exit(1)` in the publish path. */
export const PUBLICATION_GATES = {
  IMAGE_HOST: "image_host",
  EDITORIAL_QUALITY: "editorial_quality",
  REQUIRED_FIELD: "required_field",
  BYLINE: "byline",
  TOPIC_SLUG: "topic_slug",
  IMAGE_UNREACHABLE: "image_unreachable",
  IMAGE_DUPLICATE: "image_duplicate",
  DUPLICATE_STORY: "duplicate_story",
  ID_COLLISION: "id_collision",
};

export async function ensurePublicationGateTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS publication_gate_events (
      id BIGSERIAL PRIMARY KEY,
      article_ref TEXT,
      article_title TEXT,
      gate TEXT NOT NULL,
      reason TEXT NOT NULL,
      detail JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS publication_gate_events_created_idx
      ON publication_gate_events (created_at DESC)
  `;
}

/**
 * Record one blocked publication attempt. Never throws, never returns a value
 * the caller is expected to branch on: publication behaviour is decided by the
 * gate, not by whether we managed to write this row.
 */
export async function recordGateBlock(sql, { gate, reason, articleRef = null, articleTitle = null, detail = {} }) {
  try {
    await ensurePublicationGateTable(sql);
    await sql`
      INSERT INTO publication_gate_events (article_ref, article_title, gate, reason, detail)
      VALUES (
        ${articleRef ? String(articleRef).slice(0, 200) : null},
        ${articleTitle ? String(articleTitle).slice(0, 300) : null},
        ${String(gate).slice(0, 60)},
        ${String(reason).slice(0, 1000)},
        ${JSON.stringify(detail ?? {})}::jsonb
      )
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Gate block not recorded (publication still blocked): ${message}`);
  }
}

/**
 * Read gate blocks for the scorecard.
 *
 * Returns `{ available, blocks, byGate, loggingSince }`. `available: false`
 * means the table does not exist yet — which is a real and different answer
 * from "zero blocks recorded", and the report says so.
 */
export async function readGateBlocks(sql, { start, end }) {
  try {
    const rows = await sql.query(
      `SELECT gate, reason, article_ref, article_title, created_at
         FROM publication_gate_events
        WHERE created_at >= $1 AND created_at < $2
        ORDER BY created_at DESC`,
      [start.toISOString(), end.toISOString()],
    );
    const [meta] = await sql.query(
      `SELECT MIN(created_at) AS logging_since, COUNT(*)::int AS total FROM publication_gate_events`,
    );
    const byGate = new Map();
    for (const row of rows) byGate.set(row.gate, (byGate.get(row.gate) ?? 0) + 1);
    return {
      available: true,
      blocks: rows,
      byGate: [...byGate.entries()].map(([gate, count]) => ({ gate, count })).sort((a, b) => b.count - a.count),
      loggingSince: meta?.logging_since ?? null,
      allTime: meta?.total ?? 0,
    };
  } catch {
    return { available: false, blocks: [], byGate: [], loggingSince: null, allTime: 0 };
  }
}
