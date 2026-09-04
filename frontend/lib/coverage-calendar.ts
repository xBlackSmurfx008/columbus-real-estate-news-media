/**
 * Coverage calendar — pure domain logic.
 *
 * WHY THIS EXISTS
 * ---------------
 * CREN's only real traffic channel is Google organic, and the only amplifier
 * we have ever measured is publishing *before* an event's search spike. The
 * largest traffic day on record (2026-08-27, 50 pageviews — about 65% of that
 * week) came from a restaurant-opening story published two days ahead of the
 * opening. Until now that happened by luck: dated milestones lived in prose
 * inside published articles and in the "Monitoring Items" tables of daily
 * briefs, and nothing told the morning routine "this is due today."
 *
 * This module turns those scattered dates into a schedule the routine can act
 * on. It is deliberately dependency-free (no `@/` aliases, no database, no
 * Next.js) so both App Router code and plain `node --experimental-strip-types`
 * scripts can import it.
 *
 * TIMEZONE
 * --------
 * Columbus is America/New_York. Every date here is a *calendar date string*
 * (`YYYY-MM-DD`), never a `Date`, and all arithmetic is done on those strings
 * via UTC midnight — which has no DST — so a run at 06:33 Eastern can never
 * land on the previous or next day the way `new Date().toISOString()` would.
 * The only place a real clock is consulted is `easternToday()`.
 */

/* ------------------------------------------------------------------ types */

export const NEWSROOM_TIMEZONE = "America/New_York";

/** CLAUDE.md gives the routine one real-estate slot and one lifestyle slot. */
export const CALENDAR_LANES = ["real-estate", "lifestyle"] as const;
export type CalendarLane = (typeof CALENDAR_LANES)[number];

export const CALENDAR_STATUSES = ["upcoming", "covered", "missed", "cancelled"] as const;
export type CalendarStatus = (typeof CALENDAR_STATUSES)[number];

/**
 * How exactly the source pins the date. A source that says "September 2026"
 * is recorded as `month` against the first of that month — never sharpened
 * into a day we cannot support.
 */
export const DATE_PRECISIONS = ["day", "month", "quarter"] as const;
export type DatePrecision = (typeof DATE_PRECISIONS)[number];

/**
 * How well sourced the date is.
 *  - `confirmed`   official/primary record or the organiser's own page
 *  - `reported`    a named outlet we captured a URL for
 *  - `unconfirmed` a date carried in one of our briefs whose establishing URL
 *                  was not recorded, or where sources disagree
 */
