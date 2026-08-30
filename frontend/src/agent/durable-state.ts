import { getDb } from "@/lib/db";
import {
  activitiesStore,
  companiesStore,
  contactsStore,
  contractsStore,
  dealSlasStore,
  dealStageHistoryStore,
  dealsStore,
  emailMessagesStore,
  invoicesStore,
  knowledgeStore,
  onboardingTasksStore,
  reportsStore,
  sequenceEnrollmentsStore,
  sequencesStore,
  tasksStore,
  threadsStore,
} from "@/src/agent/store";

type DurableStore = Map<string, unknown>;

function durableStore<T>(store: Map<string, T>): DurableStore {
  return store as unknown as DurableStore;
}

const stores: Array<[string, DurableStore]> = [
  ["companies", durableStore(companiesStore)],
  ["contacts", durableStore(contactsStore)],
  ["threads", durableStore(threadsStore)],
  ["email_messages", durableStore(emailMessagesStore)],
  ["deals", durableStore(dealsStore)],
  ["deal_stage_history", durableStore(dealStageHistoryStore)],
  ["deal_slas", durableStore(dealSlasStore)],
  ["tasks", durableStore(tasksStore)],
  ["activities", durableStore(activitiesStore)],
  ["onboarding_tasks", durableStore(onboardingTasksStore)],
  ["reports", durableStore(reportsStore)],
  ["knowledge", durableStore(knowledgeStore)],
  ["sequences", durableStore(sequencesStore)],
  ["sequence_enrollments", durableStore(sequenceEnrollmentsStore)],
  ["contracts", durableStore(contractsStore)],
  ["invoices", durableStore(invoicesStore)],
];

let stateRequestTail = Promise.resolve();

function findStore(namespace: string): DurableStore | undefined {
  return stores.find(([name]) => name === namespace)?.[1];
}

/** Refreshes process memory from Neon before an agent request reads it. */
export async function hydrateAgentState(): Promise<void> {
  const sql = getDb();
  const rows = await sql`
    SELECT namespace, record_id, record_json
    FROM agent_state_records
    ORDER BY namespace, updated_at ASC
  `;

  for (const [, store] of stores) store.clear();
  for (const row of rows as Array<{ namespace: string; record_id: string; record_json: unknown }>) {
    const store = findStore(row.namespace);
    if (store) store.set(row.record_id, row.record_json);
  }
}

/** Writes the current request state to Neon; records are idempotent by namespace and id. */
export async function persistAgentState(): Promise<void> {
  const sql = getDb();
  for (const [namespace, store] of stores) {
    for (const [recordId, record] of store.entries()) {
      await sql`
        INSERT INTO agent_state_records (namespace, record_id, record_json)
        VALUES (${namespace}, ${recordId}, ${JSON.stringify(record)}::jsonb)
        ON CONFLICT (namespace, record_id) DO UPDATE
        SET record_json = EXCLUDED.record_json, updated_at = NOW()
      `;
    }
  }
}

/** Serializes legacy Map-backed agent requests while they migrate to Neon records. */
export async function beginAgentStateRequest(): Promise<() => Promise<void>> {
  let release!: () => void;
  const previous = stateRequestTail;
  stateRequestTail = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    await hydrateAgentState();
  } catch (error) {
    release();
    throw error;
  }

  return async () => {
    try {
      await persistAgentState();
    } finally {
      release();
    }
  };
}
