import { getDb } from "@/lib/db";
import type { Sequence, SequenceEnrollment } from "@/src/agent/types";

type DbRow = Record<string, unknown>;
type SequenceInput = Omit<Sequence, "id" | "createdAt" | "updatedAt"> & Partial<Pick<Sequence, "id" | "createdAt" | "updatedAt">>;
type EnrollmentInput = Omit<SequenceEnrollment, "id" | "createdAt" | "updatedAt"> & Partial<Pick<SequenceEnrollment, "id" | "createdAt" | "updatedAt">>;

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function sequenceFromRow(row: DbRow): Sequence {
  return {
    id: String(row.id),
    name: String(row.name),
    stopOnReply: Boolean(row.stop_on_reply),
    stopOnMeetingBooked: Boolean(row.stop_on_meeting_booked),
    steps: Array.isArray(row.steps_json) ? row.steps_json as Sequence["steps"] : [],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function enrollmentFromRow(row: DbRow): SequenceEnrollment {
  return {
    id: String(row.id),
    sequenceId: String(row.sequence_id),
    contactId: String(row.contact_id),
    dealId: row.deal_id ? String(row.deal_id) : undefined,
    currentStepOrder: Number(row.current_step_order),
    status: String(row.status) as SequenceEnrollment["status"],
    lastAdvancedAt: row.last_advanced_at ? new Date(String(row.last_advanced_at)).toISOString() : undefined,
    stopReason: row.stop_reason ? String(row.stop_reason) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function saveSequence(input: SequenceInput): Promise<Sequence> {
  const sql = getDb();
  const sequenceId = input.id || id("sequence");
  const rows = await sql`
    INSERT INTO agent_sequences (id, name, stop_on_reply, stop_on_meeting_booked, steps_json, created_at, updated_at)
    VALUES (${sequenceId}, ${input.name}, ${input.stopOnReply}, ${input.stopOnMeetingBooked}, ${JSON.stringify(input.steps)}::jsonb, COALESCE(${input.createdAt || null}, NOW()), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, stop_on_reply = EXCLUDED.stop_on_reply,
      stop_on_meeting_booked = EXCLUDED.stop_on_meeting_booked,
      steps_json = EXCLUDED.steps_json, updated_at = NOW()
    RETURNING *
  `;
  return sequenceFromRow(rows[0] as DbRow);
}

export async function getSequence(sequenceId: string): Promise<Sequence | undefined> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM agent_sequences WHERE id = ${sequenceId} LIMIT 1`;
  return rows[0] ? sequenceFromRow(rows[0] as DbRow) : undefined;
}

export async function listSequences(): Promise<Sequence[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM agent_sequences ORDER BY created_at ASC`;
  return rows.map((row) => sequenceFromRow(row as DbRow));
}

export async function saveEnrollment(input: EnrollmentInput): Promise<SequenceEnrollment> {
  const sql = getDb();
  const enrollmentId = input.id || id("enrollment");
  const rows = await sql`
    INSERT INTO agent_sequence_enrollments (id, sequence_id, contact_id, deal_id, current_step_order, status, last_advanced_at, stop_reason, created_at, updated_at)
    VALUES (${enrollmentId}, ${input.sequenceId}, ${input.contactId}, ${input.dealId || null}, ${input.currentStepOrder}, ${input.status}, ${input.lastAdvancedAt || null}, ${input.stopReason || null}, COALESCE(${input.createdAt || null}, NOW()), NOW())
    ON CONFLICT (id) DO UPDATE SET
      sequence_id = EXCLUDED.sequence_id, contact_id = EXCLUDED.contact_id, deal_id = EXCLUDED.deal_id,
      current_step_order = EXCLUDED.current_step_order, status = EXCLUDED.status,
      last_advanced_at = EXCLUDED.last_advanced_at, stop_reason = EXCLUDED.stop_reason, updated_at = NOW()
    RETURNING *
  `;
  return enrollmentFromRow(rows[0] as DbRow);
}

export async function getEnrollment(enrollmentId: string): Promise<SequenceEnrollment | undefined> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM agent_sequence_enrollments WHERE id = ${enrollmentId} LIMIT 1`;
  return rows[0] ? enrollmentFromRow(rows[0] as DbRow) : undefined;
}

export async function listEnrollments(): Promise<SequenceEnrollment[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM agent_sequence_enrollments ORDER BY created_at ASC`;
  return rows.map((row) => enrollmentFromRow(row as DbRow));
}
