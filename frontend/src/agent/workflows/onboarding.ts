import { crmAdapter } from "@/src/agent/integrations/crm";
import {
  dealsStore,
  listValues,
  nextId,
  onboardingTasksStore,
  upsert,
} from "@/src/agent/store";
import type { Deal, OnboardingTask, OnboardingTaskType } from "@/src/agent/types";

const defaultTaskTypes: OnboardingTaskType[] = [
  "intake_form",
  "asset_collection",
  "creative_timeline",
  "launch_date_confirmation",
  "reporting_setup",
];

function dueDateFromNow(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString();
}

export function createOnboardingTasksForDeal(dealId: string): OnboardingTask[] {
  const deal = dealsStore.get(dealId);
  if (!deal) throw new Error("Deal not found.");
  if (deal.stage !== "won") throw new Error("Onboarding starts only when deal stage is won.");

  const existing = listValues(onboardingTasksStore).filter((task) => task.dealId === dealId);
  if (existing.length > 0) return existing;

  const now = new Date().toISOString();
  const tasks = defaultTaskTypes.map((type, i) => {
    const task: OnboardingTask = {
      id: nextId("onboarding"),
      dealId,
      type,
      status: "pending",
      dueAt: dueDateFromNow(i + 1),
      createdAt: now,
      updatedAt: now,
    };
    upsert(onboardingTasksStore, task);
    return task;
  });

  crmAdapter.addActivity({
    entityType: "deal",
    entityId: deal.id,
    contactId: deal.primaryContactId,
    dealId: deal.id,
    type: "onboarding_update",
    summary: `Onboarding initialized with ${tasks.length} tasks.`,
  });
  return tasks;
}

export function updateOnboardingTask(
  taskId: string,
  status: "pending" | "in_progress" | "completed",
  notes?: string,
): OnboardingTask {
  const task = onboardingTasksStore.get(taskId);
  if (!task) throw new Error("Onboarding task not found.");
  task.status = status;
  task.notes = notes || task.notes;
  task.updatedAt = new Date().toISOString();
  return upsert(onboardingTasksStore, task);
}

export function getOnboardingSnapshot(dealId?: string): {
  deals: Deal[];
  tasks: OnboardingTask[];
} {
  const deals = listValues(dealsStore);
  const tasks = listValues(onboardingTasksStore).filter((task) =>
    dealId ? task.dealId === dealId : true,
  );
  return { deals, tasks };
}
