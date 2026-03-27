import { NextResponse } from "next/server";
import { crmAdapter } from "@/src/agent/integrations/crm";
import type { DealStage, UserRole } from "@/src/agent/types";

type CRMActionPayload =
  | {
      action: "upsert_contact_deal";
      contact: { email: string; name: string; title?: string };
      company: { name: string; website?: string; industry?: string };
      deal?: {
        stage: DealStage;
        mrr?: number;
        oneTimeRevenue?: number;
        packageName?: string;
        ownerRole?: UserRole;
      };
    }
  | {
      action: "move_stage";
      dealId: string;
      stage: DealStage;
      changedByRole: UserRole;
      reason?: string;
    }
  | {
      action: "upsert_task";
      task: {
        id?: string;
        title: string;
        status?: "pending" | "in_progress" | "completed" | "overdue";
        assigneeRole: UserRole;
        dueAt?: string;
        contactId?: string;
        dealId?: string;
        notes?: string;
      };
    };

export async function GET() {
  try {
    const snapshot = crmAdapter.getSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CRMActionPayload;

    if (payload.action === "upsert_contact_deal") {
      if (!payload.contact?.email || !payload.contact?.name || !payload.company?.name) {
        return NextResponse.json(
          { error: "Required fields: contact.email, contact.name, company.name." },
          { status: 400 },
        );
      }
      const company = crmAdapter.upsertCompany(payload.company);
      const contact = crmAdapter.upsertContact({
        email: payload.contact.email,
        name: payload.contact.name,
        title: payload.contact.title,
        companyId: company.id,
      });

      let deal;
      if (payload.deal) {
        deal = crmAdapter.upsertDeal({
          companyId: company.id,
          primaryContactId: contact.id,
          stage: payload.deal.stage,
          mrr: payload.deal.mrr,
          oneTimeRevenue: payload.deal.oneTimeRevenue,
          packageName: payload.deal.packageName,
          ownerRole: payload.deal.ownerRole || "sales",
        });
      }
      return NextResponse.json({ ok: true, company, contact, deal });
    }

    if (payload.action === "move_stage") {
      const deal = crmAdapter.moveDealStage(
        payload.dealId,
        payload.stage,
        payload.changedByRole,
        payload.reason,
      );
      return NextResponse.json({ ok: true, deal });
    }

    if (payload.action === "upsert_task") {
      const task = crmAdapter.upsertTask(payload.task);
      return NextResponse.json({ ok: true, task });
    }

    return NextResponse.json({ error: "Invalid action payload." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
