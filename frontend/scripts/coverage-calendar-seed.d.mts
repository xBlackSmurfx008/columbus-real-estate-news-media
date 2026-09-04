import type { CalendarEntry } from "../lib/coverage-calendar.ts";

export declare const SEED_PATH: string;

/** Throws with a `problems` array when any seed entry fails validation. */
export declare function loadSeed(path?: string): CalendarEntry[];
