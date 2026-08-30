import { getDb } from "@/lib/db";
import type {
  Company,
  CRMActivity,
  CRMTask,
  Contact,
  Deal,
  DealSla,
  DealStage,
  DealStageHistory,
  UserRole,
} from "@/src/agent/types";

const stageOrder: DealStage[] = [
  "targeted",
  "contacted",
  "discovery_booked",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
  "renewal",
];

type DbRow = Record<string, unknown>;

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function dateValue(value: unknown): string | undefined {
  return value ? new Date(String(value)).toISOString() : undefined;
}

function companyFromRow(row: DbRow): Company {
  return {
    id: String(row.id),
    name: String(row.name),
    website: row.website ? String(row.website) : undefined,
    industry: row.industry ? String(row.industry) : undefined,
    ownerId: row.owner_id ? String(row.owner_id) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function contactFromRow(row: DbRow): Contact {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    title: row.title ? String(row.title) : undefined,
    companyId: row.company_id ? String(row.company_id) : undefined,
    ownerId: row.owner_id ? String(row.owner_id) : undefined,
    lastContactedAt: dateValue(row.last_contacted_at),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function dealFromRow(row: DbRow): Deal {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    primaryContactId: row.primary_contact_id ? String(row.primary_contact_id) : undefined,
    stage: String(row.stage) as DealStage,
    mrr: row.mrr === null || row.mrr === undefined ? undefined : Number(row.mrr),
    oneTimeRevenue:
      row.one_time_revenue === null || row.one_time_revenue === undefined
        ? undefined
        : Number(row.one_time_revenue),
    weightedValue:
      row.weighted_value === null || row.weighted_value === undefined
        ? undefined
        : Number(row.weighted_value),
    packageName: row.package_name ? String(row.package_name) : undefined,
    closeDate: dateValue(row.close_date),
    renewalDate: dateValue(row.renewal_date),
    ownerRole: String(row.owner_role) as UserRole,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function stageHistoryFromRow(row: DbRow): DealStageHistory {
  return {
    id: String(row.id),
    dealId: String(row.deal_id),
    fromStage: row.from_stage ? (String(row.from_stage) as DealStage) : undefined,
    toStage: String(row.to_stage) as DealStage,
    changedByRole: String(row.changed_by_role) as UserRole,
    reason: row.reason ? String(row.reason) : undefined,
    changedAt: new Date(String(row.changed_at)).toISOString(),
  };
}

function slaFromRow(row: DbRow): DealSla {
  return {
    id: String(row.id),
    dealId: String(row.deal_id),
    type: String(row.type) as DealSla["type"],
    dueAt: new Date(String(row.due_at)).toISOString(),
    completedAt: dateValue(row.completed_at),
    status: String(row.status) as DealSla["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function taskFromRow(row: DbRow): CRMTask {
  return {
    id: String(row.id),
    title: String(row.title),
    status: String(row.status) as CRMTask["status"],
    dueAt: dateValue(row.due_at),
    assigneeRole: String(row.assignee_role) as UserRole,
    contactId: row.contact_id ? String(row.contact_id) : undefined,
    dealId: row.deal_id ? String(row.deal_id) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function activityFromRow(row: DbRow): CRMActivity {
  return {
    id: String(row.id),
    entityType: String(row.entity_type) as CRMActivity["entityType"],
    entityId: String(row.entity_id),
    contactId: row.contact_id ? String(row.contact_id) : undefined,
    dealId: row.deal_id ? String(row.deal_id) : undefined,
    threadId: row.thread_id ? String(row.thread_id) : undefined,
    type: String(row.type) as CRMActivity["type"],
    summary: String(row.summary),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function buildSlaTemplates(stage: DealStage): Array<Pick<DealSla, "type" | "dueAt">> {
  if (stage === "contacted") return [{ type: "first_response", dueAt: isoDaysFromNow(1) }];
  if (stage === "proposal_sent") return [{ type: "proposal_turnaround", dueAt: isoDaysFromNow(2) }];
  if (stage === "won") return [{ type: "post_campaign_recap", dueAt: isoDaysFromNow(7) }];
  return [];
}

async function refreshDealSlas(deal: Deal): Promise<void> {
  const sql = getDb();
  for (const template of buildSlaTemplates(deal.stage)) {
    await sql`
      INSERT INTO agent_deal_slas (id, deal_id, type, due_at)
      VALUES (${id("sla")}, ${deal.id}, ${template.type}, ${template.dueAt})
      ON CONFLICT (deal_id, type) DO NOTHING
    `;
  }
}

export const crmAdapter = {
  async upsertCompany(partial: Pick<Company, "name"> & Partial<Company>): Promise<Company> {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO agent_companies (id, name, website, industry, owner_id)
      VALUES (${id("company")}, ${partial.name}, ${partial.website || null}, ${partial.industry || null}, ${partial.ownerId || null})
      ON CONFLICT (LOWER(name)) DO UPDATE
      SET name = EXCLUDED.name, website = EXCLUDED.website, industry = EXCLUDED.industry,
          owner_id = EXCLUDED.owner_id, updated_at = NOW()
      RETURNING *
    `;
    return companyFromRow(rows[0] as DbRow);
  },

  async getContactByEmail(email: string): Promise<Contact | undefined> {
    const sql = getDb();
    const rows = await sql`SELECT * FROM agent_contacts WHERE LOWER(email) = LOWER(${email}) LIMIT 1`;
    return rows[0] ? contactFromRow(rows[0] as DbRow) : undefined;
  },

  async upsertContact(partial: Pick<Contact, "email" | "name"> & Partial<Contact>): Promise<Contact> {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO agent_contacts (id, name, email, title, company_id, owner_id, last_contacted_at)
      VALUES (${id("contact")}, ${partial.name}, ${partial.email.toLowerCase()}, ${partial.title || null}, ${partial.companyId || null}, ${partial.ownerId || null}, ${partial.lastContactedAt || null})
      ON CONFLICT (LOWER(email)) DO UPDATE
      SET name = EXCLUDED.name, title = EXCLUDED.title, company_id = EXCLUDED.company_id,
          owner_id = EXCLUDED.owner_id, last_contacted_at = EXCLUDED.last_contacted_at, updated_at = NOW()
      RETURNING *
    `;
    return contactFromRow(rows[0] as DbRow);
  },

  async upsertDeal(partial: Pick<Deal, "companyId" | "stage" | "ownerRole"> & Partial<Deal>): Promise<Deal> {
    const sql = getDb();
    const existing = await sql`
      SELECT * FROM agent_deals
      WHERE company_id = ${partial.companyId}
        AND primary_contact_id IS NOT DISTINCT FROM ${partial.primaryContactId || null}
      LIMIT 1
    `;
    if (existing[0]) {
      const current = dealFromRow(existing[0] as DbRow);
      const rows = await sql`
        UPDATE agent_deals
        SET stage = ${partial.stage}, mrr = ${partial.mrr ?? current.mrr ?? null},
            one_time_revenue = ${partial.oneTimeRevenue ?? current.oneTimeRevenue ?? null},
            weighted_value = ${((partial.mrr ?? current.mrr ?? 0) + (partial.oneTimeRevenue ?? current.oneTimeRevenue ?? 0))},
            package_name = ${partial.packageName ?? current.packageName ?? null},
            close_date = ${partial.closeDate ?? current.closeDate ?? null},
            renewal_date = ${partial.renewalDate ?? current.renewalDate ?? null},
            owner_role = ${partial.ownerRole ?? current.ownerRole}, updated_at = NOW()
        WHERE id = ${current.id}
        RETURNING *
      `;
      const saved = dealFromRow(rows[0] as DbRow);
      await refreshDealSlas(saved);
      return saved;
    }
    const rows = await sql`
      INSERT INTO agent_deals (id, company_id, primary_contact_id, stage, mrr, one_time_revenue, weighted_value, package_name, close_date, renewal_date, owner_role)
      VALUES (${id("deal")}, ${partial.companyId}, ${partial.primaryContactId || null}, ${partial.stage}, ${partial.mrr ?? null}, ${partial.oneTimeRevenue ?? null}, ${(partial.mrr || 0) + (partial.oneTimeRevenue || 0)}, ${partial.packageName || null}, ${partial.closeDate || null}, ${partial.renewalDate || null}, ${partial.ownerRole})
      RETURNING *
    `;
    const saved = dealFromRow(rows[0] as DbRow);
    await this.addStageHistory({ dealId: saved.id, toStage: saved.stage, changedByRole: saved.ownerRole });
    await refreshDealSlas(saved);
    return saved;
  },

  async addStageHistory(input: Omit<DealStageHistory, "id" | "changedAt">): Promise<DealStageHistory> {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO agent_deal_stage_history (id, deal_id, from_stage, to_stage, changed_by_role, reason)
      VALUES (${id("stage")}, ${input.dealId}, ${input.fromStage || null}, ${input.toStage}, ${input.changedByRole}, ${input.reason || null})
      RETURNING *
    `;
    return stageHistoryFromRow(rows[0] as DbRow);
  },

  async moveDealStage(dealId: string, stage: DealStage, changedByRole: UserRole, reason?: string): Promise<Deal> {
    const sql = getDb();
    const currentRows = await sql`SELECT * FROM agent_deals WHERE id = ${dealId} LIMIT 1`;
    if (!currentRows[0]) throw new Error("Deal not found.");
    const current = dealFromRow(currentRows[0] as DbRow);
    if (stageOrder.indexOf(stage) < stageOrder.indexOf(current.stage) && stage !== "lost") {
      throw new Error("Invalid stage regression. Use lost for disqualification.");
    }
    const rows = await sql`UPDATE agent_deals SET stage = ${stage}, updated_at = NOW() WHERE id = ${dealId} RETURNING *`;
    const saved = dealFromRow(rows[0] as DbRow);
    await this.addStageHistory({ dealId, fromStage: current.stage, toStage: stage, changedByRole, reason });
    await refreshDealSlas(saved);
    return saved;
  },

  async upsertTask(partial: Pick<CRMTask, "title" | "assigneeRole"> & Partial<CRMTask>): Promise<CRMTask> {
    const sql = getDb();
    if (partial.id) {
      const rows = await sql`
        UPDATE agent_crm_tasks
        SET title = ${partial.title}, status = ${partial.status || "pending"}, due_at = ${partial.dueAt || null},
            assignee_role = ${partial.assigneeRole}, contact_id = ${partial.contactId || null}, deal_id = ${partial.dealId || null},
            notes = ${partial.notes || null}, updated_at = NOW()
        WHERE id = ${partial.id}
        RETURNING *
      `;
      if (rows[0]) return taskFromRow(rows[0] as DbRow);
    }
    const rows = await sql`
      INSERT INTO agent_crm_tasks (id, title, status, due_at, assignee_role, contact_id, deal_id, notes)
      VALUES (${partial.id || id("task")}, ${partial.title}, ${partial.status || "pending"}, ${partial.dueAt || null}, ${partial.assigneeRole}, ${partial.contactId || null}, ${partial.dealId || null}, ${partial.notes || null})
      RETURNING *
    `;
    return taskFromRow(rows[0] as DbRow);
  },

  async addActivity(input: Omit<CRMActivity, "id" | "createdAt">): Promise<CRMActivity> {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO agent_activities (id, entity_type, entity_id, contact_id, deal_id, thread_id, type, summary)
      VALUES (${id("activity")}, ${input.entityType}, ${input.entityId}, ${input.contactId || null}, ${input.dealId || null}, ${input.threadId || null}, ${input.type}, ${input.summary})
      RETURNING *
    `;
    return activityFromRow(rows[0] as DbRow);
  },

  async getSnapshot() {
    const sql = getDb();
    const [companies, contacts, deals, stageHistory, slas, tasks, activities] = await Promise.all([
      sql`SELECT * FROM agent_companies ORDER BY created_at ASC`,
      sql`SELECT * FROM agent_contacts ORDER BY created_at ASC`,
      sql`SELECT * FROM agent_deals ORDER BY created_at ASC`,
      sql`SELECT * FROM agent_deal_stage_history ORDER BY changed_at ASC`,
      sql`SELECT * FROM agent_deal_slas ORDER BY created_at ASC`,
      sql`SELECT * FROM agent_crm_tasks ORDER BY created_at ASC`,
      sql`SELECT * FROM agent_activities ORDER BY created_at ASC`,
    ]);
    return {
      companies: companies.map((row) => companyFromRow(row as DbRow)),
      contacts: contacts.map((row) => contactFromRow(row as DbRow)),
      deals: deals.map((row) => dealFromRow(row as DbRow)),
      stageHistory: stageHistory.map((row) => stageHistoryFromRow(row as DbRow)),
      slas: slas.map((row) => {
        const sla = slaFromRow(row as DbRow);
        return sla.status === "completed" || new Date(sla.dueAt).getTime() >= Date.now()
          ? sla
          : { ...sla, status: "overdue" as const };
      }),
      tasks: tasks.map((row) => taskFromRow(row as DbRow)),
      activities: activities.map((row) => activityFromRow(row as DbRow)),
    };
  },
};
