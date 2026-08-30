import { processInboundEmail, processInboundSocialDm, sendThreadReply } from "@/src/agent/email/engine";
import { buildDailyDigest } from "@/src/agent/reporting/digest";
import { createOnboardingTasksForDeal } from "@/src/agent/workflows/onboarding";
import { crmAdapter } from "@/src/agent/integrations/crm";
import { threadsStore } from "@/src/agent/store";
import { enrollSequence, upsertSequence } from "@/src/agent/workflows/sequences";
import { upsertContract, upsertInvoice } from "@/src/agent/workflows/billing";
import { getDashboardMetrics } from "@/src/agent/reporting/kpi";

export async function runPilotUAT() {
  const lowRisk = await processInboundEmail({
    from: "partner1@example.com",
    subject: "Need media kit and pricing",
    body: "Can you share your media kit and starter package pricing?",
  });

  const highRisk = await processInboundEmail({
    from: "partner2@example.com",
    subject: "Contract and discount request",
    body: "We need contract guarantees and a custom 35% discount with exclusivity.",
  });

  if (highRisk.status === "pending_approval") {
    await sendThreadReply(highRisk.id, true, "Approved by UAT reviewer.");
  }

  const socialInbound = await processInboundSocialDm({
    fromHandle: "@columbus_partner",
    body: "Can we run a founding advertiser campaign and get current package pricing?",
    provider: "staged",
    providerThreadId: "dm-thread-1",
  });

  const company = crmAdapter.upsertCompany({
    name: "Onboarding Partner LLC",
  });
  const contact = crmAdapter.upsertContact({
    email: "onboarding@example.com",
    name: "Onboarding Partner",
    companyId: company.id,
  });
  const deal = crmAdapter.upsertDeal({
    companyId: company.id,
    primaryContactId: contact.id,
    stage: "won",
    packageName: "Authority Spotlight",
    mrr: 3500,
    oneTimeRevenue: 1750,
    ownerRole: "sales",
  });
  const tasks = createOnboardingTasksForDeal(deal.id);

  const sequence = upsertSequence({
    name: "Founding Sponsor Intro",
    stopOnReply: true,
    stopOnMeetingBooked: true,
    steps: [
      {
        id: "step_1",
        order: 1,
        channel: "email",
        templateSubject: "ColumbusREMedia founding sponsor availability",
        templateBody: "We have limited founding sponsor inventory available this month.",
        waitDaysAfterPrevious: 0,
      },
      {
        id: "step_2",
        order: 2,
        channel: "social_dm",
        templateSubject: "Follow-up in DM",
        templateBody: "Sharing a quick follow-up with package recommendations.",
        waitDaysAfterPrevious: 2,
      },
    ],
  });
  const enrollment = enrollSequence({
    sequenceId: sequence.id,
    contactId: contact.id,
    dealId: deal.id,
  });
  const sequenceExecution: "blocked_by_policy" | "executed" = "blocked_by_policy";
  if (process.env.AGENT_EXTERNAL_SENDS_ENABLED === "true") {
    throw new Error("Pilot execution requires an explicit durable approval and is not part of the default UAT path.");
  }

  const contract = upsertContract({
    companyId: company.id,
    dealId: deal.id,
    status: "sent",
    amount: 5250,
  });
  const invoice = upsertInvoice({
    contractId: contract.id,
    companyId: company.id,
    dealId: deal.id,
    status: "sent",
    amount: 5250,
    dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  });

  const report = buildDailyDigest();
  const metrics = getDashboardMetrics();

  return {
    ok: true,
    threadsTotal: threadsStore.size,
    lowRiskThreadId: lowRisk.id,
    highRiskThreadId: highRisk.id,
    socialThreadId: socialInbound.id,
    onboardingTasksCreated: tasks.length,
    contractId: contract.id,
    invoiceId: invoice.id,
    sequenceEnrollmentId: enrollment.id,
    sequenceExecution,
    dashboard: metrics,
    report,
  };
}
