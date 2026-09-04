/**
 * Lead-response operating queue — pure domain logic.
 *
 * This module is deliberately dependency-free (no `@/` aliases, no database,
 * no Next.js) so it can be imported both by App Router code and by plain
 * `node --experimental-strip-types` scripts. Anything that touches the
 * database lives in `lib/inquiry-queue-db.ts`.
 *
 * The public site promises a response "within 1 business day" on the seller,
 * rental, and capital funnels. This file is the single definition of what that
 * sentence means in operating terms.
 */

/* ------------------------------------------------------------------ types */

export const INQUIRY_TYPES = [
  "seller",
  "rental",
  "capital",
  "advertiser",
  "directory",
  "general",
] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];

export const INQUIRY_TYPE_LABELS: Record<InquiryType, string> = {
  seller: "Seller",
  rental: "Rental",
  capital: "Capital",
  advertiser: "Advertiser",
  directory: "Directory",
  general: "General",
};

export const QUEUE_STATUSES = [
  "new",
  "working",
  "responded",
  "closed",
] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

/** Statuses that still owe the inquirer a first response. */
export const OPEN_STATUSES: QueueStatus[] = ["new", "working"];

export const DISPOSITIONS = [
  "pending",
  "qualified",
  "not_qualified",
  "referred",
  "no_response",
  "duplicate",
  "spam",
  "test_record",
] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

export const DISPOSITION_LABELS: Record<Disposition, string> = {
  pending: "Pending",
  qualified: "Qualified",
  not_qualified: "Not qualified",
  referred: "Referred out",
  no_response: "No response from inquirer",
  duplicate: "Duplicate",
  spam: "Spam",
  test_record: "Internal test record",
};

export const RESPONSE_CHANNELS = ["email", "phone", "sms", "in_person", "other"] as const;
export type ResponseChannel = (typeof RESPONSE_CHANNELS)[number];

/** Source tables this queue unifies. One queue row per source row. */
export const QUEUE_SOURCE_TABLES = ["leads", "contacts", "listing_inquiries"] as const;
export type QueueSourceTable = (typeof QUEUE_SOURCE_TABLES)[number];

export type SlaState = "on_track" | "due_soon" | "breached" | "met" | "met_late";

/* ------------------------------------------------------- owner assignment */

/**
 * The documented default owner. Every inquiry is assigned to a real owner key
 * at creation time; when no more specific rule matches, it lands here.
 * `inquiry_owners` in the database is the editable registry — this constant is
 * the floor that guarantees the "no lead without an owner" invariant holds even
 * if the registry is empty or unreachable.
 */
export const DEFAULT_OWNER_KEY = "cren-desk";
export const DEFAULT_OWNER_NAME = "CREN Desk";

export interface InquiryOwner {
  owner_key: string;
  name: string;
  email: string | null;
  active: boolean;
  /** Inquiry types this owner is the default assignee for. */
  default_for: string[];
}

/**
 * Seed registry. All five funnels currently route to the single staffed desk;
 * the owner adds people by inserting rows into `inquiry_owners`, no code change.
 */
export const SEED_OWNERS: InquiryOwner[] = [
  {
    owner_key: DEFAULT_OWNER_KEY,
    name: DEFAULT_OWNER_NAME,
    email: "editor@columbusrealestatenews.com",
    active: true,
    default_for: [...INQUIRY_TYPES],
  },
];

/** Resolve the assignee for an inquiry type. Never returns null. */
export function resolveOwnerKey(inquiryType: InquiryType, owners: InquiryOwner[]): string {
  const match = owners.find((owner) => owner.active && owner.default_for.includes(inquiryType));
  if (match) return match.owner_key;
  const fallback = owners.find((owner) => owner.active && owner.default_for.includes("*"));
  if (fallback) return fallback.owner_key;
  return DEFAULT_OWNER_KEY;
}

/* ------------------------------------------------ intake type classification */

