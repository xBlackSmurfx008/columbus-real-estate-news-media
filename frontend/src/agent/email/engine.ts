import { classifyIntent, classifyRisk } from "@/src/agent/email/classifier";
import { buildDraftReply } from "@/src/agent/email/draft";
import { initializeKnowledgeBase } from "@/src/agent/knowledge/base";
import { crmAdapter } from "@/src/agent/integrations/crm";
import { requiresHumanApproval } from "@/src/agent/policy/risk";
import type { Channel, Contact, MessageThread } from "@/src/agent/types";
import { emailGateway, type EmailInbound } from "@/src/agent/integrations/email";
import { socialDmGateway } from "@/src/agent/integrations/socialDm";
import { getThread, saveMessage, saveThread } from "@/src/agent/repositories/inbox";

let initialized = false;

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function ensureInitialized(): void {
  if (initialized) return;
  initializeKnowledgeBase();
  initialized = true;
}

async function findOrCreateContact(fromEmail: string): Promise<Contact> {
  const existing = await crmAdapter.getContactByEmail(fromEmail);
  if (existing) return existing;
  return crmAdapter.upsertContact({
    name: fromEmail.split("@")[0] || "unknown",
    email: fromEmail,
  });
}

export async function processInboundEmail(input: EmailInbound): Promise<MessageThread> {
  return processInboundMessage({
    from: input.from,
    subject: input.subject,
    body: input.body,
    channel: "email",
    providerMessageId: input.providerMessageId,
    receivedAt: input.receivedAt,
  });
}

export async function processInboundSocialDm(input: {
  fromHandle: string;
  body: string;
  provider?: string;
  providerThreadId?: string;
  receivedAt?: string;
}): Promise<MessageThread> {
  return processInboundMessage({
    from: input.fromHandle,
    subject: "Social DM inquiry",
    body: input.body,
    channel: "social_dm",
    providerMessageId: input.providerThreadId,
    dmProvider: input.provider,
    dmThreadExternalId: input.providerThreadId,
    dmHandle: input.fromHandle,
    receivedAt: input.receivedAt,
  });
}

export async function processInboundMessage(input: {
  from: string;
  subject: string;
  body: string;
  channel: Channel;
  providerMessageId?: string;
  dmProvider?: string;
  dmThreadExternalId?: string;
  dmHandle?: string;
  receivedAt?: string;
}): Promise<MessageThread> {
  ensureInitialized();
  const now = new Date().toISOString();
  const contact = await findOrCreateContact(input.from);
  const relatedDeal = (await crmAdapter.getSnapshot())
    .deals.find((deal) => deal.primaryContactId === contact.id);
  const classification = classifyIntent(input.subject, input.body);
  const risk = classifyRisk(input.subject, input.body);
  const drafted = buildDraftReply(classification.intent, input.subject, input.body);

  const thread: MessageThread = {
    id: id("thread"),
    contactId: contact.id,
    dealId: relatedDeal?.id,
    channel: input.channel,
    subject: input.subject,
    body: input.body,
    intent: classification.intent,
    risk,
    confidence: classification.confidence,
    status: "drafted",
    draftReply: drafted.draft,
    sourceKnowledgeIds: drafted.sourceKnowledgeIds,
    approvalDecision: "pending",
    ...(input.channel === "social_dm"
      ? {
          dmProvider: input.dmProvider,
          dmThreadExternalId: input.dmThreadExternalId,
          dmHandle: input.dmHandle || input.from,
        }
      : {}),
    createdAt: now,
    updatedAt: now,
  };

  await saveThread(thread);
  await saveMessage({
    id: id("message"),
    threadId: thread.id,
    contactId: contact.id,
    direction: "inbound",
    providerMessageId: input.providerMessageId || id("inbound"),
    subject: input.subject || "Inbound message",
    body: input.body,
    sentAt: input.receivedAt || now,
  });

  const approval = requiresHumanApproval(thread);
  const autoSendLowRisk = process.env.AGENT_AUTO_SEND_LOW_RISK === "true";
  if (approval.required || !autoSendLowRisk) {
    thread.status = "pending_approval";
    thread.approvalReason = approval.reason || "Automatic external replies are disabled by policy.";
  } else {
    thread.approvalDecision = "auto_approved";
    await sendThreadReply(thread.id, true, "Auto-approved low-risk response.");
  }

  await saveThread(thread);
  await crmAdapter.addActivity({
    entityType: "thread",
    entityId: thread.id,
    contactId: contact.id,
    dealId: relatedDeal?.id,
    threadId: thread.id,
    type: "email_received",
    summary: `Inbound processed with intent=${thread.intent}, risk=${thread.risk}.`,
  });

  if (thread.status === "pending_approval") {
    await crmAdapter.addActivity({
      entityType: "thread",
      entityId: thread.id,
      contactId: contact.id,
      dealId: relatedDeal?.id,
      threadId: thread.id,
      type: "approval_required",
      summary: thread.approvalReason || "Requires human approval.",
    });
  }

  return thread;
}