export const CONFIDENCE_LEVELS = ["confirmed", "reported", "unconfirmed"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/**
 * Derived, never stored: what the entry means *today*.
 *
 * `watch` and `stale` belong to month- and quarter-precision entries. A date
 * we only know to the month cannot produce a publish-by worth acting on, so
 * those entries are never due, overdue, or missed — they are watch items until
 * their period ends, and stale afterwards. Keeping them out of `missed` is
 * what makes the missed count mean something.
 */
export const CALENDAR_STATES = [
  "due",
  "overdue",
  "upcoming",
  "watch",
  "stale",
  "covered",
  "missed",
  "cancelled",
] as const;
export type CalendarState = (typeof CALENDAR_STATES)[number];

export interface CalendarEntry {
  id: string;
  event_date: string;
  date_precision: DatePrecision;
  confidence: ConfidenceLevel;
  headline: string;
  summary: string | null;
  area_slug: string | null;
  area_label: string;
  lane: CalendarLane;
  /** True when covering this would consume the weekly Neighborhoods slot. */
  neighborhood_candidate: boolean;
  lead_days: number;
  publish_by: string;
  status: CalendarStatus;
  /** Editor's ranking input: 1 = highest, 5 = lowest. */
  priority: number;
  source_url: string | null;
  source_label: string | null;
  /** The CREN article the date came from. */
  source_article_id: string | null;
  /** The committed brief the date came from, e.g. `briefs/2026-08-20.md`. */
  source_brief: string | null;
  note: string | null;
  match_keywords: string[];
  covered_by_article_id: string | null;
  covered_at: string | null;
}

export interface RankedEntry {
  entry: CalendarEntry;
  state: CalendarState;
  /** Negative once the event has passed. */
  days_to_event: number;
  /** Negative once the ideal publish-by date has passed. */
  days_to_publish_by: number;
  score: number;
  reason: string;
}

/* ------------------------------------------------------------- date logic */

export const DEFAULT_LEAD_DAYS = 2;
export const DEFAULT_HORIZON_DAYS = 14;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** True only for a real calendar date in `YYYY-MM-DD` form (rejects Feb 30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return (
    date.getUTCFullYear() === Number(y) &&
    date.getUTCMonth() === Number(m) - 1 &&
    date.getUTCDate() === Number(d)
  );
}

function assertIsoDate(value: string, label: string): string {
  if (!isIsoDate(value)) throw new TypeError(`${label} must be a YYYY-MM-DD calendar date, got ${JSON.stringify(value)}`);
  return value;
}

/** Today's calendar date in the newsroom's timezone. The only clock read. */
export function easternToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the shape we store.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NEWSROOM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Calendar-date arithmetic. UTC has no DST, so whole days are exact here. */
export function addDays(isoDate: string, days: number): string {
  assertIsoDate(isoDate, "isoDate");
  if (!Number.isInteger(days)) throw new TypeError("days must be an integer");
  const [y, m, d] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  assertIsoDate(from, "from");
  assertIsoDate(to, "to");
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/**
 * The publish-by date: event date minus the lead, defaulting to two days —
 * the gap that produced the Aug 27 traffic record.
 */
export function computePublishBy(eventDate: string, leadDays: number = DEFAULT_LEAD_DAYS): string {
  assertIsoDate(eventDate, "eventDate");
  if (!Number.isInteger(leadDays) || leadDays < 0) {
    throw new TypeError("leadDays must be a non-negative integer");
  }
  return addDays(eventDate, -leadDays);
}

/**
 * The last calendar date covered by an entry's stated precision. A day-precise
 * date ends on itself; "September 2026" ends on Sept. 30.
 */
export function periodEnd(entry: Pick<CalendarEntry, "event_date" | "date_precision">): string {
  assertIsoDate(entry.event_date, "event_date");
  const [year, month] = entry.event_date.split("-").map(Number);
  if (entry.date_precision === "month") return lastDayOfMonth(year, month);
  if (entry.date_precision === "quarter") {
    const endMonth = month + 2;
    const endYear = year + Math.floor((endMonth - 1) / 12);
    const normalized = ((endMonth - 1) % 12) + 1;
    return lastDayOfMonth(endYear, normalized);
  }
  return entry.event_date;
}

function lastDayOfMonth(year: number, month: number): string {
  const firstOfNext = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1));
  const last = new Date(firstOfNext.getTime() - 86_400_000);
  return `${last.getUTCFullYear()}-${pad(last.getUTCMonth() + 1)}-${pad(last.getUTCDate())}`;
}

/**
 * What the entry means today.
 *
 * `covered` and `cancelled` are terminal and stored. Everything else is
 * derived from the dates, so a stale stored status can never make the report
 * lie: an entry whose event has passed uncovered reads `missed` whether or not
 * the sweep has written that row yet.
 */
export function classifyEntry(
  entry: Pick<CalendarEntry, "event_date" | "publish_by" | "status" | "date_precision">,
  today: string,
): CalendarState {
  assertIsoDate(today, "today");
  if (entry.status === "cancelled") return "cancelled";
  if (entry.status === "covered") return "covered";
  if (entry.date_precision !== "day") {
    return today > periodEnd(entry) ? "stale" : "watch";
  }
  if (today > entry.event_date) return "missed";
  if (today > entry.publish_by) return "overdue";
  if (today === entry.publish_by) return "due";
  return "upcoming";
}

/* ---------------------------------------------------------------- ranking */

const CONFIDENCE_SCORE: Record<ConfidenceLevel, number> = {
  confirmed: 60,
  reported: 30,
  unconfirmed: 0,
};

const PRECISION_SCORE: Record<DatePrecision, number> = {
  day: 40,
  month: 10,
  quarter: 0,
};

function stateScore(state: CalendarState, daysToPublishBy: number): number {
  // Overdue outranks due: the ideal publish date has already slipped but the
  // event has not happened, so the search spike is still ahead of us.
  if (state === "overdue") return 1000;
  if (state === "due") return 900;
  if (state === "upcoming") return Math.max(0, 800 - daysToPublishBy * 10);
  // A watch item has no trustworthy publish-by, so it can never outrank a
  // dated peg — it only shows up when nothing dated is competing.
  if (state === "watch") return 100;
  return 0;
}

