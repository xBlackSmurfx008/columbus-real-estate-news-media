#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";
import {
  completeNewsroomRun,
  recordRunFailure,
  startNewsroomRun,
} from "./newsroom-run-store.mjs";

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const command = process.argv[2];
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_NOT_CONFIGURED");
if (!['start', 'complete', 'fail'].includes(command)) {
  console.error("Usage: node scripts/newsroom-run.mjs <start|complete|fail> [--run-id <id>] [--source <name>] [--story-result <result>] [--reason <text>]");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
let result;
if (command === 'start') {
  result = await startNewsroomRun(sql, {
    runId: arg('run-id'),
    source: arg('source') ?? 'claude-cloud',
  });
} else {
  const runId = arg('run-id');
  if (!runId) throw new Error("RUN_ID_REQUIRED");
  result = command === 'complete'
    ? await completeNewsroomRun(sql, runId, { storyResult: arg('story-result') })
    : await recordRunFailure(sql, runId, arg('reason') ?? 'UNSPECIFIED_FAILURE');
}

process.stdout.write(`${JSON.stringify({ ok: true, run: result })}\n`);