export async function sendThreadReply(
  threadId: string,
  approved: boolean,
  reason?: string,
): Promise<MessageThread> {
  const thread = await getThread(threadId);
  if (!thread) throw new Error("Thread not found.");
  const contact = (await crmAdapter.getSnapshot()).contacts.find((candidate) => candidate.id === thread.contactId);
  if (!contact) throw new Error("Contact not found.");

  if (!approved) {
    thread.approvalDecision = "rejected";
    thread.status = "escalated";
    thread.approvalReason = reason || "Rejected by reviewer.";
    thread.updatedAt = new Date().toISOString();
    await saveThread(thread);
    return thread;
  }

  const draft = thread.draftReply || "Thanks for reaching out.";
  let outbound: { ok: boolean; providerMessageId: string };
  try {
    if (thread.channel === "social_dm") {
      outbound = await socialDmGateway.send({
        toHandle: (thread as MessageThread & { dmHandle?: string }).dmHandle || contact.email,
        body: draft,
        provider: (thread as MessageThread & { dmProvider?: string }).dmProvider || "staged",
        providerThreadId: (thread as MessageThread & { dmThreadExternalId?: string }).dmThreadExternalId,
      });
    } else {
      outbound = await emailGateway.send({
        to: contact.email,
        subject: `Re: ${thread.subject}`,
        body: draft,
      });
    }
  } catch (error) {
    await crmAdapter.addActivity({
      entityType: "thread",
      entityId: thread.id,
      contactId: contact.id,
      dealId: thread.dealId,
      threadId: thread.id,
      type: "approval_required",
      summary: `Send failed: ${error instanceof Error ? error.message : "unknown error"}`,
    });
    throw error;
  }
  if (!outbound.ok) throw new Error("Message provider send failed.");
  await saveMessage({
    id: id("message"),
    threadId: thread.id,
    contactId: contact.id,
    direction: "outbound",
    providerMessageId: outbound.providerMessageId,
    subject: `Re: ${thread.subject}`,
    body: draft,
    sentAt: new Date().toISOString(),
  });

  thread.status = "sent";
  thread.approvalDecision = thread.approvalDecision === "auto_approved" ? "auto_approved" : "approved";
  thread.updatedAt = new Date().toISOString();
  await saveThread(thread);

  await crmAdapter.addActivity({
    entityType: "thread",
    entityId: thread.id,
    contactId: contact.id,
    dealId: thread.dealId,
    threadId: thread.id,
    type: "email_sent",
    summary: `Reply sent (${thread.approvalDecision}). reason=${reason || "n/a"}`,
  });

  // SLA follow-up task if no reply window is missed.
  await crmAdapter.upsertTask({
    title: `Follow up on thread: ${thread.subject}`,
    status: "pending",
    dueAt: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString();
    })(),
    assigneeRole: "sales",
    contactId: contact.id,
    dealId: thread.dealId,
    notes: "Auto-created after outbound send for <24h follow-up SLA.",
  });
  return thread;
}
