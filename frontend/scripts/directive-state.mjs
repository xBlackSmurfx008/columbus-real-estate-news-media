#!/usr/bin/env node
// Folds the append-only directive event log (directives/events/*.json) into the
// current state of every CMO item: engineering directives and owner decisions.
//
// Why a log instead of one state file: several routines commit to main, and two
// of them editing one JSON blob is a guaranteed rebase conflict. Each run adds
// new files and never edits old ones, so concurrent runs cannot collide, and the
// history of every item is its own audit trail.
//
// Streaks, ages and "how many times was this re-issued" are computed here from
// the log, never carried forward in a routine's own prose.
//
// Usage: node scripts/directive-state.mjs [--json] [--as-of YYYY-MM-DD] [--dir path]
// Exits 1 when any event is invalid, so a bad write fails loudly.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SCHEMA = "cren-directive-event-v1";
export const OWNER_QUEUE_CAP = 3;
export const ENGINEERING_CAP = 3;
// An engineering item with no status change for this long must be redefined,
// split or dropped. Re-issuing it unchanged is not allowed.
export const ENGINEERING_STALE_DAYS = 14;
// An owner question unanswered this long gets its stated default applied.
export const OWNER_DEFAULT_DAYS = 28;

const ACTORS = new Set(["cmo-weekly", "cto-executor", "owner", "cmo-rebuild"]);
const TRANSITIONS = {
  engineering: {
    proposed: ["in_build", "blocked", "dropped"],
    in_build: ["shipped", "blocked", "dropped"],
    shipped: ["verified", "in_build", "blocked"],
    verified: ["closed"],
    blocked: ["proposed", "in_build", "dropped"],
    dropped: [],
    closed: [],
  },
  owner: {
    queued: ["asked", "parked", "closed"],
    asked: ["answered", "parked", "closed"],
    answered: ["closed", "asked"],
    parked: ["asked", "closed"],
    closed: [],
  },
};
const TERMINAL = new Set(["dropped", "closed"]);
const REQUIRED_ON_OPEN = {
  engineering: ["title", "why", "definition_of_done", "verify"],
  owner: ["title", "question", "cost_of_delay", "default_if_unanswered"],
};

// The repo is public. Names and contact details belong in the admin lead queue,
// never in a directive. Refer to people by record id.
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/;

function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => strings(entry, out));
  else if (value && typeof value === "object") Object.values(value).forEach((entry) => strings(entry, out));
  return out;
}

function omit(object, keys) {
  return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
}

// Envelope fields describe the event itself; everything else is item data.
const ENVELOPE = ["schema", "type", "file", "evidence", "note", "actor", "at"];

