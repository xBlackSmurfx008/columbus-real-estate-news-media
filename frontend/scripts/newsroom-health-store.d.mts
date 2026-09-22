import type { SqlClient } from '../src/agent/repositories/jobs';
import type { NewsroomHealthReport } from './newsroom-run-policy.mjs';
export function loadNewsroomHealth(sql: SqlClient, options?: {
  now?: Date; env?: Record<string, string | undefined>;
}): Promise<NewsroomHealthReport>;
