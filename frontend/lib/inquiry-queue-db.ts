/**
 * Database access for the lead-response operating queue.
 *
 * Kept separate from `lib/inquiry-queue.ts` so the pure SLA logic stays
 * importable from plain node scripts. Everything here runs server-side only.
 */

import {
  DEFAULT_OWNER_KEY,
  SEED_OWNERS,
  buildSlaTimer,
  inquiryTypeForContact,
  inquiryTypeForPersona,
  isTestInquiry,
  resolveOwnerKey,
  type InquiryOwner,
  type InquiryType,
  type QueueSourceTable,
} from "./inquiry-queue.ts";

type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<Record<string, unknown>[]>;
  query: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
};

export interface EnqueueInput {
  sourceTable: QueueSourceTable;
  sourceId: string | number;
  inquiryType: InquiryType;
  persona?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  area?: string | null;
  source?: string | null;
  sourceRoute?: string | null;
  summary?: string | null;
  receivedAt?: Date;
  /** Force the test flag; otherwise inferred from email/source. */
  isTest?: boolean;
}

export interface EnqueueResult {
  id: number;
  ownerKey: string;
  slaDueAt: string;
  slaWarnAt: string;
  isTest: boolean;
  created: boolean;
}

function isMissingQueueTable(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === "42P01" || /inquiry_queue.*does not exist/i.test(candidate?.message ?? "");
}

/** Read the editable owner registry, falling back to the seed if unavailable. */
export async function loadOwners(sql: SqlClient): Promise<InquiryOwner[]> {
  try {
    const rows = await sql`
      SELECT owner_key, name, email, active, default_for
      FROM inquiry_owners
      ORDER BY sort_order ASC, owner_key ASC
    `;
    if (rows.length === 0) return SEED_OWNERS;
    return rows.map((row) => ({
      owner_key: String(row.owner_key),
      name: String(row.name ?? row.owner_key),
      email: (row.email as string | null) ?? null,
      active: row.active !== false,
      default_for: Array.isArray(row.default_for) ? (row.default_for as string[]) : [],
    }));
  } catch {
    return SEED_OWNERS;
  }
}

/**
 * Create the queue row for a freshly stored inquiry.
 *
 * The invariant "no inquiry without an owner and an SLA timer" is enforced in
 * three places: NOT NULL columns on `inquiry_queue`, this function running
 * inline with every intake, and the sweep's reconciler, which enqueues any
 * source row that somehow has no queue entry.
 *
 * Never throws into the intake path: a failure here must not lose a real lead.
 * It returns null and logs a structured error the sweep will pick up.
 */
