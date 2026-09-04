/**
 * Coverage calendar — database access.
 *
 * Pure date and ranking logic lives in `lib/coverage-calendar.ts`; this file is
 * only the storage layer, shared by the CLI (`scripts/coverage-calendar.mjs`)
 * and the publish path (`scripts/publish-article.mjs`).
 *
 * DESIGN RULE, inherited from scripts/publication-gate-log.mjs:
 * a calendar write must NEVER change a publication decision. Every function
 * the publish path calls is wrapped, swallows its own failure, reports to
 * stderr, and returns a plain result object the caller is free to ignore.
 */

import {
  classifyEntry,
  computePublishBy,
  easternToday,
  matchEntriesForArticle,
} from "../lib/coverage-calendar.ts";

export const CALENDAR_TABLE = "coverage_calendar";
export const CALENDAR_EVENTS_TABLE = "coverage_calendar_events";

/**
 * Create the tables if they are absent. Additive only: no ALTER, no DROP.
 * Returns the list of objects it actually created so the migration can report
 * honestly instead of claiming work it skipped.
 */
export async function ensureCoverageCalendarSchema(sql, { verbose = false } = {}) {
  const created = [];
  const log = (message) => {
    if (verbose) console.log(message);
  };

  const [{ exists: hasTable }] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${CALENDAR_TABLE}
    ) AS exists
  `;
  if (!hasTable) {
    // event_date is DATE, not TIMESTAMPTZ, deliberately. These are calendar
    // dates in Columbus, not instants; storing them as timestamps is how a
    // Sept. 22 hearing becomes a Sept. 21 hearing for a UTC reader.
    await sql`
      CREATE TABLE coverage_calendar (
        id TEXT PRIMARY KEY,
        event_date DATE NOT NULL,
        date_precision TEXT NOT NULL DEFAULT 'day'
          CHECK (date_precision IN ('day', 'month', 'quarter')),
        confidence TEXT NOT NULL DEFAULT 'reported'
          CHECK (confidence IN ('confirmed', 'reported', 'unconfirmed')),
        headline TEXT NOT NULL,
        summary TEXT,
        area_slug TEXT,
        area_label TEXT NOT NULL,
        lane TEXT NOT NULL CHECK (lane IN ('real-estate', 'lifestyle')),
        neighborhood_candidate BOOLEAN NOT NULL DEFAULT false,
        lead_days INT NOT NULL DEFAULT 2 CHECK (lead_days >= 0),
        publish_by DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'upcoming'
          CHECK (status IN ('upcoming', 'covered', 'missed', 'cancelled')),
        priority INT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
        source_url TEXT,
        source_label TEXT,
        source_article_id TEXT,
        source_brief TEXT,
        note TEXT,
        match_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
        covered_by_article_id TEXT,
        covered_at TIMESTAMPTZ,
        missed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        -- Provenance is not optional on a journalism property: an entry with
        -- no article and no brief behind it cannot exist in this table.
        CONSTRAINT coverage_calendar_has_provenance CHECK (
          coalesce(trim(source_article_id), '') <> '' OR coalesce(trim(source_brief), '') <> ''
        ),
        CONSTRAINT coverage_calendar_publish_by_ordering CHECK (publish_by <= event_date)
      )
    `;
    created.push(CALENDAR_TABLE);
    log(`created: table ${CALENDAR_TABLE}`);
  } else {
    log(`skip: table ${CALENDAR_TABLE} exists`);
  }

  const [{ exists: hasEvents }] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${CALENDAR_EVENTS_TABLE}
    ) AS exists
  `;
  if (!hasEvents) {
    await sql`
      CREATE TABLE coverage_calendar_events (
        id BIGSERIAL PRIMARY KEY,
        entry_id TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT NOT NULL DEFAULT 'system',
        detail JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    created.push(CALENDAR_EVENTS_TABLE);
    log(`created: table ${CALENDAR_EVENTS_TABLE}`);
  } else {
    log(`skip: table ${CALENDAR_EVENTS_TABLE} exists`);
  }

  for (const [name, ddl] of [
    [
      "coverage_calendar_due_idx",
      "CREATE INDEX coverage_calendar_due_idx ON coverage_calendar (publish_by ASC) WHERE status = 'upcoming'",
    ],
    ["coverage_calendar_event_idx", "CREATE INDEX coverage_calendar_event_idx ON coverage_calendar (event_date ASC)"],
    [
      "coverage_calendar_events_entry_idx",
      "CREATE INDEX coverage_calendar_events_entry_idx ON coverage_calendar_events (entry_id, created_at DESC)",
    ],
  ]) {
    const rows = await sql`SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = ${name}`;
    if (rows.length > 0) {
      log(`skip: index ${name} exists`);
      continue;
    }
    await sql.query(ddl);
    created.push(name);
    log(`created: index ${name}`);
  }

  return { created };
}

function toIsoDate(value) {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  // node-postgres/neon hand back a Date for DATE columns. Use the UTC parts —
  // the driver builds that Date at UTC midnight, so local getters would shift
  // the day west of Greenwich.
  const pad = (n) => String(n).padStart(2, "0");
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}

function rowToEntry(row) {
  return {
    id: row.id,
    event_date: toIsoDate(row.event_date),
    date_precision: row.date_precision,
    confidence: row.confidence,
    headline: row.headline,
    summary: row.summary ?? null,
    area_slug: row.area_slug ?? null,
    area_label: row.area_label,
    lane: row.lane,
    neighborhood_candidate: row.neighborhood_candidate === true,
    lead_days: Number(row.lead_days),
    publish_by: toIsoDate(row.publish_by),
    status: row.status,
    priority: Number(row.priority),
    source_url: row.source_url ?? null,
    source_label: row.source_label ?? null,
    source_article_id: row.source_article_id ?? null,
    source_brief: row.source_brief ?? null,
    note: row.note ?? null,
    match_keywords: Array.isArray(row.match_keywords) ? row.match_keywords : [],
    covered_by_article_id: row.covered_by_article_id ?? null,
    covered_at: row.covered_at ? new Date(row.covered_at).toISOString() : null,
  };
}

export async function readCalendar(sql) {
  const rows = await sql`SELECT * FROM coverage_calendar ORDER BY event_date ASC, id ASC`;
  return rows.map(rowToEntry);
}

export async function recordCalendarEvent(sql, entryId, action, detail = {}, actor = "system") {
  await sql`
    INSERT INTO coverage_calendar_events (entry_id, action, actor, detail)
    VALUES (${entryId}, ${action}, ${actor}, ${JSON.stringify(detail ?? {})}::jsonb)
  `;
}

/**
 * Insert or refresh one entry from the committed seed.
 *
 * Editorial fields (dates, sourcing, wording) are owned by the seed file and
 * are overwritten on every run — that is what makes the git diff the source of
 * truth for provenance. Operational fields (status, covered_by_article_id,
 * covered_at, missed_at) are owned by the newsroom and are never clobbered by
 * a reseed, or re-running the seed would erase the record of what we covered.
 */
export async function upsertSeedEntry(sql, entry) {
  const [row] = await sql`
    INSERT INTO coverage_calendar (
      id, event_date, date_precision, confidence, headline, summary,
      area_slug, area_label, lane, neighborhood_candidate, lead_days, publish_by,
      status, priority, source_url, source_label, source_article_id, source_brief,
      note, match_keywords
    ) VALUES (
      ${entry.id}, ${entry.event_date}, ${entry.date_precision}, ${entry.confidence},
      ${entry.headline}, ${entry.summary}, ${entry.area_slug}, ${entry.area_label},
      ${entry.lane}, ${entry.neighborhood_candidate}, ${entry.lead_days}, ${entry.publish_by},
      ${entry.status}, ${entry.priority}, ${entry.source_url}, ${entry.source_label},
      ${entry.source_article_id}, ${entry.source_brief}, ${entry.note},
      ${JSON.stringify(entry.match_keywords)}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      event_date = EXCLUDED.event_date,
      date_precision = EXCLUDED.date_precision,
      confidence = EXCLUDED.confidence,
      headline = EXCLUDED.headline,
      summary = EXCLUDED.summary,
      area_slug = EXCLUDED.area_slug,
      area_label = EXCLUDED.area_label,
      lane = EXCLUDED.lane,
      neighborhood_candidate = EXCLUDED.neighborhood_candidate,
      lead_days = EXCLUDED.lead_days,
      publish_by = EXCLUDED.publish_by,
      priority = EXCLUDED.priority,
      source_url = EXCLUDED.source_url,
      source_label = EXCLUDED.source_label,
      source_article_id = EXCLUDED.source_article_id,
      source_brief = EXCLUDED.source_brief,
      note = EXCLUDED.note,
      match_keywords = EXCLUDED.match_keywords,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted
  `;
  return row?.inserted === true ? "inserted" : "updated";
}

/**
 * Persist the missed transition for every day-precision entry whose date has
 * passed with nothing published. Idempotent: a row already marked missed is
 * left alone, so `missed_at` records when we first noticed, not when we last
 * ran the report.
 *
 * Refuses a `today` in the future. `--today` exists so a report can be
 * reproduced for a past date; letting it run forward would let one command
 * write "missed" against events that have not happened, and the missed count
 * is the number that tells us whether any of this is working.
 */
export async function sweepMissed(sql, today = easternToday()) {
  const actualToday = easternToday();
  if (today > actualToday) {
    throw new RangeError(
      `Refusing to sweep with a future date (${today} > ${actualToday}): that would record misses for events that have not happened.`,
    );
  }
  const entries = await readCalendar(sql);
  const newlyMissed = entries.filter(
    (entry) => entry.status === "upcoming" && classifyEntry(entry, today) === "missed",
  );
  for (const entry of newlyMissed) {
    await sql`
      UPDATE coverage_calendar
      SET status = 'missed', missed_at = NOW(), updated_at = NOW()
      WHERE id = ${entry.id} AND status = 'upcoming'
    `;
    await recordCalendarEvent(sql, entry.id, "missed", {
      event_date: entry.event_date,
      publish_by: entry.publish_by,
      observed_on: today,
    });
  }
  return newlyMissed.map((entry) => entry.id);
}

/** Mark one entry covered. Idempotent; the first article to claim it wins. */
export async function markCovered(sql, entryId, { articleId, method = "manual", actor = "system" }) {
  const rows = await sql`
    UPDATE coverage_calendar
    SET status = 'covered',
        covered_by_article_id = ${articleId ?? null},
        covered_at = NOW(),
        updated_at = NOW()
    WHERE id = ${entryId} AND status <> 'covered'
    RETURNING id
  `;
  if (rows.length === 0) return false;
  await recordCalendarEvent(sql, entryId, "covered", { article_id: articleId ?? null, method }, actor);
  return true;
}

export async function markCancelled(sql, entryId, reason) {
  const rows = await sql`
    UPDATE coverage_calendar
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${entryId} AND status <> 'cancelled'
    RETURNING id
  `;
  if (rows.length === 0) return false;
  await recordCalendarEvent(sql, entryId, "cancelled", { reason: reason ?? null });
  return true;
}

/**
 * Close the loop from the publish path.
 *
 * NEVER THROWS AND NEVER RETURNS ANYTHING THE CALLER MUST BRANCH ON. The gate
 * has already decided by the time this runs; this only records what happened.
 *
 * Matching is deliberately conservative, because a wrong "covered" mark hides
 * a real miss. An explicit `coverage_calendar_id` on the submission always
 * wins. Otherwise every one of an entry's seeded keywords must appear in the
 * article, and the article must publish inside the entry's window; if that
 * leaves more than one candidate, nothing is marked and the ambiguity is
 * reported so a human can resolve it.
 */
export async function closeCalendarLoop(sql, { articleId, title, body, publishedOn, explicitEntryId = null }) {
  try {
    const [{ exists }] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${CALENDAR_TABLE}
      ) AS exists
    `;
    if (!exists) return { status: "unavailable", entryIds: [] };

    const entries = await readCalendar(sql);
    if (explicitEntryId) {
      const target = entries.find((entry) => entry.id === explicitEntryId);
      if (!target) return { status: "unknown-id", entryIds: [], explicitEntryId };
      const changed = await markCovered(sql, explicitEntryId, { articleId, method: "explicit" });
      return { status: changed ? "covered" : "already-covered", entryIds: [explicitEntryId] };
    }

    const day = publishedOn ?? easternToday();
    const matches = matchEntriesForArticle(entries, { title, body, publishedOn: day });
    if (matches.length === 0) return { status: "no-match", entryIds: [] };
    if (matches.length > 1) {
      return { status: "ambiguous", entryIds: matches.map((entry) => entry.id) };
    }
    const changed = await markCovered(sql, matches[0].id, { articleId, method: "keyword" });
    return { status: changed ? "covered" : "already-covered", entryIds: [matches[0].id] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "error", entryIds: [], error: message };
  }
}

export { computePublishBy };
