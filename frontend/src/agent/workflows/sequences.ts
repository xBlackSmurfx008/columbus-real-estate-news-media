import { emailGateway } from "@/src/agent/integrations/email";
import { crmAdapter } from "@/src/agent/integrations/crm";
import { claimAgentApproval, completeAgentApproval } from "@/src/agent/durable-store";
import type { Sequence, SequenceEnrollment } from "@/src/agent/types";
import { socialDmGateway } from "@/src/agent/integrations/socialDm";
import { listThreads } from "@/src/agent/repositories/inbox";
import {
  getEnrollment,
  getSequence,
  listEnrollments,
  listSequences,
  saveEnrollment,
  saveSequence,
} from "@/src/agent/repositories/sequences";

const maxTouchesPerContactPerDay = Number(process.env.AGENT_MAX_TOUCHES_PER_CONTACT_PER_DAY || 2);
const sendWindowStartHour = Number(process.env.AGENT_SEND_WINDOW_START_HOUR || 9);
const sendWindowEndHour = Number(process.env.AGENT_SEND_WINDOW_END_HOUR || 18);

export function upsertSequence(input: Omit<Sequence, "id" | "createdAt" | "updatedAt"> & Partial<Sequence>): Promise<Sequence> {
  return saveSequence(input);
}

export function enrollSequence(input: Pick<SequenceEnrollment, "sequenceId" | "contactId"> & Partial<SequenceEnrollment>): Promise<SequenceEnrollment> {
  return saveEnrollment({
    ...(input.id ? { id: input.id } : {}),
    sequenceId: input.sequenceId,
    contactId: input.contactId,
    dealId: input.dealId,
    currentStepOrder: input.currentStepOrder || 1,
    status: input.status || "active",
    lastAdvancedAt: input.lastAdvancedAt,
    stopReason: input.stopReason,
    createdAt: input.createdAt,
  });
}

async function shouldPauseEnrollment(enrollment: SequenceEnrollment, sequence: Sequence): Promise<string | undefined> {
  if (sequence.stopOnReply) {
    const hasReply = (await listThreads()).some(
      (thread) => thread.contactId === enrollment.contactId &&
        (thread.status === "received" || thread.status === "pending_approval"),
    );
    if (hasReply) return "Paused due to inbound reply.";
  }
  if (sequence.stopOnMeetingBooked) {
    const meetingBooked = (await crmAdapter.getSnapshot()).activities.some(
      (activity) => activity.contactId === enrollment.contactId && activity.type === "meeting_scheduled",
    );
    if (meetingBooked) return "Paused because a meeting is already booked.";
  }
  return undefined;
}

function inAllowedSendWindow(date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= sendWindowStartHour && hour < sendWindowEndHour;
}

async function touchesSentToday(contactId: string): Promise<number> {
  const now = new Date();
  return (await crmAdapter.getSnapshot()).activities.filter((activity) => {
    if (activity.contactId !== contactId || activity.type !== "email_sent") return false;
    const created = new Date(activity.createdAt);
    return created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() && created.getDate() === now.getDate();
  }).length;
}

export async function executeSequenceStep(enrollmentId: string, approvalId?: string): Promise<SequenceEnrollment> {
  if (process.env.AGENT_EXTERNAL_SENDS_ENABLED !== "true") {
    throw new Error("External sequence sends are disabled by policy.");
  }
  if (!approvalId) throw new Error("An exact durable approval is required for an external sequence send.");

  const enrollment = await getEnrollment(enrollmentId);
  if (!enrollment) throw new Error("Enrollment not found.");
  if (enrollment.status !== "active") return enrollment;
  const sequence = await getSequence(enrollment.sequenceId);
  if (!sequence) throw new Error("Sequence not found.");

  const pauseReason = await shouldPauseEnrollment(enrollment, sequence);
  if (pauseReason) return saveEnrollment({ ...enrollment, status: "paused", stopReason: pauseReason });

  const step = sequence.steps.find((candidate) => candidate.order === enrollment.currentStepOrder);
  if (!step) return saveEnrollment({ ...enrollment, status: "completed" });

  const snapshot = await crmAdapter.getSnapshot();
  const contact = snapshot.contacts.find((candidate) => candidate.id === enrollment.contactId);
  if (!contact) throw new Error("Contact not found for enrollment.");
  if (!inAllowedSendWindow()) return saveEnrollment({ ...enrollment, status: "paused", stopReason: "Outside allowed send window." });
  if ((await touchesSentToday(enrollment.contactId)) >= maxTouchesPerContactPerDay) {
    return saveEnrollment({ ...enrollment, status: "paused", stopReason: "Daily touch cap reached for contact." });
  }

  const approvalPayload = {
    action: "sequence_send", enrollmentId, sequenceId: enrollment.sequenceId, stepOrder: step.order,
    channel: step.channel, recipient: contact.email, subject: step.templateSubject, body: step.templateBody,
  };
  await claimAgentApproval(approvalId, approvalPayload);
  try {
    if (step.channel === "social_dm") {
      await socialDmGateway.send({ toHandle: contact.email, provider: "staged", body: step.templateBody });
    } else {
      await emailGateway.send({ to: contact.email, subject: step.templateSubject, body: step.templateBody });
    }
    await completeAgentApproval(approvalId);
  } catch (error) {
    throw error;
  }

  await crmAdapter.addActivity({
    entityType: "contact", entityId: enrollment.contactId, contactId: enrollment.contactId,
    dealId: enrollment.dealId, type: "email_sent", summary: `Sequence step ${step.order} sent via ${step.channel}.`,
  });
  const now = new Date().toISOString();
  return saveEnrollment({ ...enrollment, currentStepOrder: enrollment.currentStepOrder + 1, lastAdvancedAt: now, updatedAt: now });
}

export async function getSequenceSnapshot() {
  const [sequences, enrollments] = await Promise.all([listSequences(), listEnrollments()]);
  return { sequences, enrollments };
}
