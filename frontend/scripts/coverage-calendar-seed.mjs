/**
 * Reads the committed coverage-calendar seed.
 *
 * `content/coverage-calendar/seed.json` is the provenance record: every entry
 * names the CREN article or the committed brief its date came from, so the
 * calendar's sourcing is reviewable in a git diff rather than only inside a
 * database. This module refuses to hand back a seed that has any problem —
 * an unsourced entry, an impossible date, or a month-level date sharpened into
 * a day — because loading one of those is how a made-up date would enter the
 * newsroom's schedule.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { hydrateSeedEntry, validateSeedEntry } from "../lib/coverage-calendar.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

export const SEED_PATH = resolve(HERE, "../content/coverage-calendar/seed.json");

export function loadSeed(path = SEED_PATH) {
  const parsed = JSON.parse(readFileSync(path, "utf-8"));
  const raw = Array.isArray(parsed) ? parsed : parsed.entries;
  if (!Array.isArray(raw)) throw new Error(`${path} has no "entries" array`);

  const problems = [];
  const seen = new Set();
  for (const [index, item] of raw.entries()) {
    for (const problem of validateSeedEntry(item)) {
      problems.push(`entry ${index} (${item?.id ?? "no id"}): ${problem}`);
    }
    if (item?.id) {
      if (seen.has(item.id)) problems.push(`entry ${index}: duplicate id "${item.id}"`);
      seen.add(item.id);
    }
  }
  if (problems.length > 0) {
    const error = new Error(`Coverage calendar seed is invalid:\n  - ${problems.join("\n  - ")}`);
    error.problems = problems;
    throw error;
  }
  return raw.map((item) => hydrateSeedEntry(item));
}
