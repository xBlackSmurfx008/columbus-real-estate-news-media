#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";
import { ensureNewsroomRunTable } from "./newsroom-run-store.mjs";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_NOT_CONFIGURED");
const sql = neon(process.env.DATABASE_URL);
if (process.argv.includes('--check')) {
  const [result] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'newsroom_runs'
    ) AS installed
  `;
  process.stdout.write(`${JSON.stringify({ ok: true, migration: 'newsroom_runs', mode: 'check', installed: result.installed })}\n`);
} else {
  await ensureNewsroomRunTable(sql);
  process.stdout.write(`${JSON.stringify({ ok: true, migration: 'newsroom_runs', mode: 'apply' })}\n`);
}
