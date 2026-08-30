import { emailGateway } from "@/src/agent/integrations/email";
import { crmAdapter } from "@/src/agent/integrations/crm";
import { claimAgentApproval, completeAgentApproval } from "@/src/agent/durable-store";
import { nextId, sequenceEnrollmentsStore, sequencesStore, upsert } from "@/src/agent/store";
import type { Sequence, SequenceEnrollment } from "@/src/agent/types";
import { socialDmGateway } from "@/src/agent/integrations/socialDm";
import { listThreads } from "@/src/agent/repositories/inbox";

const maxTouchesPerContactPerDay = Number(process.env.AGENT_MAX_TOUCHES_PER_CONTACT_PER_DAY || 2);
const sendWindowStartHour = Number(process.env.AGENT_SEND_WINDOW_START_HOUR || 9);
const sendWindowEndHour = Number(process.env.AGENT_SEND_WINDOW_END_HOUR || 18);

export function upsertSequence(input: Omit<Sequence, "id" | "createdAt" | "updatedAt"> & Partial<Sequence>): Sequence {
  const now = new Date().toISOString();
  if (input.id && sequencesStore.has(input.id)) {
    const current = sequencesStore.get(input.id);
    if (!current) throw new Error("Sequence not found.");
    return upsert(sequencesStore, {
      ...current,
      ...input,
      updatedAt: now,
    });
  }
  return upsert(sequencesStore, {
    id: nextId("sequence"),
    name: input.name,
    stopOnReply: input.stopOnReply,
    stopOnMeetingBooked: input.stopOnMeetingBooked,
    steps: input.steps,
    createdAt: now,
    updatedAt: now,
  });
}

export function enrollSequence(input: Pick<SequenceEnrollment, "sequenceId" | "contactId"> & Partial<SequenceEnrollment>): SequenceEnrollment {
  const now = new Date().toISOString();
  const enrollment: SequenceEnrollment = {
    id: nextId("enrollment"),
    sequenceId: input.sequenceId,
    contactId: input.contactId,
    dealId: input.dealId,
    currentStepOrder: 1,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  return upsert(sequenceEnrollmentsStore, enrollment);
}

async function shouldPauseEnrollment(enrollment: SequenceEnrollment, sequence: Sequence): Promise<string | undefined> {
  if (sequence.stopOnReply) {
    const hasReply = (await listThreads()).some(
      (thread) =>
        thread.contactId === enrollment.contactId &&
        (thread.status === "received" || thread.status === "pending_approval"),
    );
    if (hasReply) return "Paused due to inbound reply.";
  }
  if (sequence.stopOnMeetingBooked) {
    const meetingBooked = (await crmAdapter.getSnapshot())
      .activities.some(
        (activity) =>
          activity.contactId === enrollment.contactId && activity.type === "meeting_scheduled",
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
  return (await crmAdapter.getSnapshot())
    .activities.filter((a) => {
      if (a.contactId !== contactId || a.type !== "email_sent") return false;
      const created = new Date(a.createdAt);
      return (
        created.getFullYear() === now.getFullYear() &&
        created.getMonth() === now.getMonth() &&
        created.getDate() === now.getDate()
      );
    }).length;
}

export async function executeSequenceStep(
  enrollmentId: string,
  approvalId?: string,
): Promise<SequenceEnrollment> {
  if (process.env.AGENT_EXTERNAL_SENDS_ENABLED !== "true") {
    throw new Error("External sequence sends are disabled by policy.");
  }
  if (!approvalId) {
    throw new Error("An exact durable approval is required for an external sequence send.");
  }

  const enrollment = sequenceEnrollmentsStore.get(enrollmentId);
  if (!enrollment) throw new Error("Enrollment not found.");
  if (enrollment.status !== "active") return enrollment;

  const sequence = sequencesStore.get(enrollment.sequenceId);
  if (!sequence) throw new Error("Sequence not found.");

  const pauseReason = await shouldPauseEnrollment(enrollment, sequence);
  if (pauseReason) {
    enrollment.status = "paused";
    enrollment.stopReason = pauseReason;
    enrollment.updatedAt = new Date().toISOString();
    return upsert(sequenceEnrollmentsStore, enrollment);
  }

  const step = sequence.steps.find((candidate) => candidate.order === enrollment.currentStepOrder);
  if (!step) {
    enrollment.status = "completed";
    enrollment.updatedAt = new Date().toISOString();
    return upsert(sequenceEnrollmentsStore, enrollment);
  }

  const contact = (await crmAdapter.getSnapshot()).contacts.find((candidate) => candidate.id === enrollment.contactId);
  if (!contact) throw new Error("Contact not found for enrollment.");

  if (!inAllowedSendWindow()) {
    enrollment.status = "paused";
    enrollment.stopReason = "Outside allowed send window.";
    enrollment.updatedAt = new Date().toISOString();
    return upsert(sequenceEnrollmentsStore, enrollment);
  }

  if ((await touchesSentToday(enrollment.contactId)) >= maxTouchesPerContactPerDay) {
    enrollment.status = "paused";
    enrollment.stopReason = "Daily touch cap reached for contact.";
    enrollment.updatedAt = new Date().toISOString();
    return upsert(sequenceEnrollmentsStore, enrollment);
  }

  const approvalPayload = {
    action: "sequence_send",
    enrollmentId,
    sequenceId: enrollment.sequenceId,
    stepOrder: step.order,
    channel: step.channel,
    recipient: contact.email,
    subject: step.templateSubject,
    body: step.templateBody,
  };
  await claimAgentApproval(approvalId, approvalPayload);

  try {
    if (step.channel === "social_dm") {
      await socialDmGateway.send({
        toHandle: contact.email,
        provider: "staged",
        body: step.templateBody,
      });
    } else {
      await emailGateway.send({
        to: contact.email,
        subject: step.templateSubject,
        body: step.templateBody,
      });
    }
    await completeAgentApproval(approvalId);
  } catch (error) {
    // Keep the approval in executing state when provider delivery is uncertain;
    // this prevents a retry from sending the same message twice.
    throw error;
  }

  await crmAdapter.addActivity({
    entityType: "contact",
    entityId: enrollment.contactId,
    contactId: enrollment.contactId,
    dealId: enrollment.dealId,
    type: "email_sent",
    summary: `Sequence step ${step.order} sent via ${step.channel}.`,
  });

  enrollment.currentStepOrder += 1;
  enrollment.lastAdvancedAt = new Date().toISOString();
  enrollment.updatedAt = enrollment.lastAdvancedAt;
  return upsert(sequenceEnrollmentsStore, enrollment);
}

export function getSequenceSnapshot() {
  return {
    sequences: [...sequencesStore.values()],
    enrollments: [...sequenceEnrollmentsStore.values()],
  };
}
