import { getDb } from "@/lib/db";
import {
  knowledgeStore,
} from "@/src/agent/store";

type DurableStore = Map<string, unknown>;

function durableStore<T>(store: Map<string, T>): DurableStore {
  return store as unknown as DurableStore;
}

const stores: Array<[string, DurableStore]> = [
  ["knowledge", durableStore(knowledgeStore)],
];

let stateRequestTail = Promise.resolve();

type StateBaseline = Map<string, Map<string, string>>;

function serialized(value: unknown): string {
  return JSON.stringify(value) ?? "null";
}

function findStore(namespace: string): DurableStore | undefined {
  return stores.find(([name]) => name === namespace)?.[1];
}

/** Refreshes process memory from Neon before an agent request reads it. */
export async function hydrateAgentState(): Promise<StateBaseline> {
  const sql = getDb();
  const rows = await sql`
    SELECT namespace, record_id, record_json
    FROM agent_state_records
    ORDER BY namespace, updated_at ASC
  `;

  for (const [, store] of stores) store.clear();
  const baseline: StateBaseline = new Map();
  for (const row of rows as Array<{ namespace: string; record_id: string; record_json: unknown }>) {
    const store = findStore(row.namespace);
    if (store) store.set(row.record_id, row.record_json);
    if (!baseline.has(row.namespace)) baseline.set(row.namespace, new Map());
    baseline.get(row.namespace)?.set(row.record_id, serialized(row.record_json));
  }
  return baseline;
}

/** Writes only request changes and refuses to overwrite a concurrent instance. */
export async function persistAgentState(baseline: StateBaseline): Promise<void> {
  const sql = getDb();
  for (const [namespace, store] of stores) {
    for (const [recordId, record] of store.entries()) {
      const currentJson = serialized(record);
      const baselineJson = baseline.get(namespace)?.get(recordId);
      if (baselineJson === currentJson) continue;

      const rows = baselineJson
        ? await sql`
        UPDATE agent_state_records
        SET record_json = ${currentJson}::jsonb, updated_at = NOW()
        WHERE namespace = ${namespace}
          AND record_id = ${recordId}
          AND record_json = ${baselineJson}::jsonb
        RETURNING record_id
      `
        : await sql`
        INSERT INTO agent_state_records (namespace, record_id, record_json)
        VALUES (${namespace}, ${recordId}, ${currentJson}::jsonb)
        ON CONFLICT (namespace, record_id) DO UPDATE
        SET record_json = agent_state_records.record_json
        WHERE agent_state_records.record_json = EXCLUDED.record_json
        RETURNING record_id
      `;
      if (!rows[0]) {
        throw new Error(`Concurrent agent state conflict: ${namespace}/${recordId}`);
      }
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
  let baseline: StateBaseline;
  try {
    baseline = await hydrateAgentState();
  } catch (error) {
    release();
    throw error;
  }

  return async () => {
    try {
      await persistAgentState(baseline);
    } finally {
      release();
    }
  };
}
