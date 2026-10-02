#!/usr/bin/env node
// Same-day guard for the cre-news-newsroom cloud routine. Read-only; no credentials.
// Reads today's receipt from origin/main and prints the run mode so a second
// firing of the schedule fills only the open story slot instead of repeating work.
// Usage (from frontend/): node scripts/newsroom-run-guard.mjs [--date=YYYY-MM-DD] [--ref=origin/main] [--no-fetch]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assessSameDayRun, easternDate } from './newsroom-run-guard-lib.mjs';

const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const date = arg('date') ?? easternDate();
const ref = arg('ref') ?? 'origin/main';
const noFetch = process.argv.includes('--no-fetch');

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const repoRoot = git('rev-parse', '--show-toplevel').trim();
const receiptPath = `frontend/content/newsroom-runs/${date}.json`;

let refFresh = false;
if (!noFetch && ref.startsWith('origin/')) {
  try {
    git('fetch', '--quiet', 'origin', ref.slice('origin/'.length));
    refFresh = true;
  } catch {
    process.stderr.write(`newsroom-run-guard: could not fetch ${ref}; using the local copy of the ref.\n`);
  }
}

function showAtRef(path) {
  try {
    return git('show', `${ref}:${path}`);
  } catch {
    return null;
  }
}

function parseJson(text, label) {
  if (text == null) return null;
  try {
    return JSON.parse(text);
  } catch {
    process.stderr.write(`newsroom-run-guard: ${label} is not valid JSON.\n`);
    return null;
  }
}

const receipt = parseJson(showAtRef(receiptPath), `${ref}:${receiptPath}`);
const articles = {};
for (const path of receipt?.article_paths ?? []) {
  if (typeof path !== 'string') continue;
  articles[path] = parseJson(showAtRef(path), `${ref}:${path}`);
}

const assessment = assessSameDayRun({ date, receipt, articles });

const worktreeReceipt = join(repoRoot, receiptPath);
if (existsSync(worktreeReceipt)) {
  const local = readFileSync(worktreeReceipt, 'utf8');
  const onMain = showAtRef(receiptPath);
  if (onMain == null) {
    assessment.notes.push(`The working tree already holds ${receiptPath} but ${ref} does not; it is this branch's uncommitted or unmerged receipt.`);
  } else if (local !== onMain) {
    assessment.notes.push(`The working tree copy of ${receiptPath} differs from ${ref}.`);
  }
}

const result = { ...assessment, ref, ref_fetched: refFresh, receipt_path: receiptPath };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.stderr.write(
  `newsroom-run-guard: ${date} ${result.mode}` +
    (result.open_slots.length ? ` (open: ${result.open_slots.join(', ')})` : '') +
    '\n',
);