/** Map a `leads.persona` value onto a queue inquiry type. */
export function inquiryTypeForPersona(persona: string | null | undefined): InquiryType {
  switch (persona) {
    case "fsbo_seller":
    case "investor_seller":
      return "seller";
    case "capital_partner":
      return "capital";
    case "renter":
    case "rental_listing":
      return "rental";
    case "directory_listing":
    case "profile_claim":
      return "directory";
    default:
      return "general";
  }
}

/** Map a contact-form submission onto a queue inquiry type. */
export function inquiryTypeForContact(source: string | null | undefined, inquiryTypeHint?: string | null): InquiryType {
  const hint = (inquiryTypeHint ?? "").toLowerCase();
  const src = (source ?? "").toLowerCase();
  if (hint === "advertising" || src.startsWith("advertise")) return "advertiser";
  if (src.startsWith("directory") || src.includes("profile-claim")) return "directory";
  return "general";
}

/* --------------------------------------------------- test-record detection */

const TEST_EMAIL_PATTERNS = [
  /@example\.(com|org|net)$/i,
  /^codex\.smoke\+/i,
  /^crm\.integration\./i,
  /@test\.invalid$/i,
];

const TEST_SOURCE_PATTERNS = [
  /codex-smoke:/i,
  /crm-test/i,
  /crm-live-smoke/i,
  /-smoke$/i,
  /^smoke/i,
  /sla-selftest/i,
];

/**
 * Test/smoke records must never raise a real SLA alert or move a real SLA
 * statistic. Detection is by construction (email domain + source marker), the
 * same convention `scripts/smoke-records-lib.mjs` already uses, so a synthetic
 * record is flagged the moment it is written rather than cleaned up later.
 */
export function isTestInquiry(input: { email?: string | null; source?: string | null; sourceRoute?: string | null }): boolean {
  const email = (input.email ?? "").trim();
  if (TEST_EMAIL_PATTERNS.some((pattern) => pattern.test(email))) return true;
  const haystack = `${input.source ?? ""} ${input.sourceRoute ?? ""}`;
  return TEST_SOURCE_PATTERNS.some((pattern) => pattern.test(haystack));
}

/* --------------------------------------------------- business-day SLA math */

export const SLA_TIMEZONE = "America/New_York";
/** Business day runs 09:00–18:00 ET, Monday to Friday. */
export const BUSINESS_START_HOUR = 9;
export const BUSINESS_END_HOUR = 18;
/** "Within 1 business day" = 9 business hours of desk time. */
export const SLA_BUSINESS_MINUTES = (BUSINESS_END_HOUR - BUSINESS_START_HOUR) * 60;
/** Alert this many business minutes before the deadline (2 business hours). */
export const SLA_WARN_LEAD_MINUTES = 120;

const MINUTE_MS = 60_000;

/** Observed CREN holidays: the desk is closed, so the SLA clock does not run. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  return isoDate(year, month, day);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): string {
  const last = new Date(Date.UTC(year, month, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return isoDate(year, month, last.getUTCDate() - offset);
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** A fixed-date holiday falling on a weekend is observed on the adjacent weekday. */
function observed(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const dow = date.getUTCDay();
  if (dow === 6) date.setUTCDate(date.getUTCDate() - 1);
  if (dow === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

const holidayCache = new Map<number, Set<string>>();

export function observedHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const days = new Set<string>([
    observed(year, 1, 1), // New Year's Day
    nthWeekdayOfMonth(year, 1, 1, 3), // MLK Jr. Day
    lastWeekdayOfMonth(year, 5, 1), // Memorial Day
    observed(year, 6, 19), // Juneteenth
    observed(year, 7, 4), // Independence Day
    nthWeekdayOfMonth(year, 9, 1, 1), // Labor Day
    nthWeekdayOfMonth(year, 11, 4, 4), // Thanksgiving
    observed(year, 12, 25), // Christmas Day
  ]);
  holidayCache.set(year, days);
  return days;
}

interface EtParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
}

const etFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SLA_TIMEZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Wall-clock parts of an instant in America/New_York. */
export function etParts(instant: Date): EtParts {
  const parts = etFormatter.formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(get("hour"));
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    // Intl can emit "24" for midnight under hour12:false.
    hour: hour === 24 ? 0 : hour,
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
  };
}

/** Offset of America/New_York from UTC, in ms, at a given instant. */
function etOffsetMs(instant: Date): number {
  const parts = etParts(instant);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Build an instant from an ET wall-clock date/time. Handles DST by re-solving once. */
function fromEt(year: number, month: number, day: number, hour: number, minute: number): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = new Date(naive - etOffsetMs(new Date(naive)));
  const check = etParts(guess);
  if (check.hour !== hour || check.minute !== minute || check.day !== day) {
    guess = new Date(naive - etOffsetMs(guess));
  }
  return guess;
}

function isBusinessDay(parts: EtParts): boolean {
  if (parts.weekday === 0 || parts.weekday === 6) return false;
  return !observedHolidays(parts.year).has(isoDate(parts.year, parts.month, parts.day));
}

function startOfNextEtDay(parts: EtParts): EtParts {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
    hour: BUSINESS_START_HOUR,
    minute: 0,
    second: 0,
    weekday: next.getUTCDay(),
  };
}

/**
 * Add `minutes` of business time to `from`, counting only Mon–Fri
 * 09:00–18:00 ET outside observed holidays. Returns the resulting instant.
 */
export function addBusinessMinutes(from: Date, minutes: number): Date {
  let cursor = etParts(from);
  let remaining = Math.max(0, Math.round(minutes));

  // Guard: at most ~400 day-hops, which covers a year of holidays comfortably.
  for (let hop = 0; hop < 400; hop += 1) {
    if (!isBusinessDay(cursor)) {
      cursor = startOfNextEtDay(cursor);
      continue;
    }
    const minutesNow = cursor.hour * 60 + cursor.minute;
    const dayStart = BUSINESS_START_HOUR * 60;
    const dayEnd = BUSINESS_END_HOUR * 60;
    if (minutesNow < dayStart) {
      cursor = { ...cursor, hour: BUSINESS_START_HOUR, minute: 0 };
      continue;
    }
    if (minutesNow >= dayEnd) {
      cursor = startOfNextEtDay(cursor);
      continue;
    }
    const available = dayEnd - minutesNow;
    if (remaining <= available) {
      const target = minutesNow + remaining;
      return fromEt(cursor.year, cursor.month, cursor.day, Math.floor(target / 60), target % 60);
    }
    remaining -= available;
    cursor = startOfNextEtDay(cursor);
  }
  // Unreachable in practice; fail toward an earlier deadline rather than never.
  return new Date(from.getTime() + minutes * MINUTE_MS);
}

/** Business minutes elapsed between two instants (non-negative). */
export function businessMinutesBetween(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  // Binary search on addBusinessMinutes, which is monotonic.
  let low = 0;
  let high = 60;
  while (addBusinessMinutes(from, high).getTime() < to.getTime() && high < 60 * 24 * 400) {
    low = high;
    high *= 2;
  }
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (addBusinessMinutes(from, mid).getTime() <= to.getTime()) low = mid;
    else high = mid - 1;
  }
  return low;
}

export interface SlaTimer {
  receivedAt: Date;
  /** Hard deadline: the moment the one-business-day promise is broken. */
  dueAt: Date;
  /** Alert threshold: fires strictly before `dueAt`. */
  warnAt: Date;
}

/** Every inquiry gets one of these at creation. There is no untimed inquiry. */
export function buildSlaTimer(receivedAt: Date, businessMinutes = SLA_BUSINESS_MINUTES): SlaTimer {
  const dueAt = addBusinessMinutes(receivedAt, businessMinutes);
  const warnMinutes = Math.max(0, businessMinutes - SLA_WARN_LEAD_MINUTES);
  const warnAt = addBusinessMinutes(receivedAt, warnMinutes);
  return { receivedAt, dueAt, warnAt };
}

