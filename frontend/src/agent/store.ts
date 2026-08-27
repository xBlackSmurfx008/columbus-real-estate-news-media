import type {
  AgentReport,
  Company,
  Contract,
  CRMActivity,
  CRMTask,
  Contact,
  Deal,
  DealSla,
  DealStageHistory,
  EmailMessage,
  EmailThread,
  Invoice,
  KnowledgeEntry,
  OnboardingTask,
  Sequence,
  SequenceEnrollment,
} from "@/src/agent/types";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const companiesStore = new Map<string, Company>();
export const contactsStore = new Map<string, Contact>();
export const threadsStore = new Map<string, EmailThread>();
export const emailMessagesStore = new Map<string, EmailMessage>();
export const dealsStore = new Map<string, Deal>();
export const dealStageHistoryStore = new Map<string, DealStageHistory>();
export const dealSlasStore = new Map<string, DealSla>();
export const tasksStore = new Map<string, CRMTask>();
export const activitiesStore = new Map<string, CRMActivity>();
export const onboardingTasksStore = new Map<string, OnboardingTask>();
export const reportsStore = new Map<string, AgentReport>();
export const knowledgeStore = new Map<string, KnowledgeEntry>();
export const sequencesStore = new Map<string, Sequence>();
export const sequenceEnrollmentsStore = new Map<string, SequenceEnrollment>();
export const contractsStore = new Map<string, Contract>();
export const invoicesStore = new Map<string, Invoice>();

let idCounter = 0;
let hydrated = false;
const STORE_PATH = process.env.AGENT_STORE_PATH || join(process.cwd(), ".runtime", "agent-store.json");
const SHOULD_PERSIST = process.env.NODE_ENV !== "production" || Boolean(process.env.AGENT_STORE_PATH);

type SerializedStore = {
  idCounter: number;
  companiesStore: Company[];
  contactsStore: Contact[];
  threadsStore: EmailThread[];
  emailMessagesStore: EmailMessage[];
  dealsStore: Deal[];
  dealStageHistoryStore: DealStageHistory[];
  dealSlasStore: DealSla[];
  tasksStore: CRMTask[];
  activitiesStore: CRMActivity[];
  onboardingTasksStore: OnboardingTask[];
  reportsStore: AgentReport[];
  knowledgeStore: KnowledgeEntry[];
  sequencesStore: Sequence[];
  sequenceEnrollmentsStore: SequenceEnrollment[];
  contractsStore: Contract[];
  invoicesStore: Invoice[];
};

function setStoreValues<T extends { id: string }>(store: Map<string, T>, items: T[]): void {
  store.clear();
  items.forEach((item) => store.set(item.id, item));
}

function toSerializedStore(): SerializedStore {
  return {
    idCounter,
    companiesStore: [...companiesStore.values()],
    contactsStore: [...contactsStore.values()],
    threadsStore: [...threadsStore.values()],
    emailMessagesStore: [...emailMessagesStore.values()],
    dealsStore: [...dealsStore.values()],
    dealStageHistoryStore: [...dealStageHistoryStore.values()],
    dealSlasStore: [...dealSlasStore.values()],
    tasksStore: [...tasksStore.values()],
    activitiesStore: [...activitiesStore.values()],
    onboardingTasksStore: [...onboardingTasksStore.values()],
    reportsStore: [...reportsStore.values()],
    knowledgeStore: [...knowledgeStore.values()],
    sequencesStore: [...sequencesStore.values()],
    sequenceEnrollmentsStore: [...sequenceEnrollmentsStore.values()],
    contractsStore: [...contractsStore.values()],
    invoicesStore: [...invoicesStore.values()],
  };
}

function persistStore(): void {
  if (!SHOULD_PERSIST) return;
  const dir = dirname(STORE_PATH);
  if (!existsSync(/* turbopackIgnore: true */ dir)) {
    mkdirSync(/* turbopackIgnore: true */ dir, { recursive: true });
  }
  writeFileSync(
    /* turbopackIgnore: true */ STORE_PATH,
    JSON.stringify(toSerializedStore(), null, 2),
    "utf8"
  );
}

export function hydrateStore(): void {
  if (hydrated) return;
  hydrated = true;
  if (!SHOULD_PERSIST || !existsSync(/* turbopackIgnore: true */ STORE_PATH)) return;
  try {
    const data = JSON.parse(
      readFileSync(/* turbopackIgnore: true */ STORE_PATH, "utf8")
    ) as Partial<SerializedStore>;
    idCounter = data.idCounter || 0;
    setStoreValues(companiesStore, data.companiesStore || []);
    setStoreValues(contactsStore, data.contactsStore || []);
    setStoreValues(threadsStore, data.threadsStore || []);
    setStoreValues(emailMessagesStore, data.emailMessagesStore || []);
    setStoreValues(dealsStore, data.dealsStore || []);
    setStoreValues(dealStageHistoryStore, data.dealStageHistoryStore || []);
    setStoreValues(dealSlasStore, data.dealSlasStore || []);
    setStoreValues(tasksStore, data.tasksStore || []);
    setStoreValues(activitiesStore, data.activitiesStore || []);
    setStoreValues(onboardingTasksStore, data.onboardingTasksStore || []);
    setStoreValues(reportsStore, data.reportsStore || []);
    setStoreValues(knowledgeStore, data.knowledgeStore || []);
    setStoreValues(sequencesStore, data.sequencesStore || []);
    setStoreValues(sequenceEnrollmentsStore, data.sequenceEnrollmentsStore || []);
    setStoreValues(contractsStore, data.contractsStore || []);
    setStoreValues(invoicesStore, data.invoicesStore || []);
  } catch {
    // If persisted state is malformed, start cleanly.
  }
}

export function nextId(prefix: string): string {
  hydrateStore();
  idCounter += 1;
  persistStore();
  return `${prefix}_${idCounter}_${Date.now()}`;
}

export function upsert<T extends { id: string }>(store: Map<string, T>, value: T): T {
  hydrateStore();
  store.set(value.id, value);
  persistStore();
  return value;
}

export function listValues<T>(store: Map<string, T>): T[] {
  hydrateStore();
  return [...store.values()];
}

hydrateStore();
