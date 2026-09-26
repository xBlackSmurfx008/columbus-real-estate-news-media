#!/usr/bin/env node
// Usage: node scripts/task-board.mjs [--validate] [--json] [--dir <path>] [--today YYYY-MM-DD]
// Prints the directive task board. --validate exits 1 when any card is invalid.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBoard, parseTaskCard, renderBoard } from './task-board-lib.mjs';

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const option = name => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const dir = resolve(option('--dir') || join(repoRoot, 'directives', 'tasks'));
const today = option('--today') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

const files = existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.md') && name !== 'README.md').sort() : [];
const cards = files.map(name => {
  const path = join(dir, name);
  return parseTaskCard(readFileSync(path, 'utf8'), relative(repoRoot, path));
});
const board = buildBoard(cards, today);

if (flag('--json')) {
  process.stdout.write(`${JSON.stringify({ today, ...board }, null, 2)}\n`);
} else {
  process.stdout.write(`${renderBoard(board, today)}\n`);
}

if (flag('--validate') && board.invalid.length) {
  process.stderr.write(`TASK_BOARD_INVALID: ${board.invalid.length} card(s) failed validation\n`);
  process.exit(1);
}
