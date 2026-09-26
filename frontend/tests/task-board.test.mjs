import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildBoard, parseTaskCard, validateCard } from '../scripts/task-board-lib.mjs';

const card = ({ meta = {}, body } = {}) => {
  const fields = {
    id: '2026-09-25-p1c-example-task',
    directive: '2026-09-25-cmo.md#p1',
    priority: 'P1',
    status: 'open',
    assignee: 'cren-engineer',
    blocked_by: '[]',
    created: '2026-09-25',
    due: '2026-10-02',
    attempts: '0',
    merge_policy: 'owner',
    pr: '',
    verified_by: '',
    ...meta,
  };
  const front = Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n');
  return `---\n${front}\n---\n${body ?? `# Example task

## Goal
Do the thing.

## Context
It is not done yet.

## Scope
One file.

## Definition of done
- [ ] First item.
- [ ] [KPI] Second item.

## Verification
Run the test.

## Stop and escalate if
It needs a credential.

## Log
- 2026-09-25 — cmo — created.
`}`;
};

const parse = (text, file = '<card>') => parseTaskCard(text, file);

test('a complete card parses and validates cleanly', () => {
  const parsed = parse(card());
  assert.equal(parsed.meta.id, '2026-09-25-p1c-example-task');
  assert.deepEqual(parsed.meta.blocked_by, []);
  assert.equal(parsed.meta.attempts, 0);
  assert.equal(parsed.title, 'Example task');
  assert.deepEqual(validateCard(parsed), []);
});

test('validation rejects cards an agent could not safely act on', () => {
  const errorsFor = (options) => validateCard(parse(card(options)));
  assert.ok(errorsFor({ meta: { status: 'finished' } }).includes('BAD_STATUS:finished'));
  assert.ok(errorsFor({ meta: { assignee: 'cto' } }).includes('BAD_ASSIGNEE:cto'));
  assert.ok(errorsFor({ meta: { merge_policy: 'auto_after_green' } }).includes('AUTO_MERGE_DOCS_ONLY'));
  assert.deepEqual(errorsFor({ meta: { merge_policy: 'auto_after_green', assignee: 'cren-docs' } }), []);
  assert.ok(errorsFor({ meta: { status: 'in_review' } }).includes('IN_REVIEW_WITHOUT_PR'));
  assert.ok(errorsFor({ meta: { status: 'blocked' } }).includes('BLOCKED_WITHOUT_REASON'));
  assert.ok(errorsFor({ meta: { status: 'done', verified_by: 'cren-verifier 2026-09-26' } }).includes('DONE_WITH_UNCHECKED_DOD'));
  assert.ok(errorsFor({ meta: { status: 'dropped' } }).includes('DROPPED_WITHOUT_REASON'));
  assert.ok(errorsFor({ meta: { id: 'do-the-thing' } }).includes('BAD_ID'));
  assert.ok(errorsFor({ body: '# Title\n\n## Goal\nx\n' }).includes('MISSING_SECTION:Definition of done'));
  assert.deepEqual(validateCard(parse('no front matter')), ['MISSING_FRONT_MATTER']);
});

test('done requires every box ticked and a named verifier', () => {
  const doneBody = card().replace(/- \[ \]/g, '- [x]');
  const withoutVerifier = doneBody.replace('status: open', 'status: done');
  assert.ok(validateCard(parse(withoutVerifier)).includes('DONE_WITHOUT_VERIFIER'));
  const verified = withoutVerifier.replace('verified_by: ', 'verified_by: cren-verifier 2026-09-26');
  assert.deepEqual(validateCard(parse(verified)), []);
});

test('the file name must match the card id', () => {
  const parsed = parse(card(), 'directives/tasks/2026-09-25-p1c-other.md');
  assert.ok(validateCard(parsed).includes('ID_FILENAME_MISMATCH'));
});

test('the board routes cards to agents, the owner, or a wait list', () => {
  const owner = parse(card({ meta: { id: '2026-09-25-p1a-owner-step', assignee: 'owner' } }), 'directives/tasks/2026-09-25-p1a-owner-step.md');
  const waits = parse(card({ meta: { id: '2026-09-25-p1b-after-owner', blocked_by: '[2026-09-25-p1a-owner-step]' } }), 'directives/tasks/2026-09-25-p1b-after-owner.md');
  const ready = parse(card({ meta: { id: '2026-09-25-p2a-ready-now', priority: 'P2' } }), 'directives/tasks/2026-09-25-p2a-ready-now.md');
  const exhausted = parse(card({ meta: { id: '2026-09-25-p3a-tried-twice', priority: 'P3', attempts: '2' } }), 'directives/tasks/2026-09-25-p3a-tried-twice.md');
  const board = buildBoard([exhausted, ready, waits, owner], '2026-10-05');

  assert.deepEqual(board.agentReady.map(row => row.id), ['2026-09-25-p2a-ready-now']);
  assert.deepEqual(board.waiting.map(row => row.id), ['2026-09-25-p1b-after-owner']);
  assert.deepEqual(board.ownerQueue.map(row => row.id), ['2026-09-25-p1a-owner-step']);
  assert.deepEqual(board.stuck.map(row => row.id), ['2026-09-25-p3a-tried-twice']);
  assert.ok(board.rows.every(row => row.overdue), 'all cards are past their 2026-10-02 due date');
  assert.equal(board.rows[0].priority, 'P1');
});

test('an unknown dependency is a validation error, not a silent wait', () => {
  const orphan = parse(card({ meta: { blocked_by: '[2026-09-25-p9z-missing]' } }), 'directives/tasks/2026-09-25-p1c-example-task.md');
  const board = buildBoard([orphan], '2026-09-26');
  assert.ok(board.invalid[0].errors.includes('UNKNOWN_DEPENDENCY:2026-09-25-p9z-missing'));
  assert.equal(board.agentReady.length, 0);
});

test('every committed task card in directives/tasks is valid', () => {
  const script = fileURLToPath(new URL('../scripts/task-board.mjs', import.meta.url));
  const output = execFileSync(process.execPath, [script, '--validate', '--json', '--today', '2026-09-26'], { encoding: 'utf8' });
  const board = JSON.parse(output);
  assert.deepEqual(board.invalid.map(row => `${row.file}: ${row.errors.join(', ')}`), []);
  assert.ok(board.rows.length > 0);
});

test('dispatcher and CMO prompts keep the completion and safety contract', () => {
  const read = name => readFileSync(new URL(`../prompts/${name}`, import.meta.url), 'utf8');
  const dispatcher = read('CLAUDE_TASK_DISPATCHER.md');
  assert.match(dispatcher, /verbatim/);
  assert.match(dispatcher, /cren-verifier/);
  assert.match(dispatcher, /Never start a third attempt/);
  assert.match(dispatcher, /Never use `DATABASE_URL`/);
  assert.match(dispatcher, /Gmail draft only/);
  assert.match(dispatcher, /Every other implementer PR waits for the owner/);

  const cmo = read('CLAUDE_CMO_WEEKLY.md');
  assert.match(cmo, /tasks:board -- --validate/);
  assert.match(cmo, /affiliate-report/);
  assert.match(cmo, /Do not re-issue work the board already tracks/);
  assert.match(cmo, /check it is not already built/);
  assert.match(cmo, /Maximum three directives/);
});
