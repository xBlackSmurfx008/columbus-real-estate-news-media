#!/usr/bin/env node
/**
 * Coverage calendar CLI — what the daily routine runs.
 *
 * The one proven traffic mechanic on this property is publishing before an
 * event's search spike, not after it. This command answers the only question
 * the 06:33 run needs answered about that: what is due today, what has already
 * slipped, what is coming, and what we have already missed.
 *
 * Subcommands
 *   report   (default) markdown block for briefs/<date>.md, ranked
 *   seed     load content/coverage-calendar/seed.json into the table
 *   sweep    persist the missed transition and print what changed
 *   cover    mark an entry covered by an article
 *   cancel   mark an entry cancelled (the event is off, not missed)
 *
 * Usage:
 *   DATABASE_URL=... node scripts/coverage-calendar.mjs
 *   DATABASE_URL=... node scripts/coverage-calendar.mjs report --json --days 21
 *   DATABASE_URL=... node scripts/coverage-calendar.mjs seed [--dry-run]
 *   DATABASE_URL=... node scripts/coverage-calendar.mjs cover <entry-id> --article <article-id>
 *   DATABASE_URL=... node scripts/coverage-calendar.mjs cancel <entry-id> --reason "..."
 *
 * Flags: --today YYYY-MM-DD pins the date (tests and backfills only);
 *        --no-sweep reports without writing the missed transition.
 */

import { neon } from "@neondatabase/serverless";
import {
  DEFAULT_HORIZON_DAYS,
  buildBriefSection,
  easternToday,
  isIsoDate,
  missedEntries,
  rankEntries,
  selectSlate,
} from "../lib/coverage-calendar.ts";
import { loadSeed } from "./coverage-calendar-seed.mjs";
import {
  ensureCoverageCalendarSchema,
  markCancelled,
  markCovered,
  readCalendar,
  sweepMissed,
  upsertSeedEntry,
} from "./coverage-calendar-store.mjs";

try { process.loadEnvFile?.(".env.local"); } catch { /* env may come from the caller */ }

const argv = process.argv.slice(2);
const positional = argv.filter((arg) => !arg.startsWith("--"));
const command = positional[0] && !positional[0].includes("=") ? positional[0] : "report";

function flag(name) {
  return argv.includes(`--${name}`);
}
function option(name, fallback = null) {
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith("--")) return argv[index + 1];
  const inline = argv.find((arg) => arg.startsWith(`--${name}=`));
  return inline ? inline.slice(name.length + 3) : fallback;
}

const pinnedToday = option("today");
if (pinnedToday && !isIsoDate(pinnedToday)) {
  console.error(`--today must be a YYYY-MM-DD calendar date, got "${pinnedToday}"`);
  process.exit(1);
}
const today = pinnedToday ?? easternToday();

function requireDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  return neon(databaseUrl);
}

async function runSeed() {
  const entries = loadSeed();
  console.log(`Seed file validated: ${entries.length} entries, every one citing an article or a brief.`);
  if (flag("dry-run")) {
    for (const entry of entries) {
      console.log(`  ${entry.event_date}  publish by ${entry.publish_by}  [${entry.lane}] ${entry.headline}`);
    }
    console.log("--dry-run: nothing written.");
    return;
  }
  const sql = requireDatabase();
  await ensureCoverageCalendarSchema(sql);
  let inserted = 0;
  let updated = 0;
  for (const entry of entries) {
    const outcome = await upsertSeedEntry(sql, entry);
    if (outcome === "inserted") inserted += 1;
    else updated += 1;
  }
  console.log(`coverage_calendar: ${inserted} inserted, ${updated} refreshed from the seed file.`);
  const swept = await sweepMissed(sql, today);
  if (swept.length > 0) console.log(`Marked missed on load: ${swept.join(", ")}`);
}

async function runReport() {
  const sql = requireDatabase();
  await ensureCoverageCalendarSchema(sql);
  // A report pinned to a future date is a what-if, so it reads only. The
  // missed count is a real editorial statistic and must not be written by a
  // hypothetical.
  const isHypothetical = today > easternToday();
  if (!flag("no-sweep") && !isHypothetical) {
    const swept = await sweepMissed(sql, today);
    if (swept.length > 0 && !flag("json")) {
      console.log(`# swept to missed: ${swept.join(", ")}`);
    }
  } else if (isHypothetical && !flag("json")) {
    console.log(`# --today ${today} is in the future: reporting only, nothing written.`);
  }
  const entries = await readCalendar(sql);
  const horizonDays = Number(option("days", DEFAULT_HORIZON_DAYS));
  if (!Number.isInteger(horizonDays) || horizonDays < 1) {
    console.error("--days must be a positive integer");
    process.exit(1);
  }

  if (flag("json")) {
    const ranked = rankEntries(entries, today, { horizonDays });
    const slate = selectSlate(ranked);
    process.stdout.write(`${JSON.stringify({
      today,
      timezone: "America/New_York",
      horizonDays,
      counts: {
        total: entries.length,
        overdue: ranked.filter((item) => item.state === "overdue").length,
        due: ranked.filter((item) => item.state === "due").length,
        upcoming: ranked.filter((item) => item.state === "upcoming").length,
        watch: ranked.filter((item) => item.state === "watch").length,
        missed: missedEntries(entries, today).length,
        covered: entries.filter((entry) => entry.status === "covered").length,
      },
      recommended: {
        "real-estate": slate["real-estate"],
        lifestyle: slate.lifestyle,
      },
      ranked,
      missed: missedEntries(entries, today),
    }, null, 2)}\n`);
    return;
  }

  process.stdout.write(buildBriefSection(entries, today, { horizonDays }));
}

async function runSweep() {
  const sql = requireDatabase();
  await ensureCoverageCalendarSchema(sql);
  try {
    const swept = await sweepMissed(sql, today);
    console.log(swept.length === 0 ? "Nothing newly missed." : `Marked missed: ${swept.join(", ")}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function runCover() {
  const entryId = positional[1];
  const articleId = option("article");
  if (!entryId) {
    console.error("Usage: coverage-calendar.mjs cover <entry-id> --article <article-id>");
    process.exit(1);
  }
  const sql = requireDatabase();
  await ensureCoverageCalendarSchema(sql);
  const changed = await markCovered(sql, entryId, { articleId, method: "manual", actor: "cli" });
  console.log(changed ? `Marked covered: ${entryId}` : `No change: ${entryId} is unknown or already covered.`);
}

async function runCancel() {
  const entryId = positional[1];
  if (!entryId) {
    console.error('Usage: coverage-calendar.mjs cancel <entry-id> --reason "why"');
    process.exit(1);
  }
  const sql = requireDatabase();
  await ensureCoverageCalendarSchema(sql);
  const changed = await markCancelled(sql, entryId, option("reason"));
  console.log(changed ? `Marked cancelled: ${entryId}` : `No change: ${entryId} is unknown or already cancelled.`);
}

const COMMANDS = { report: runReport, seed: runSeed, sweep: runSweep, cover: runCover, cancel: runCancel };

if (!COMMANDS[command]) {
  console.error(`Unknown command "${command}". Try: ${Object.keys(COMMANDS).join(", ")}`);
  process.exit(1);
}

await COMMANDS[command]();
