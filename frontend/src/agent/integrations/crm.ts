import {
  activitiesStore,
  companiesStore,
  contactsStore,
  dealSlasStore,
  dealStageHistoryStore,
  dealsStore,
  listValues,
  nextId,
  tasksStore,
  upsert,
} from "@/src/agent/store";
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

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function buildSlaTemplates(stage: DealStage): Array<Pick<DealSla, "type" | "dueAt">> {
  if (stage === "contacted") {
    return [{ type: "first_response", dueAt: isoDaysFromNow(1) }];
  }
  if (stage === "proposal_sent") {
    return [{ type: "proposal_turnaround", dueAt: isoDaysFromNow(2) }];
  }
  if (stage === "won") {
    return [{ type: "post_campaign_recap", dueAt: isoDaysFromNow(7) }];
  }
  return [];
}

function refreshDealSlas(deal: Deal): void {
  const templates = buildSlaTemplates(deal.stage);
  const now = new Date().toISOString();
  for (const template of templates) {
    const exists = listValues(dealSlasStore).find(
      (sla) => sla.dealId === deal.id && sla.type === template.type,
    );
    if (!exists) {
      upsert(dealSlasStore, {
        id: nextId("sla"),
        dealId: deal.id,
        type: template.type,
        dueAt: template.dueAt,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

export const crmAdapter = {
  upsertCompany(partial: Pick<Company, "name"> & Partial<Company>): Company {
    const now = new Date().toISOString();
    const existing = listValues(companiesStore).find((c) => c.name.toLowerCase() === partial.name.toLowerCase());
    if (existing) {
      return upsert(companiesStore, { ...existing, ...partial, updatedAt: now });
    }
    return upsert(companiesStore, {
      id: nextId("company"),
      name: partial.name,
      website: partial.website,
      industry: partial.industry,
      ownerId: partial.ownerId,
      createdAt: now,
      updatedAt: now,
    });
  },

  getContactByEmail(email: string): Contact | undefined {
    return listValues(contactsStore).find((c) => c.email.toLowerCase() === email.toLowerCase());
  },

  upsertContact(partial: Pick<Contact, "email" | "name"> & Partial<Contact>): Contact {
    const existing = this.getContactByEmail(partial.email);
    const now = new Date().toISOString();
    if (existing) {
      const updated: Contact = {
        ...existing,
        ...partial,
        updatedAt: now,
      };
      return upsert(contactsStore, updated);
    }
    const created: Contact = {
      id: nextId("contact"),
      name: partial.name,
      email: partial.email,
      title: partial.title,
      companyId: partial.companyId,
      ownerId: partial.ownerId,
      lastContactedAt: partial.lastContactedAt,
      createdAt: now,
      updatedAt: now,
    };
    return upsert(contactsStore, created);
  },

  upsertDeal(partial: Pick<Deal, "companyId" | "stage" | "ownerRole"> & Partial<Deal>): Deal {
    const existing = listValues(dealsStore).find(
      (d) => d.companyId === partial.companyId && d.primaryContactId === partial.primaryContactId,
    );
    const now = new Date().toISOString();
    if (existing) {
      const updated: Deal = {
        ...existing,
        ...partial,
        weightedValue:
          partial.mrr || partial.oneTimeRevenue
            ? (partial.mrr || existing.mrr || 0) + (partial.oneTimeRevenue || existing.oneTimeRevenue || 0)
            : existing.weightedValue,
        updatedAt: now,
      };
      const saved = upsert(dealsStore, updated);
      refreshDealSlas(saved);
      return saved;
    }
    const created: Deal = {
      id: nextId("deal"),
      companyId: partial.companyId,
      primaryContactId: partial.primaryContactId,
      stage: partial.stage,
      mrr: partial.mrr,
      oneTimeRevenue: partial.oneTimeRevenue,
      weightedValue: (partial.mrr || 0) + (partial.oneTimeRevenue || 0),
      packageName: partial.packageName,
      closeDate: partial.closeDate,
      renewalDate: partial.renewalDate,
      ownerRole: partial.ownerRole,
      createdAt: now,
      updatedAt: now,
    };
    const saved = upsert(dealsStore, created);
    this.addStageHistory({ dealId: saved.id, toStage: saved.stage, changedByRole: saved.ownerRole });
    refreshDealSlas(saved);
    return saved;
  },

  addStageHistory(input: Omit<DealStageHistory, "id" | "changedAt">): DealStageHistory {
    return upsert(dealStageHistoryStore, {
      id: nextId("stage"),
      changedAt: new Date().toISOString(),
      ...input,
    });
  },

  moveDealStage(dealId: string, stage: DealStage, changedByRole: UserRole, reason?: string): Deal {
    const deal = dealsStore.get(dealId);
    if (!deal) {
      throw new Error("Deal not found.");
    }
    const oldIndex = stageOrder.indexOf(deal.stage);
    const newIndex = stageOrder.indexOf(stage);
    const invalidBackwardMove = newIndex < oldIndex && stage !== "lost";
    if (invalidBackwardMove) {
      throw new Error("Invalid stage regression. Use lost for disqualification.");
    }
    const fromStage = deal.stage;
    deal.stage = stage;
    deal.updatedAt = new Date().toISOString();
    const saved = upsert(dealsStore, deal);
    this.addStageHistory({ dealId, fromStage, toStage: stage, changedByRole, reason });
    refreshDealSlas(saved);
    return saved;
  },

  upsertTask(partial: Pick<CRMTask, "title" | "assigneeRole"> & Partial<CRMTask>): CRMTask {
    const now = new Date().toISOString();
    if (partial.id && tasksStore.has(partial.id)) {
      const current = tasksStore.get(partial.id);
      if (!current) throw new Error("Task not found.");
      const updated = {
        ...current,
        ...partial,
        updatedAt: now,
      };
      return upsert(tasksStore, updated);
    }
    return upsert(tasksStore, {
      id: nextId("task"),
      title: partial.title,
      status: partial.status || "pending",
      dueAt: partial.dueAt,
      assigneeRole: partial.assigneeRole,
      contactId: partial.contactId,
      dealId: partial.dealId,
      notes: partial.notes,
      createdAt: now,
      updatedAt: now,
    });
  },

  addActivity(input: Omit<CRMActivity, "id" | "createdAt">): CRMActivity {
    const activity: CRMActivity = {
      id: nextId("activity"),
      createdAt: new Date().toISOString(),
      ...input,
    };
    return upsert(activitiesStore, activity);
  },

  getSnapshot() {
    const slas = listValues(dealSlasStore).map((sla) => {
      if (sla.status === "completed") return sla;
      const overdue = new Date(sla.dueAt).getTime() < Date.now();
      return overdue ? { ...sla, status: "overdue" as const } : sla;
    });
    return {
      companies: listValues(companiesStore),
      contacts: listValues(contactsStore),
      deals: listValues(dealsStore),
      stageHistory: listValues(dealStageHistoryStore),
      slas,
      tasks: listValues(tasksStore),
      activities: listValues(activitiesStore),
    };
  },
};
