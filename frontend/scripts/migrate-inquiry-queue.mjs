#!/usr/bin/env node
/**
 * Additive, idempotent migration for the lead-response operating queue.
 *
 * Creates one unified queue (`inquiry_queue`) covering every inbound inquiry
 * type — seller, rental, capital, advertiser, directory — plus the owner
 * registry (`inquiry_owners`), an audit trail (`inquiry_queue_events`), and a
 * durable alert log (`inquiry_alerts`) that reaches a human even with no
 * Telegram secrets configured.
 *
 * Why a separate table instead of columns on leads/contacts: the promise being
 * operated is identical across five differently-shaped source tables, and the
 * SLA invariant (owner + timer, both NOT NULL) has to be enforceable in one
 * place. Source tables keep their own lifecycle columns; the queue owns
 * response accountability and joins back by (source_table, source_id).
 *
 * Safe to rerun. Existing rows are backfilled with a timer derived from their
 * real received time, and CRM smoke records are flagged `is_test` so they can
 * never raise an alert or move an SLA statistic.
 *
 * Usage: DATABASE_URL=... node --experimental-strip-types scripts/migrate-inquiry-queue.mjs
 */

import { neon } from "@neondatabase/serverless";
import {
  DEFAULT_OWNER_KEY,
  SEED_OWNERS,
  buildSlaTimer,
  inquiryTypeForContact,
  inquiryTypeForPersona,
  isTestInquiry,
  resolveOwnerKey,
} from "../lib/inquiry-queue.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function tableExists(name) {
  const rows = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${name}
  `;
  return rows.length > 0;
}

async function ensureTable(name, ddl) {
  if (await tableExists(name)) {
    console.log(`skip: table ${name} exists`);
    return;
  }
  await sql.query(ddl);
  console.log(`created: table ${name}`);
}

async function ensureIndex(name, ddl) {
  const rows = await sql`SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=${name}`;
  if (rows.length > 0) {
    console.log(`skip: index ${name} exists`);
    return;
  }
  await sql.query(ddl);
  console.log(`created: index ${name}`);
}

// --- Owner registry -------------------------------------------------------

await ensureTable(
  "inquiry_owners",
  `CREATE TABLE inquiry_owners (
    owner_key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    default_for JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

for (const [index, owner] of SEED_OWNERS.entries()) {
  await sql`
    INSERT INTO inquiry_owners (owner_key, name, email, active, default_for, sort_order)
    VALUES (${owner.owner_key}, ${owner.name}, ${owner.email}, ${owner.active},
            ${JSON.stringify(owner.default_for)}::jsonb, ${index})
    ON CONFLICT (owner_key) DO NOTHING
  `;
}
console.log(`ensured: ${SEED_OWNERS.length} seed owner row(s); default owner is '${DEFAULT_OWNER_KEY}'`);

// --- The queue ------------------------------------------------------------

// owner_key, received_at, sla_due_at and sla_warn_at are NOT NULL with no
// default: the database itself refuses an inquiry that has no assigned owner
// and no SLA timer.
await ensureTable(
  "inquiry_queue",
  `CREATE TABLE inquiry_queue (
    id BIGSERIAL PRIMARY KEY,
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    inquiry_type TEXT NOT NULL,
    persona TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    area TEXT,
    source TEXT,
    source_route TEXT,
    summary TEXT,
    owner_key TEXT NOT NULL REFERENCES inquiry_owners(owner_key),
    status TEXT NOT NULL DEFAULT 'new',
    received_at TIMESTAMPTZ NOT NULL,
    sla_due_at TIMESTAMPTZ NOT NULL,
    sla_warn_at TIMESTAMPTZ NOT NULL,
    first_response_at TIMESTAMPTZ,
    first_response_channel TEXT,
    first_response_by TEXT,
    disposition TEXT NOT NULL DEFAULT 'pending',
    disposition_note TEXT,
    disposition_at TIMESTAMPTZ,
    is_test BOOLEAN NOT NULL DEFAULT false,
    alert_state TEXT NOT NULL DEFAULT 'none',
    last_alert_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inquiry_queue_source_unique UNIQUE (source_table, source_id),
    CONSTRAINT inquiry_queue_sla_ordering CHECK (sla_due_at > received_at),
    CONSTRAINT inquiry_queue_owner_present CHECK (length(trim(owner_key)) > 0)
  )`,
);

await ensureIndex(
  "inquiry_queue_open_sla_idx",
  `CREATE INDEX inquiry_queue_open_sla_idx ON inquiry_queue (sla_due_at ASC)
   WHERE first_response_at IS NULL AND is_test = false`,
);
await ensureIndex(
  "inquiry_queue_owner_idx",
  "CREATE INDEX inquiry_queue_owner_idx ON inquiry_queue (owner_key, status, sla_due_at ASC)",
);
await ensureIndex(
  "inquiry_queue_type_idx",
  "CREATE INDEX inquiry_queue_type_idx ON inquiry_queue (inquiry_type, received_at DESC)",
);

await ensureTable(
  "inquiry_queue_events",
  `CREATE TABLE inquiry_queue_events (
    id BIGSERIAL PRIMARY KEY,
    queue_id BIGINT NOT NULL REFERENCES inquiry_queue(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'system',
    detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);
await ensureIndex(
  "inquiry_queue_events_queue_idx",
  "CREATE INDEX inquiry_queue_events_queue_idx ON inquiry_queue_events (queue_id, created_at DESC)",
);

// Durable alert log. This is the no-secret fallback: when Telegram is not
// configured the alert is still recorded here and surfaced as a banner on
// /admin/queue, so a human sees it without any credential being present.
await ensureTable(
  "inquiry_alerts",
  `CREATE TABLE inquiry_alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_key TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL,
    queue_id BIGINT REFERENCES inquiry_queue(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    delivery TEXT NOT NULL DEFAULT 'pending',
    delivery_error TEXT,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);
await ensureIndex(
  "inquiry_alerts_open_idx",
  "CREATE INDEX inquiry_alerts_open_idx ON inquiry_alerts (created_at DESC) WHERE acknowledged_at IS NULL",
);

// --- Backfill -------------------------------------------------------------

const owners = await sql`SELECT owner_key, name, email, active, default_for FROM inquiry_owners ORDER BY sort_order`;
const ownerList = owners.map((row) => ({
  owner_key: row.owner_key,
  name: row.name,
  email: row.email,
  active: row.active !== false,
  default_for: Array.isArray(row.default_for) ? row.default_for : [],
}));

async function backfill(sourceTable, rows, mapRow) {
  let inserted = 0;
  let testFlagged = 0;
  for (const row of rows) {
    const mapped = mapRow(row);
    const receivedAt = row.created_at ? new Date(row.created_at) : new Date();
    const timer = buildSlaTimer(receivedAt);
    const ownerKey = resolveOwnerKey(mapped.inquiryType, ownerList) || DEFAULT_OWNER_KEY;
    const testRecord = isTestInquiry({ email: mapped.email, source: mapped.source });
    // Historical rows: nobody was accountable for them, so they are closed out
    // as backfilled rather than left to generate a retroactive breach alert.
    const result = await sql`
      INSERT INTO inquiry_queue (
        source_table, source_id, inquiry_type, persona, name, email, phone, area,
        source, summary, owner_key, status, received_at, sla_due_at, sla_warn_at,
        first_response_at, disposition, disposition_note, disposition_at, is_test, notes
      )
      VALUES (
        ${sourceTable}, ${String(row.id)}, ${mapped.inquiryType}, ${mapped.persona ?? null},
        ${mapped.name ?? null}, ${mapped.email ?? null}, ${mapped.phone ?? null}, ${mapped.area ?? null},
        ${mapped.source ?? null}, ${mapped.summary ?? null}, ${ownerKey}, 'closed',
        ${receivedAt.toISOString()}, ${timer.dueAt.toISOString()}, ${timer.warnAt.toISOString()},
        ${receivedAt.toISOString()},
        ${testRecord ? "test_record" : "no_response"},
        ${testRecord
          ? "Backfilled CRM smoke-test record. Excluded from SLA statistics and alerts."
          : "Backfilled before the SLA queue existed; no response time was recorded, so it is closed rather than counted."},
        NOW(), ${testRecord}, 'backfilled by migrate-inquiry-queue'
      )
      ON CONFLICT (source_table, source_id) DO NOTHING
      RETURNING id
    `;
    if (result.length > 0) {
      inserted += 1;
      if (testRecord) testFlagged += 1;
      await sql`
        INSERT INTO inquiry_queue_events (queue_id, action, actor, detail)
        VALUES (${result[0].id}, 'backfilled', 'migration',
                ${JSON.stringify({ source_table: sourceTable, source_id: String(row.id), is_test: testRecord })}::jsonb)
      `;
    }
  }
  console.log(`backfill ${sourceTable}: ${inserted} queued (${testFlagged} flagged as test records)`);
}

const leads = await sql`SELECT id, persona, name, email, phone, area, source, created_at FROM leads ORDER BY id`;
await backfill("leads", leads, (row) => ({
  inquiryType: inquiryTypeForPersona(row.persona),
  persona: row.persona,
  name: row.name,
  email: row.email,
  phone: row.phone,
  area: row.area,
  source: row.source,
  summary: null,
}));

const contacts = await sql`SELECT id, name, email, message, source, created_at FROM contacts ORDER BY id`;
await backfill("contacts", contacts, (row) => ({
  inquiryType: inquiryTypeForContact(row.source),
  persona: null,
  name: row.name,
  email: row.email,
  phone: null,
  area: null,
  source: row.source,
  summary: typeof row.message === "string" ? row.message.slice(0, 900) : null,
}));

const totals = await sql`
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE is_test)::int AS test_rows,
    COUNT(*) FILTER (WHERE NOT is_test AND first_response_at IS NULL)::int AS open_real
  FROM inquiry_queue
`;
console.log(
  `inquiry_queue: ${totals[0].total} rows (${totals[0].test_rows} test, ${totals[0].open_real} real and awaiting first response)`,
);
console.log("inquiry queue migration complete");
