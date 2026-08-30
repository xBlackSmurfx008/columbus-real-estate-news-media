import { getDb } from "@/lib/db";
import type { OnboardingTask } from "@/src/agent/types";

type DbRow = Record<string, unknown>;
type OnboardingTaskInput = Omit<OnboardingTask, "id" | "createdAt" | "updatedAt"> & Partial<Pick<OnboardingTask, "id" | "createdAt" | "updatedAt">>;

function id(): string {
  return `onboarding_${crypto.randomUUID()}`;
}

function fromRow(row: DbRow): OnboardingTask {
  return {
    id: String(row.id), dealId: String(row.deal_id), type: String(row.type) as OnboardingTask["type"],
    status: String(row.status) as OnboardingTask["status"],
    dueAt: row.due_at ? new Date(String(row.due_at)).toISOString() : undefined,
    assignee: row.assignee ? String(row.assignee) : undefined, notes: row.notes ? String(row.notes) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function listOnboardingTasks(dealId?: string): Promise<OnboardingTask[]> {
  const sql = getDb();
  const rows = dealId
    ? await sql`SELECT * FROM agent_onboarding_tasks WHERE deal_id = ${dealId} ORDER BY created_at ASC`
    : await sql`SELECT * FROM agent_onboarding_tasks ORDER BY created_at ASC`;
  return rows.map((row) => fromRow(row as DbRow));
}

export async function saveOnboardingTask(input: OnboardingTaskInput): Promise<OnboardingTask> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO agent_onboarding_tasks (id, deal_id, type, status, due_at, assignee, notes, created_at, updated_at)
    VALUES (${input.id || id()}, ${input.dealId}, ${input.type}, ${input.status}, ${input.dueAt || null}, ${input.assignee || null}, ${input.notes || null}, COALESCE(${input.createdAt || null}, NOW()), NOW())
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, due_at = EXCLUDED.due_at, assignee = EXCLUDED.assignee, notes = EXCLUDED.notes, updated_at = NOW()
    RETURNING *
  `;
  return fromRow(rows[0] as DbRow);
}