function describe(state: CalendarState, daysToEvent: number, daysToPublishBy: number): string {
  if (state === "overdue") {
    return `publish-by slipped ${-daysToPublishBy}d ago; event still ${daysToEvent}d out`;
  }
  if (state === "due") return `publish-by is today; event in ${daysToEvent}d`;
  if (state === "upcoming") return `publish-by in ${daysToPublishBy}d; event in ${daysToEvent}d`;
  if (state === "watch") return "month-level date only — confirm a day before treating it as a peg";
  if (state === "stale") return "the stated month or quarter has passed with no confirmation";
  if (state === "missed") return `event passed ${-daysToEvent}d ago with no CREN coverage`;
  return state;
}

export function rankEntry(entry: CalendarEntry, today: string): RankedEntry {
  const state = classifyEntry(entry, today);
  const daysToEvent = daysBetween(today, entry.event_date);
  const daysToPublishBy = daysBetween(today, entry.publish_by);
  const score =
    stateScore(state, daysToPublishBy) +
    CONFIDENCE_SCORE[entry.confidence] +
    PRECISION_SCORE[entry.date_precision] +
    (6 - clampPriority(entry.priority)) * 20;
  return { entry, state, days_to_event: daysToEvent, days_to_publish_by: daysToPublishBy, score, reason: describe(state, daysToEvent, daysToPublishBy) };
}

function clampPriority(priority: number): number {
  if (!Number.isFinite(priority)) return 3;
  return Math.min(5, Math.max(1, Math.round(priority)));
}

/**
 * Everything the routine could act on today, best first.
 *
 * "Actionable" means due, overdue, or inside the horizon — the routine picks
 * at most one real-estate and one lifestyle story a day, so a flat list is not
 * enough; this has to say which one first.
 */
