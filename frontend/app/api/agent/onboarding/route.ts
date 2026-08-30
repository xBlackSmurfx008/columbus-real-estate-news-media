import { NextRequest, NextResponse } from "next/server";
import { isAgentResponse, requireAgentCapability } from "@/lib/agent-auth";
import {
  createOnboardingTasksForDeal,
  getOnboardingSnapshot,
  updateOnboardingTask,
} from "@/src/agent/workflows/onboarding";
import { crmAdapter } from "@/src/agent/integrations/crm";

interface OnboardingStartPayload {
  dealId?: string;
  contactEmail?: string;
  contactName?: string;
  companyName?: string;
  packageName?: string;
  mrr?: number;
  oneTimeRevenue?: number;
}

interface OnboardingUpdatePayload {
  taskId: string;
  status: "pending" | "in_progress" | "completed";
  notes?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "onboarding:manage");
    if (isAgentResponse(session)) return session;
    const snapshot = await getOnboardingSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "onboarding:manage");
    if (isAgentResponse(session)) return session;
    const payload = (await request.json()) as OnboardingStartPayload;
    let dealId = payload.dealId;

    if (!dealId) {
      if (!payload.contactEmail || !payload.contactName) {
        return NextResponse.json(
          { error: "Provide dealId or contactEmail + contactName." },
          { status: 400 },
        );
      }
      const company = await crmAdapter.upsertCompany({
        name: payload.companyName || `${payload.contactName} Company`,
      });
      const contact = await crmAdapter.upsertContact({
        email: payload.contactEmail,
        name: payload.contactName,
        companyId: company.id,
      });
      const deal = await crmAdapter.upsertDeal({
        companyId: company.id,
        primaryContactId: contact.id,
        stage: "won",
        packageName: payload.packageName,
        mrr: payload.mrr,
        oneTimeRevenue: payload.oneTimeRevenue,
        ownerRole: "operations",
      });
      dealId = deal.id;
    }

    const tasks = await createOnboardingTasksForDeal(dealId);
    return NextResponse.json({ ok: true, dealId, tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "onboarding:manage");
    if (isAgentResponse(session)) return session;
    const payload = (await request.json()) as OnboardingUpdatePayload;
    if (!payload.taskId || !payload.status) {
      return NextResponse.json({ error: "Required fields: taskId, status." }, { status: 400 });
    }
    const task = await updateOnboardingTask(payload.taskId, payload.status, payload.notes);
    return NextResponse.json({ ok: true, task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
