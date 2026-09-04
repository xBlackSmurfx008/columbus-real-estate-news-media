import type { CalendarEntry } from "../lib/coverage-calendar.ts";

/** Minimal shape of the neon() tagged-template client these helpers need. */
type SqlClient = unknown;

export declare const CALENDAR_TABLE: string;
export declare const CALENDAR_EVENTS_TABLE: string;

export declare function ensureCoverageCalendarSchema(
  sql: SqlClient,
  options?: { verbose?: boolean },
): Promise<{ created: string[] }>;

export declare function readCalendar(sql: SqlClient): Promise<CalendarEntry[]>;

export declare function recordCalendarEvent(
  sql: SqlClient,
  entryId: string,
  action: string,
  detail?: Record<string, unknown>,
  actor?: string,
): Promise<void>;

export declare function upsertSeedEntry(sql: SqlClient, entry: CalendarEntry): Promise<"inserted" | "updated">;

/** Rejects with a RangeError when `today` is in the future. */
export declare function sweepMissed(sql: SqlClient, today?: string): Promise<string[]>;

export declare function markCovered(
  sql: SqlClient,
  entryId: string,
  options: { articleId?: string | null; method?: string; actor?: string },
): Promise<boolean>;

export declare function markCancelled(sql: SqlClient, entryId: string, reason?: string | null): Promise<boolean>;

export type CloseCalendarLoopResult = {
  status: "covered" | "already-covered" | "no-match" | "ambiguous" | "unknown-id" | "unavailable" | "error";
  entryIds: string[];
  explicitEntryId?: string | null;
  error?: string;
};

/** Never throws. The publish path must not branch on the outcome. */
export declare function closeCalendarLoop(
  sql: SqlClient,
  input: {
    articleId: string;
    title: string;
    body?: string | null;
    publishedOn?: string;
    explicitEntryId?: string | null;
  },
): Promise<CloseCalendarLoopResult>;

export declare function computePublishBy(eventDate: string, leadDays?: number): string;