export function rankEntries(
  entries: CalendarEntry[],
  today: string,
  { horizonDays = DEFAULT_HORIZON_DAYS }: { horizonDays?: number } = {},
): RankedEntry[] {
  return entries
    .map((entry) => rankEntry(entry, today))
    .filter((ranked) => {
      if (ranked.state === "overdue" || ranked.state === "due") return true;
      if (ranked.state === "watch") return ranked.days_to_event <= horizonDays;
      return ranked.state === "upcoming" && ranked.days_to_event <= horizonDays;
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.entry.event_date.localeCompare(b.entry.event_date) ||
        a.entry.id.localeCompare(b.entry.id),
    );
}

/** Entries whose date passed with nothing published. The number that matters. */
export function missedEntries(entries: CalendarEntry[], today: string): RankedEntry[] {
  return entries
    .map((entry) => rankEntry(entry, today))
    .filter((ranked) => ranked.state === "missed")
    .sort((a, b) => b.entry.event_date.localeCompare(a.entry.event_date));
}

/**
 * The routine's two slots. A Neighborhoods story consumes the real-estate slot
 * (CLAUDE.md), so this returns at most one entry per lane and says which.
 */
export function selectSlate(ranked: RankedEntry[]): Record<CalendarLane, RankedEntry | null> {
  const slate: Record<CalendarLane, RankedEntry | null> = { "real-estate": null, lifestyle: null };
  for (const candidate of ranked) {
    const lane = candidate.entry.lane;
    if (slate[lane] === null) slate[lane] = candidate;
  }
  return slate;
}

/* -------------------------------------------------------------- reporting */

function sourceCitation(entry: CalendarEntry): string {
  const parts: string[] = [];
  if (entry.source_article_id) parts.push(`CREN \`${entry.source_article_id}\``);
  if (entry.source_brief) parts.push(`\`${entry.source_brief}\``);
  if (entry.source_url) parts.push(`[${entry.source_label ?? "source"}](${entry.source_url})`);
  else if (entry.source_label) parts.push(entry.source_label);
  return parts.join(" · ") || "no source recorded";
}

function dateLabel(entry: CalendarEntry): string {
  if (entry.date_precision === "day") return entry.event_date;
  const suffix = entry.date_precision === "month" ? " (month only)" : " (quarter only)";
  return `${entry.event_date}${suffix}`;
}

function row(ranked: RankedEntry): string {
  const { entry } = ranked;
  const flags: string[] = [entry.confidence];
  if (entry.date_precision !== "day") flags.push(entry.date_precision);
  if (entry.neighborhood_candidate) flags.push("neighborhoods");
  return `| ${dateLabel(entry)} | ${entry.publish_by} | ${entry.headline} | ${entry.area_label} | ${entry.lane} | ${flags.join(", ")} | ${sourceCitation(entry)} |`;
}

const TABLE_HEAD = [
  "| Event date | Publish by | Milestone | Area | Lane | Flags | Source |",
  "|---|---|---|---|---|---|---|",
];

/**
 * The block the routine pastes into `briefs/<date>.md`. Markdown, because that
 * is what a brief is.
 */
export function buildBriefSection(
  entries: CalendarEntry[],
  today: string,
  { horizonDays = DEFAULT_HORIZON_DAYS }: { horizonDays?: number } = {},
): string {
  const ranked = rankEntries(entries, today, { horizonDays });
  const due = ranked.filter((item) => item.state === "due");
  const overdue = ranked.filter((item) => item.state === "overdue");
  const upcoming = ranked.filter((item) => item.state === "upcoming");
  const watch = ranked.filter((item) => item.state === "watch");
  const missed = missedEntries(entries, today);
  const slate = selectSlate(ranked);

  const lines: string[] = [];
  lines.push(`## Coverage calendar — ${today}`);
  lines.push("");
  lines.push(
    `Overdue ${overdue.length} · due today ${due.length} · next ${horizonDays} days ${upcoming.length}`
      + ` · watch ${watch.length} · missed all-time ${missed.length}`,
  );
  lines.push("");

  lines.push("### Recommended today");
  lines.push("");
  let anyRecommendation = false;
  for (const lane of CALENDAR_LANES) {
    const pick = slate[lane];
    if (!pick) {
      lines.push(`- **${lane}** — nothing on the calendar is due. Research as normal.`);
      continue;
    }
    anyRecommendation = true;
    const neighborhood = pick.entry.neighborhood_candidate
      ? " (Neighborhoods candidate — consumes the weekly Neighborhoods slot)"
      : "";
    lines.push(
      `- **${lane}** — ${pick.entry.headline} (${pick.state}, ${pick.reason})${neighborhood}. Source: ${sourceCitation(pick.entry)}`,
    );
  }
  if (anyRecommendation) {
    lines.push("");
    lines.push(
      "A calendar entry is a peg, not a story. Verify it against a live source before drafting; if the date has moved or the record does not hold up, mark the entry and publish nothing.",
    );
  }
  lines.push("");

  if (overdue.length > 0) {
    lines.push("### Overdue — publish-by has passed, the event has not");
    lines.push("");
    lines.push(...TABLE_HEAD, ...overdue.map(row));
    lines.push("");
  }
  if (due.length > 0) {
    lines.push("### Due today");
    lines.push("");
    lines.push(...TABLE_HEAD, ...due.map(row));
    lines.push("");
  }
  if (upcoming.length > 0) {
    lines.push(`### Next ${horizonDays} days`);
    lines.push("");
    lines.push(...TABLE_HEAD, ...upcoming.map(row));
    lines.push("");
  }
  if (watch.length > 0) {
    lines.push("### Watch — month-level dates, not yet a peg");
    lines.push("");
    lines.push(...TABLE_HEAD, ...watch.map(row));
    lines.push("");
  }
  if (missed.length > 0) {
    lines.push("### Missed — date passed with no CREN coverage");
    lines.push("");
    lines.push(...TABLE_HEAD, ...missed.map(row));
    lines.push("");
  }
  if (overdue.length + due.length + upcoming.length + watch.length + missed.length === 0) {
    lines.push("Nothing due, overdue, upcoming in the window, or missed.");
    lines.push("");
  }

  // Notes carry the caveats — a disputed date, prior CREN coverage, an agenda
  // that was not published when we recorded the date. They belong next to the
  // tables, not buried in the database.
  const noted = [...ranked, ...missed].filter((item) => item.entry.note);
  if (noted.length > 0) {
    lines.push("### Notes");
    lines.push("");
    for (const item of noted) lines.push(`- **${item.entry.id}** — ${item.entry.note}`);
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

/* ---------------------------------------------------------------- matching */

function normalize(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ");
}

/**
 * Which calendar entries a freshly published article plausibly covers.
 *
 * Deliberately conservative, because a wrong "covered" mark hides a real miss:
 *  - every one of the entry's seeded keywords must appear in the article text;
 *  - the article must publish inside the entry's window (a week before the
 *    publish-by date through three days after the event), so a passing mention
 *    of a future date in an unrelated story cannot close an entry out.
 *
 * The caller decides what to do when this returns more than one match — the
 * publish path records nothing rather than guessing.
 */
export function matchEntriesForArticle(
  entries: CalendarEntry[],
  { title, body, publishedOn }: { title: string; body?: string | null; publishedOn: string },
): CalendarEntry[] {
  const haystack = normalize(`${title}\n${body ?? ""}`);
  return entries.filter((entry) => {
    if (entry.status === "covered" || entry.status === "cancelled") return false;
    if (entry.match_keywords.length === 0) return false;
    const windowStart = addDays(entry.publish_by, -7);
    const windowEnd = addDays(periodEnd(entry), 3);
    if (publishedOn < windowStart || publishedOn > windowEnd) return false;
    return entry.match_keywords.every((keyword) => haystack.includes(normalize(keyword)));
  });
}

/* --------------------------------------------------------------- validation */

/**
 * Validate one seed record. Returns the problems found, empty when clean.
 * The seed file is committed and reviewable; this is what stops a typo, a
 * sharpened date, or an unsourced entry reaching the database.
 */
export function validateSeedEntry(raw: unknown): string[] {
  const problems: string[] = [];
  if (typeof raw !== "object" || raw === null) return ["entry is not an object"];
  const entry = raw as Record<string, unknown>;
  const id = typeof entry.id === "string" ? entry.id : "";
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(id)) problems.push("id must be a lowercase slug");
  if (!isIsoDate(entry.event_date)) problems.push("event_date must be YYYY-MM-DD");
  if (typeof entry.headline !== "string" || entry.headline.trim().length < 8) {
    problems.push("headline must say what happens");
  }
  if (typeof entry.area_label !== "string" || entry.area_label.trim() === "") problems.push("area_label is required");
  if (!CALENDAR_LANES.includes(entry.lane as CalendarLane)) problems.push(`lane must be one of ${CALENDAR_LANES.join(", ")}`);
  if (!DATE_PRECISIONS.includes(entry.date_precision as DatePrecision)) {
    problems.push(`date_precision must be one of ${DATE_PRECISIONS.join(", ")}`);
  }
  if (!CONFIDENCE_LEVELS.includes(entry.confidence as ConfidenceLevel)) {
    problems.push(`confidence must be one of ${CONFIDENCE_LEVELS.join(", ")}`);
  }
  if (entry.lead_days !== undefined && (!Number.isInteger(entry.lead_days) || (entry.lead_days as number) < 0)) {
    problems.push("lead_days must be a non-negative integer");
  }
  // Provenance is the whole point: a date with no article and no brief behind
  // it is exactly the kind of entry this property must never carry.
  const hasArticle = typeof entry.source_article_id === "string" && entry.source_article_id.trim() !== "";
  const hasBrief = typeof entry.source_brief === "string" && entry.source_brief.trim() !== "";
  if (!hasArticle && !hasBrief) problems.push("every entry must cite source_article_id or source_brief");
  if (entry.confidence !== "unconfirmed" && typeof entry.source_url !== "string") {
    problems.push("a confirmed or reported entry needs the source_url that establishes the date");
  }
  if (entry.date_precision === "month" && isIsoDate(entry.event_date) && !String(entry.event_date).endsWith("-01")) {
    problems.push("a month-precision date must be recorded on the first of the month, not sharpened to a day");
  }
  if (entry.match_keywords !== undefined && !Array.isArray(entry.match_keywords)) {
    problems.push("match_keywords must be an array of strings");
  }
  return problems;
}

/** Fill a seed record out into a full entry. Does not validate; call first. */
export function hydrateSeedEntry(raw: Record<string, unknown>): CalendarEntry {
  const leadDays = Number.isInteger(raw.lead_days) ? (raw.lead_days as number) : DEFAULT_LEAD_DAYS;
  const eventDate = raw.event_date as string;
  return {
    id: raw.id as string,
    event_date: eventDate,
    date_precision: (raw.date_precision as DatePrecision) ?? "day",
    confidence: (raw.confidence as ConfidenceLevel) ?? "reported",
    headline: raw.headline as string,
    summary: (raw.summary as string) ?? null,
    area_slug: (raw.area_slug as string) ?? null,
    area_label: raw.area_label as string,
    lane: raw.lane as CalendarLane,
    neighborhood_candidate: raw.neighborhood_candidate === true,
    lead_days: leadDays,
    publish_by: computePublishBy(eventDate, leadDays),
    status: (raw.status as CalendarStatus) ?? "upcoming",
    priority: clampPriority(typeof raw.priority === "number" ? raw.priority : 3),
    source_url: (raw.source_url as string) ?? null,
    source_label: (raw.source_label as string) ?? null,
    source_article_id: (raw.source_article_id as string) ?? null,
    source_brief: (raw.source_brief as string) ?? null,
    note: (raw.note as string) ?? null,
    match_keywords: Array.isArray(raw.match_keywords) ? (raw.match_keywords as string[]) : [],
    covered_by_article_id: null,
    covered_at: null,
  };
}
