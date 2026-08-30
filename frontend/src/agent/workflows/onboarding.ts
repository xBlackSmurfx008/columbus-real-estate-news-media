import { crmAdapter } from "@/src/agent/integrations/crm";
import type { Deal, OnboardingTask, OnboardingTaskType } from "@/src/agent/types";
import { listOnboardingTasks, saveOnboardingTask } from "@/src/agent/repositories/onboarding";

const defaultTaskTypes: OnboardingTaskType[] = [
  "intake_form", "asset_collection", "creative_timeline", "launch_date_confirmation", "reporting_setup",
];

function dueDateFromNow(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString();
}

export async function createOnboardingTasksForDeal(dealId: string): Promise<OnboardingTask[]> {
  const deal = (await crmAdapter.getSnapshot()).deals.find((candidate) => candidate.id === dealId);
  if (!deal) throw new Error("Deal not found.");
  if (deal.stage !== "won") throw new Error("Onboarding starts only when deal stage is won.");
  const existing = await listOnboardingTasks(dealId);
  if (existing.length > 0) return existing;

  const now = new Date().toISOString();
  const tasks = await Promise.all(defaultTaskTypes.map((type, index) => saveOnboardingTask({
    dealId, type, status: "pending", dueAt: dueDateFromNow(index + 1), createdAt: now,
  })));
  await crmAdapter.addActivity({
    entityType: "deal", entityId: deal.id, contactId: deal.primaryContactId, dealId: deal.id,
    type: "onboarding_update", summary: `Onboarding initialized with ${tasks.length} tasks.`,
  });
  return tasks;
}

export async function updateOnboardingTask(taskId: string, status: "pending" | "in_progress" | "completed", notes?: string): Promise<OnboardingTask> {
  const task = (await listOnboardingTasks()).find((candidate) => candidate.id === taskId);
  if (!task) throw new Error("Onboarding task not found.");
  return saveOnboardingTask({ ...task, status, notes: notes || task.notes });
}

export async function getOnboardingSnapshot(dealId?: string): Promise<{ deals: Deal[]; tasks: OnboardingTask[] }> {
  const [deals, tasks] = await Promise.all([
    crmAdapter.getSnapshot().then((snapshot) => snapshot.deals),
    listOnboardingTasks(dealId),
  ]);
  return { deals, tasks };
}
