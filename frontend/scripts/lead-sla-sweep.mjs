#!/usr/bin/env node
/**
 * Standalone lead-SLA sweep, for the daily cloud routine or a manual check.
 * Identical logic to the /api/cron/lead-sla endpoint — both call runSlaSweep.
 *
 * Usage:
 *   DATABASE_URL=... node --experimental-strip-types scripts/lead-sla-sweep.mjs
 *   DATABASE_URL=... node --experimental-strip-types scripts/lead-sla-sweep.mjs --dry-run
 *
 * Exit code is 0 when nothing is breached, 1 when a real inquiry has blown the
 * one-business-day promise, so it can gate a routine step.
 */

import { neon } from "@neondatabase/serverless";
import { runSlaSweep } from "../lib/inquiry-sla-sweep.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const sql = neon(databaseUrl);
const result = await runSlaSweep(sql, { dryRun });

console.log(JSON.stringify(result, null, 2));
if (dryRun) console.log("(dry run: no alerts were recorded or delivered)");

process.exit(result.breached > 0 ? 1 : 0);