function days(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Returns a list of problems with one event; empty means valid in isolation. */
export function validateEvent(event) {
  const problems = [];
  if (event?.schema !== SCHEMA) problems.push(`schema must be ${SCHEMA}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event?.item ?? "")) problems.push("item must be a kebab-case id");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event?.at ?? "")) problems.push("at must be YYYY-MM-DD");
  if (!ACTORS.has(event?.actor)) problems.push(`actor must be one of ${[...ACTORS].join(", ")}`);
  if (!["open", "update"].includes(event?.type)) problems.push("type must be open or update");
  if (event?.type === "open") {
    if (!TRANSITIONS[event.kind]) problems.push("open requires kind engineering or owner");
    else {
      for (const field of REQUIRED_ON_OPEN[event.kind]) if (!event[field]) problems.push(`open ${event.kind} requires ${field}`);
      if (!(event.status in TRANSITIONS[event.kind])) problems.push(`status ${event.status} is not a ${event.kind} status`);
    }
  }
  if (event?.status === "verified" || event?.status === "shipped") {
    const evidence = event.evidence ?? {};
    const hasCheck = typeof evidence.command === "string" && evidence.exit_code === 0;
    const hasRecord = typeof evidence.url === "string" || typeof evidence.commit === "string";
    if (event.status === "verified" && !hasCheck && !hasRecord) {
      problems.push("verified requires evidence {command, exit_code: 0} or {url|commit}");
    }
    if (event.status === "shipped" && !hasRecord) problems.push("shipped requires evidence {url|commit}");
  }
  for (const text of strings(event)) {
    if (EMAIL.test(text) || PHONE.test(text)) {
      problems.push("contains an email address or phone number; refer to people by record id");
      break;
    }
  }
  return problems;
}

/** Folds ordered events into item state. Pure: no I/O, deterministic. */
export function foldEvents(events, { asOf } = {}) {
  const items = new Map();
  const errors = [];
  const ordered = [...events].sort((a, b) => {
    const byDate = String(a.at ?? "").localeCompare(String(b.at ?? ""));
    return byDate !== 0 ? byDate : String(a.file ?? "").localeCompare(String(b.file ?? ""));
  });
  const today = asOf ?? ordered.filter((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.at ?? "")).at(-1)?.at ?? "1970-01-01";

  for (const event of ordered) {
    const where = event.file ?? event.item;
    const problems = validateEvent(event);
    for (const problem of problems) errors.push(`${where}: ${problem}`);
    if (problems.length > 0) continue;

    const existing = items.get(event.item);
    if (event.type === "open") {
      if (existing) {
        errors.push(`${where}: item ${event.item} is already open; use an update event`);
        continue;
      }
      items.set(event.item, {
        ...omit(event, ENVELOPE),
        opened: event.at,
        statusSince: event.at,
        updates: 0,
        history: [{ at: event.at, actor: event.actor, status: event.status, note: event.note ?? null, evidence: event.evidence ?? null }],
      });
      continue;
    }

    if (!existing) {
      errors.push(`${where}: update for unknown item ${event.item}`);
      continue;
    }
    if (event.kind && event.kind !== existing.kind) errors.push(`${where}: kind cannot change`);
    if (event.status && event.status !== existing.status) {
      if (!TRANSITIONS[existing.kind][existing.status].includes(event.status)) {
        errors.push(`${where}: ${existing.kind} item cannot move ${existing.status} -> ${event.status}`);
        continue;
      }
      existing.status = event.status;
      existing.statusSince = event.at;
    }
    Object.assign(existing, omit(event, [...ENVELOPE, "item", "status", "kind"]));
    existing.updates += 1;
    existing.history.push({ at: event.at, actor: event.actor, status: event.status ?? null, note: event.note ?? null, evidence: event.evidence ?? null });
  }

  const all = [...items.values()].map((entry) => ({
    ...entry,
    ageDays: days(entry.opened, today),
    daysInStatus: days(entry.statusSince, today),
  }));
  const byPriority = (a, b) => (a.priority ?? 99) - (b.priority ?? 99) || a.opened.localeCompare(b.opened);
  const ownerQueue = all.filter((entry) => entry.kind === "owner" && entry.status === "asked").sort(byPriority);
  const ownerWaiting = all.filter((entry) => entry.kind === "owner" && entry.status === "queued").sort(byPriority);
  const engineering = all
    .filter((entry) => entry.kind === "engineering" && !TERMINAL.has(entry.status))
    .sort(byPriority);

  const flags = [];
  if (ownerQueue.length > OWNER_QUEUE_CAP) {
    errors.push(`owner queue has ${ownerQueue.length} asked items; the cap is ${OWNER_QUEUE_CAP}`);
  }
  const activeEngineering = engineering.filter((entry) => ["proposed", "in_build", "blocked"].includes(entry.status));
  if (activeEngineering.length > ENGINEERING_CAP) {
    errors.push(`${activeEngineering.length} active engineering directives; the cap is ${ENGINEERING_CAP}`);
  }
  for (const entry of activeEngineering) {
    if (entry.daysInStatus >= ENGINEERING_STALE_DAYS) {
      flags.push(`${entry.item}: ${entry.status} for ${entry.daysInStatus} days — redefine, split or drop it; do not re-issue unchanged`);
    }
  }
  for (const entry of ownerQueue) {
    if (entry.daysInStatus >= OWNER_DEFAULT_DAYS) {
      flags.push(`${entry.item}: asked ${entry.daysInStatus} days ago — apply the stated default: ${entry.default_if_unanswered}`);
    }
  }
  for (const entry of engineering.filter((candidate) => candidate.status === "shipped")) {
    flags.push(`${entry.item}: shipped, not yet verified — run its check: ${entry.verify}`);
  }

  const canonical = JSON.stringify(
    all.map((entry) => omit(entry, ["ageDays", "daysInStatus"])).sort((a, b) => a.item.localeCompare(b.item)),
  );
  return {
    asOf: today,
    items: all,
    ownerQueue,
    ownerWaiting,
    engineering,
    closed: all.filter((entry) => TERMINAL.has(entry.status)),
    flags,
    errors,
    stateHash: createHash("sha256").update(canonical).digest("hex"),
  };
}

export function loadEvents(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      try {
        return { ...JSON.parse(readFileSync(new URL(name, dir), "utf8")), file: name };
      } catch (error) {
        return { file: name, schema: null, parseError: error instanceof Error ? error.message : String(error) };
      }
    });
}

export function formatState(state) {
  const lines = [`## CMO item state as of ${state.asOf}`, "", `State hash: \`${state.stateHash.slice(0, 16)}\``, ""];
  lines.push("### Owner decisions (asked)", "");
  if (state.ownerQueue.length === 0) lines.push("None open.");
  else {
    lines.push("| # | Item | Question | Cost of delay | Default if unanswered | Days asked |", "|---|---|---|---|---|---|");
    state.ownerQueue.forEach((entry, index) =>
      lines.push(`| ${index + 1} | ${entry.item} | ${entry.question} | ${entry.cost_of_delay} | ${entry.default_if_unanswered} | ${entry.daysInStatus} |`),
    );
  }
  if (state.ownerWaiting.length > 0) {
    lines.push("", `Queued behind the cap: ${state.ownerWaiting.map((entry) => entry.item).join(", ")}`);
  }
  lines.push("", "### Engineering directives", "");
  if (state.engineering.length === 0) lines.push("None open.");
  else {
    lines.push("| Item | Status | Days in status | Opened | Verify |", "|---|---|---|---|---|");
    for (const entry of state.engineering) {
      lines.push(`| ${entry.item} | ${entry.status} | ${entry.daysInStatus} | ${entry.opened} | ${entry.verify} |`);
    }
  }
  if (state.flags.length > 0) lines.push("", "### Flags", "", ...state.flags.map((flag) => `- ${flag}`));
  if (state.errors.length > 0) lines.push("", "### Errors", "", ...state.errors.map((error) => `- ${error}`));
  return lines.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const value = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const dirArg = value("--dir");
  const dir = dirArg
    ? new URL(`file://${dirArg.startsWith("/") ? dirArg : `${process.cwd()}/${dirArg}`}/`)
    : new URL("../../directives/events/", import.meta.url);
  const events = loadEvents(dir);
  const state = foldEvents(events, { asOf: value("--as-of") });
  for (const event of events.filter((entry) => entry.parseError)) state.errors.unshift(`${event.file}: invalid JSON (${event.parseError})`);
  console.log(args.includes("--json") ? JSON.stringify(state, null, 2) : formatState(state));
  if (state.errors.length > 0) process.exitCode = 1;
}
