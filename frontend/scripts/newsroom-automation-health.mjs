#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";
import { loadNewsroomHealth } from "./newsroom-health-store.mjs";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_NOT_CONFIGURED");
const sql = neon(process.env.DATABASE_URL);

const report = await loadNewsroomHealth(sql);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