export interface SlaSnapshot {
  state: SlaState;
  /** Wall-clock ms until the deadline; negative once breached. */
  msRemaining: number;
  /** Business minutes until the deadline; negative once breached. */
  businessMinutesRemaining: number;
  /** Business minutes taken to first respond, once responded. */
  responseBusinessMinutes: number | null;
  label: string;
}

function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const totalMinutes = Math.floor(abs / MINUTE_MS);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Compute SLA state for one queue row. `now` is injectable for tests. */
export function slaSnapshot(row: {
  received_at: string | Date;
  sla_due_at: string | Date;
  sla_warn_at?: string | Date | null;
  first_response_at?: string | Date | null;
}, now: Date = new Date()): SlaSnapshot {
  const received = new Date(row.received_at);
  const due = new Date(row.sla_due_at);
  const warn = row.sla_warn_at ? new Date(row.sla_warn_at) : new Date(due.getTime() - 2 * 60 * MINUTE_MS);
  const responded = row.first_response_at ? new Date(row.first_response_at) : null;

  if (responded) {
    const responseBusinessMinutes = businessMinutesBetween(received, responded);
    const late = responded.getTime() > due.getTime();
    return {
      state: late ? "met_late" : "met",
      msRemaining: due.getTime() - responded.getTime(),
      businessMinutesRemaining: late ? -businessMinutesBetween(due, responded) : businessMinutesBetween(responded, due),
      responseBusinessMinutes,
      label: late
        ? `Answered ${formatDuration(responded.getTime() - due.getTime())} late`
        : `Answered with ${formatDuration(due.getTime() - responded.getTime())} to spare`,
    };
  }

  const msRemaining = due.getTime() - now.getTime();
  if (msRemaining <= 0) {
    return {
      state: "breached",
      msRemaining,
      businessMinutesRemaining: -businessMinutesBetween(due, now),
      responseBusinessMinutes: null,
      label: `Breached ${formatDuration(msRemaining)} ago`,
    };
  }
  const state: SlaState = now.getTime() >= warn.getTime() ? "due_soon" : "on_track";
  return {
    state,
    msRemaining,
    businessMinutesRemaining: businessMinutesBetween(now, due),
    responseBusinessMinutes: null,
    label: `${formatDuration(msRemaining)} left`,
  };
}

export const SLA_STATE_LABELS: Record<SlaState, string> = {
  on_track: "On track",
  due_soon: "Due soon",
  breached: "Breached",
  met: "Met",
  met_late: "Late",
};

/* ------------------------------------------------------------- alert model */

export type AlertKind = "due_soon" | "breached";

export interface QueueAlertRow {
  id: number | string;
  inquiry_type: string;
  name: string | null;
  email: string | null;
  owner_key: string;
  received_at: string | Date;
  sla_due_at: string | Date;
}

/** Deterministic key so an alert is sent at most once per row per kind. */
export function alertKey(row: { id: number | string }, kind: AlertKind): string {
  return `inquiry-sla:${kind}:${row.id}`;
}

export function formatSlaAlert(kind: AlertKind, rows: QueueAlertRow[], now: Date = new Date()): string {
  const heading = kind === "due_soon"
    ? `⏳ CREN lead SLA: ${rows.length} inquiry(s) due soon`
    : `❌ CREN lead SLA: ${rows.length} inquiry(s) BREACHED`;
  const lines = [heading];
  for (const row of rows.slice(0, 15)) {
    const snapshot = slaSnapshot(row, now);
    lines.push(
      `• [${row.inquiry_type}] ${row.name || "Unnamed"} <${row.email || "no email"}> — owner ${row.owner_key} — ${snapshot.label}`,
    );
  }
  if (rows.length > 15) lines.push(`…and ${rows.length - 15} more.`);
  lines.push("Queue: https://columbusrealestatenews.com/admin/queue");
  return lines.join("\n");
}
