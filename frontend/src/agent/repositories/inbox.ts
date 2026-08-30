import { getDb } from "@/lib/db";
import type { EmailMessage, MessageThread } from "@/src/agent/types";

type DbRow = Record<string, unknown>;

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function threadFromRow(row: DbRow): MessageThread {
  const thread: MessageThread = {
    id: String(row.id),
    contactId: String(row.contact_id),
    dealId: row.deal_id ? String(row.deal_id) : undefined,
    channel: String(row.channel) as MessageThread["channel"],
    subject: String(row.subject),
    body: String(row.body),
    intent: String(row.intent) as MessageThread["intent"],
    risk: String(row.risk) as MessageThread["risk"],
    confidence: Number(row.confidence),
    status: String(row.status) as MessageThread["status"],
    draftReply: row.draft_reply ? String(row.draft_reply) : undefined,
    sourceKnowledgeIds: Array.isArray(row.source_knowledge_ids) ? row.source_knowledge_ids.map(String) : [],
    approvalDecision: String(row.approval_decision) as MessageThread["approvalDecision"],
    approvalReason: row.approval_reason ? String(row.approval_reason) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
  if (thread.channel === "social_dm") {
    return {
      ...thread,
      dmProvider: row.dm_provider ? String(row.dm_provider) : undefined,
      dmThreadExternalId: row.dm_thread_external_id ? String(row.dm_thread_external_id) : undefined,
      dmHandle: row.dm_handle ? String(row.dm_handle) : undefined,
    };
  }
  return thread;
}

export async function saveThread(thread: MessageThread): Promise<MessageThread> {
  const sql = getDb();
  const social = thread.channel === "social_dm"
    ? (thread as MessageThread & { dmProvider?: string; dmThreadExternalId?: string; dmHandle?: string })
    : undefined;
  const rows = await sql`
    INSERT INTO agent_threads (
      id, contact_id, deal_id, channel, subject, body, intent, risk, confidence,
      status, draft_reply, source_knowledge_ids, approval_decision, approval_reason,
      dm_provider, dm_thread_external_id, dm_handle, created_at, updated_at
    ) VALUES (
      ${thread.id}, ${thread.contactId}, ${thread.dealId || null}, ${thread.channel},
      ${thread.subject}, ${thread.body}, ${thread.intent}, ${thread.risk}, ${thread.confidence},
      ${thread.status}, ${thread.draftReply || null}, ${JSON.stringify(thread.sourceKnowledgeIds)}::jsonb,
      ${thread.approvalDecision}, ${thread.approvalReason || null}, ${social?.dmProvider || null},
      ${social?.dmThreadExternalId || null}, ${social?.dmHandle || null}, ${thread.createdAt}, ${thread.updatedAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      contact_id = EXCLUDED.contact_id, deal_id = EXCLUDED.deal_id, channel = EXCLUDED.channel,
      subject = EXCLUDED.subject, body = EXCLUDED.body, intent = EXCLUDED.intent, risk = EXCLUDED.risk,
      confidence = EXCLUDED.confidence, status = EXCLUDED.status, draft_reply = EXCLUDED.draft_reply,
      source_knowledge_ids = EXCLUDED.source_knowledge_ids, approval_decision = EXCLUDED.approval_decision,
      approval_reason = EXCLUDED.approval_reason, dm_provider = EXCLUDED.dm_provider,
      dm_thread_external_id = EXCLUDED.dm_thread_external_id, dm_handle = EXCLUDED.dm_handle,
      updated_at = EXCLUDED.updated_at
    RETURNING *
  `;
  return threadFromRow(rows[0] as DbRow);
}

export async function getThread(threadId: string): Promise<MessageThread | undefined> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM agent_threads WHERE id = ${threadId} LIMIT 1`;
  return rows[0] ? threadFromRow(rows[0] as DbRow) : undefined;
}

export async function listThreads(channel?: MessageThread["channel"]): Promise<MessageThread[]> {
  const sql = getDb();
  const rows = channel
    ? await sql`SELECT * FROM agent_threads WHERE channel = ${channel} ORDER BY created_at ASC`
    : await sql`SELECT * FROM agent_threads ORDER BY created_at ASC`;
  return rows.map((row) => threadFromRow(row as DbRow));
}

export async function saveMessage(input: Omit<EmailMessage, "id"> & { id?: string }): Promise<EmailMessage> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO agent_messages (id, thread_id, contact_id, direction, provider_message_id, subject, body, sent_at)
    VALUES (${input.id || id("message")}, ${input.threadId}, ${input.contactId}, ${input.direction}, ${input.providerMessageId}, ${input.subject}, ${input.body}, ${input.sentAt})
    ON CONFLICT (provider_message_id) DO NOTHING
    RETURNING *
  `;
  if (rows[0]) {
    const row = rows[0] as DbRow;
    return {
      id: String(row.id), threadId: String(row.thread_id), contactId: String(row.contact_id),
      direction: String(row.direction) as EmailMessage["direction"], providerMessageId: String(row.provider_message_id),
      subject: String(row.subject), body: String(row.body), sentAt: new Date(String(row.sent_at)).toISOString(),
    };
  }
  const existing = await sql`SELECT * FROM agent_messages WHERE provider_message_id = ${input.providerMessageId} LIMIT 1`;
  const row = existing[0] as DbRow;
  return {
    id: String(row.id), threadId: String(row.thread_id), contactId: String(row.contact_id),
    direction: String(row.direction) as EmailMessage["direction"], providerMessageId: String(row.provider_message_id),
    subject: String(row.subject), body: String(row.body), sentAt: new Date(String(row.sent_at)).toISOString(),
  };
}
