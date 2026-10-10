#!/usr/bin/env node
// Read-only CLI over the two newsroom ledgers in briefs/. The routine edits the JSON
// by hand and runs `validate` before committing; nothing here writes.
// Usage (from frontend/):
//   node scripts/newsroom-ledgers.mjs watchlist due [--date=YYYY-MM-DD]
//   node scripts/newsroom-ledgers.mjs watchlist list | validate
//   node scripts/newsroom-ledgers.mjs photos open | shot | validate
//   node scripts/newsroom-ledgers.mjs validate
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { easternDate } from './newsroom-run-guard-lib.mjs';
import {
  dueWatchlistItems,
  openPhotoRequests,
  shotPhotoRequests,
  validatePhotoRequests,
  validateWatchlist,
} from './newsroom-ledgers-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WATCHLIST_PATH = join(here, '..', '..', 'briefs', 'watchlist.json');
const PHOTO_REQUESTS_PATH = join(here, '..', '..', 'briefs', 'photo-requests.json');

const [ledger, command] = process.argv.slice(2);
const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);

function load(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function fail(message) {
  process.stderr.write(`newsroom-ledgers: ${message}\n`);
  process.exit(1);
}

function report(name, result) {
  if (result.ok) {
    process.stdout.write(`${name}: OK\n`);
    return true;
  }
  process.stdout.write(`${name}: ${result.errors.length} problem(s)\n`);
  for (const error of result.errors) process.stdout.write(`  - ${error}\n`);
  return false;
}

function usage() {
  fail('usage: watchlist due|list|validate | photos open|shot|validate | validate');
}

if (ledger === 'validate' && !command) {
  const ok = [
    report('briefs/watchlist.json', validateWatchlist(load(WATCHLIST_PATH))),
    report('briefs/photo-requests.json', validatePhotoRequests(load(PHOTO_REQUESTS_PATH))),
  ].every(Boolean);
  process.exit(ok ? 0 : 1);
}

if (ledger === 'watchlist') {
  const doc = load(WATCHLIST_PATH);
  if (command === 'validate') process.exit(report('briefs/watchlist.json', validateWatchlist(doc)) ? 0 : 1);
  const validation = validateWatchlist(doc);
  if (!validation.ok) {
    report('briefs/watchlist.json', validation);
    fail('fix the ledger before using it');
  }
  if (command === 'due') {
    const date = arg('date') ?? easternDate();
    const due = dueWatchlistItems(doc, date);
    process.stdout.write(`${due.length} watchlist item(s) due on or before ${date}:\n`);
    for (const item of due) {
      process.stdout.write(`- [${item.next_check}] ${item.id}: ${item.lead}\n    check: ${item.primary_record}${item.primary_record_url ? ` <${item.primary_record_url}>` : ''}\n    next: ${item.next_checkpoint}\n`);
    }
    process.exit(0);
  }
  if (command === 'list') {
    for (const item of doc.items) {
      process.stdout.write(`- ${item.status.padEnd(7)} ${item.next_check ?? '          '} ${item.id}: ${item.lead}\n`);
    }
    process.exit(0);
  }
  usage();
}

if (ledger === 'photos') {
  const doc = load(PHOTO_REQUESTS_PATH);
  if (command === 'validate') process.exit(report('briefs/photo-requests.json', validatePhotoRequests(doc)) ? 0 : 1);
  const validation = validatePhotoRequests(doc);
  if (!validation.ok) {
    report('briefs/photo-requests.json', validation);
    fail('fix the ledger before using it');
  }
  if (command === 'open') {
    const open = openPhotoRequests(doc);
    process.stdout.write(`${open.length} open photo request(s), time-sensitive first:\n`);
    for (const item of open) {
      process.stdout.write(`- ${item.time_sensitive ? 'TIME-SENSITIVE ' : ''}${item.address} (${item.area}) — ${item.why}${item.frames ? ` [frames: ${item.frames}]` : ''}\n`);
    }
    process.exit(0);
  }
  if (command === 'shot') {
    const shot = shotPhotoRequests(doc);
    process.stdout.write(`${shot.length} site(s) already photographed by CREN:\n`);
    for (const item of shot) {
      process.stdout.write(`- ${item.shot_on} ${item.address} (${item.area}) — ${item.library_ref}${item.used_in.length ? ` — used in ${item.used_in.join(', ')}` : ''}\n`);
    }
    process.exit(0);
  }
  usage();
}

usage();