export async function enqueueInquirySafely(sql: SqlClient, input: EnqueueInput): Promise<EnqueueResult | null> {
  try {
    return await enqueueInquiry(sql, input);
  } catch (error) {
    if (!isMissingQueueTable(error)) {
      console.error("CREN_INQUIRY_QUEUE_ENQUEUE_FAILED", {
        sourceTable: input.sourceTable,
        sourceId: String(input.sourceId),
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

export async function enqueueInquiry(sql: SqlClient, input: EnqueueInput): Promise<EnqueueResult> {
  const owners = await loadOwners(sql);
  const ownerKey = resolveOwnerKey(input.inquiryType, owners) || DEFAULT_OWNER_KEY;
  const receivedAt = input.receivedAt ?? new Date();
  const timer = buildSlaTimer(receivedAt);
  const isTest = input.isTest ?? isTestInquiry({
    email: input.email,
    source: input.source,
    sourceRoute: input.sourceRoute,
  });

  const rows = await sql`
    INSERT INTO inquiry_queue (
      source_table, source_id, inquiry_type, persona, name, email, phone, area,
      source, source_route, summary, owner_key, status, received_at,
      sla_due_at, sla_warn_at, disposition, is_test
    )
    VALUES (
      ${input.sourceTable}, ${String(input.sourceId)}, ${input.inquiryType}, ${input.persona ?? null},
      ${input.name ?? null}, ${input.email ?? null}, ${input.phone ?? null}, ${input.area ?? null},
      ${input.source ?? null}, ${input.sourceRoute ?? null}, ${input.summary ?? null},
      ${ownerKey}, 'new', ${receivedAt.toISOString()},
      ${timer.dueAt.toISOString()}, ${timer.warnAt.toISOString()}, 'pending', ${isTest}
    )
    ON CONFLICT (source_table, source_id) DO NOTHING
    RETURNING id, owner_key, sla_due_at, sla_warn_at, is_test
  `;

  if (rows.length > 0) {
    const row = rows[0];
    await logQueueEvent(sql, Number(row.id), "created", "system", {
      owner_key: ownerKey,
      sla_due_at: timer.dueAt.toISOString(),
      is_test: isTest,
    });
    return {
      id: Number(row.id),
      ownerKey: String(row.owner_key),
      slaDueAt: String(row.sla_due_at),
      slaWarnAt: String(row.sla_warn_at),
      isTest: Boolean(row.is_test),
      created: true,
    };
  }

  const existing = await sql`
    SELECT id, owner_key, sla_due_at, sla_warn_at, is_test
    FROM inquiry_queue
    WHERE source_table = ${input.sourceTable} AND source_id = ${String(input.sourceId)}
  `;
  const row = existing[0];
  return {
    id: Number(row.id),
    ownerKey: String(row.owner_key),
    slaDueAt: String(row.sla_due_at),
    slaWarnAt: String(row.sla_warn_at),
    isTest: Boolean(row.is_test),
    created: false,
  };
}

export async function logQueueEvent(
  sql: SqlClient,
  queueId: number,
  action: string,
  actor: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  try {
    await sql`
      INSERT INTO inquiry_queue_events (queue_id, action, actor, detail)
      VALUES (${queueId}, ${action}, ${actor}, ${JSON.stringify(detail)}::jsonb)
    `;
  } catch (error) {
    console.warn("CREN_INQUIRY_QUEUE_EVENT_LOG_FAILED", {
      queueId,
      action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export interface QueueRow {
  id: number;
  source_table: string;
  source_id: string;
  inquiry_type: string;
  persona: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  area: string | null;
  source: string | null;
  source_route: string | null;
  summary: string | null;
  owner_key: string;
  status: string;
  received_at: string;
  sla_due_at: string;
  sla_warn_at: string;
  first_response_at: string | null;
  first_response_channel: string | null;
  first_response_by: string | null;
  disposition: string;
  disposition_note: string | null;
  disposition_at: string | null;
  is_test: boolean;
  alert_state: string;
  last_alert_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListQueueOptions {
  includeTest?: boolean;
  status?: string | null;
  inquiryType?: string | null;
  ownerKey?: string | null;
  limit?: number;
}

export async function listQueue(sql: SqlClient, options: ListQueueOptions = {}): Promise<QueueRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 300, 1), 1000);
  const rows = await sql`
    SELECT *
    FROM inquiry_queue
    WHERE (${options.includeTest ? true : false}::boolean OR is_test = false)
      AND (${options.status ?? null}::text IS NULL OR status = ${options.status ?? null})
      AND (${options.inquiryType ?? null}::text IS NULL OR inquiry_type = ${options.inquiryType ?? null})
      AND (${options.ownerKey ?? null}::text IS NULL OR owner_key = ${options.ownerKey ?? null})
    ORDER BY
      CASE WHEN first_response_at IS NULL THEN 0 ELSE 1 END,
      sla_due_at ASC
    LIMIT ${limit}
  `;
  return rows as unknown as QueueRow[];
}

/**
 * Reconcile: enqueue any source row that has no queue entry. Guarantees the
 * invariant even if an intake path failed to enqueue inline.
 */
export async function reconcileQueue(sql: SqlClient): Promise<{ added: number; details: string[] }> {
  const details: string[] = [];
  let added = 0;

  const orphanLeads = await sql`
    SELECT l.id, l.persona, l.name, l.email, l.phone, l.area, l.source, l.created_at
    FROM leads l
    LEFT JOIN inquiry_queue q ON q.source_table = 'leads' AND q.source_id = l.id::text
    WHERE q.id IS NULL
    ORDER BY l.created_at ASC
    LIMIT 500
  `;
  for (const lead of orphanLeads) {
    const result = await enqueueInquirySafely(sql, {
      sourceTable: "leads",
      sourceId: String(lead.id),
      inquiryType: inquiryTypeForPersona(lead.persona as string | null),
      persona: (lead.persona as string | null) ?? null,
      name: (lead.name as string | null) ?? null,
      email: (lead.email as string | null) ?? null,
      phone: (lead.phone as string | null) ?? null,
      area: (lead.area as string | null) ?? null,
      source: (lead.source as string | null) ?? null,
      receivedAt: lead.created_at ? new Date(lead.created_at as string) : new Date(),
    });
    if (result?.created) {
      added += 1;
      details.push(`leads#${lead.id}`);
    }
  }

  const orphanContacts = await sql`
    SELECT c.id, c.name, c.email, c.message, c.source, c.created_at
    FROM contacts c
    LEFT JOIN inquiry_queue q ON q.source_table = 'contacts' AND q.source_id = c.id::text
    WHERE q.id IS NULL
    ORDER BY c.created_at ASC
    LIMIT 500
  `;
  for (const contact of orphanContacts) {
    const result = await enqueueInquirySafely(sql, {
      sourceTable: "contacts",
      sourceId: String(contact.id),
      inquiryType: inquiryTypeForContact(contact.source as string | null),
      name: (contact.name as string | null) ?? null,
      email: (contact.email as string | null) ?? null,
      source: (contact.source as string | null) ?? null,
      summary: typeof contact.message === "string" ? contact.message.slice(0, 900) : null,
      receivedAt: contact.created_at ? new Date(contact.created_at as string) : new Date(),
    });
    if (result?.created) {
      added += 1;
      details.push(`contacts#${contact.id}`);
    }
  }

  return { added, details };
}
