#!/usr/bin/env node
// Per-partner outbound / affiliate performance, printed as markdown.
//
// A thin CLI over scripts/affiliate-report-lib.mjs. The weekly scorecard and
// the KPI report can import that library directly instead of shelling out.
//
// Usage: DATABASE_URL=... node scripts/affiliate-report.mjs [--window 30]

import { neon } from "@neondatabase/serverless";
import {
  affiliatePerformance,
  affiliateProgramStatus,
  formatAffiliateReport,
} from "./affiliate-report-lib.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const windowIndex = process.argv.indexOf("--window");
const windowDays =
  windowIndex >= 0 && Number.isFinite(Number(process.argv[windowIndex + 1]))
    ? Math.max(1, Math.trunc(Number(process.argv[windowIndex + 1])))
    : 30;

const sql = neon(databaseUrl);

const [performance, programs] = await Promise.all([
  affiliatePerformance(sql, { windowDays }),
  affiliateProgramStatus(sql),
]);

console.log(formatAffiliateReport(performance, programs));
