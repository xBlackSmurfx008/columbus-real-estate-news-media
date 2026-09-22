import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

// Execute the existing CLI body with all side-effect boundaries replaced. Do not
// import its production dependencies, load env files, spawn a worker or open a DB.
async function runFixture(completedIds, totalMissing) {
  const source = await readFile(new URL('../scripts/run-image-backfill.mjs', import.meta.url), 'utf8');
  const executable = source.replace(/^#![^\n]*\n/, '').replace(/^import .*;\n/gm, '')
    .replace('main().catch(', 'globalThis.completion = main().catch(');
  const calls = []; const queries = []; const alerts = []; const stdout = []; const stderr = [];
  const manifest = { totalMissing: 2, selected: [{ id: 'draft-one' }, { id: 'draft-two' }] };
  const fakeProcess = { argv: ['node', 'run-image-backfill.mjs'], env: {}, execPath: '/fixture/node',
    cwd: () => '/fixture', stdout: { write: value => stdout.push(value) }, stderr: { write: value => stderr.push(value) }, exitCode: 0 };
  const context = vm.createContext({
    process: fakeProcess, Buffer, resolve, setTimeout, clearTimeout,
    spawn(command, args) {
      calls.push({ command, args });
      const child = new EventEmitter(); child.stdout = new EventEmitter(); child.kill = () => {};
      queueMicrotask(() => {
        if (args[0] === 'scripts/list-missing-images.mjs') child.stdout.emit('data', Buffer.from(JSON.stringify(manifest)));
        child.emit('exit', 0);
      });
      return child;
    },
    mkdir: async () => {}, writeFile: async () => {}, readFile: async () => 'Local fixture instructions.',
    getSql: () => async (strings) => {
      const statement = strings.join('?'); queries.push(statement);
      assert.match(statement, /^\s*SELECT /);
      assert.doesNotMatch(statement, /\b(?:UPDATE|INSERT|DELETE|FOR UPDATE)\b/i);
      if (statement.includes('COUNT(*)')) return [{ totalMissing }];
      return completedIds.map(id => ({ id }));
    },
    sendTelegramAlert: async payload => { alerts.push(payload); return { ok: true }; },
    safeErrorSummary: error => error.message,
    getDailyPublicationHealth: async () => ({ fixture: true }),
    alertZeroPublishOnce: async () => ({ sent: false }), alertPublicImageGapOnce: async () => ({ sent: false }),
  });
  new vm.Script(executable, { filename: 'run-image-backfill-fixture.mjs' }).runInContext(context);
  await context.completion;
  assert.deepEqual(stderr, []);
  return { result: JSON.parse(stdout.join('')), calls, queries, alerts, exitCode: fakeProcess.exitCode };
}

test('backfill summary reads actual remaining drafts after completed-job verification without claiming again', async () => {
  const run = await runFixture(['draft-one', 'draft-two'], 4);
  assert.equal(run.result.status, 'COMPLETED'); assert.equal(run.result.completed, 2);
  assert.equal(run.result.failed, 0); assert.equal(run.result.remaining, 4);
  assert.match(run.alerts[0].summary, /4 missing overall/);
  assert.equal(run.queries.length, 2);
  assert.match(run.queries[0], /JOIN article_image_jobs/);
  assert.match(run.queries[1], /COUNT\(\*\)::int AS "totalMissing" FROM articles/);
  assert.match(run.queries[1], /status = 'draft'/);
  assert.match(run.queries[1], /image_url IS NULL/);
  assert.doesNotMatch(run.queries[1], /article_image_jobs|CLAIMED|GENERATING/);
  const selections = run.calls.filter(call => call.args[0] === 'scripts/list-missing-images.mjs');
  assert.equal(selections.length, 1); assert.ok(selections[0].args.includes('--claim'));
  assert.equal(run.exitCode, 0);
});

test('remaining backlog count cannot turn a failed or partial selected batch into success', async () => {
  const partial = await runFixture(['draft-one'], 7);
  assert.equal(partial.result.status, 'PARTIAL_SUCCESS'); assert.equal(partial.result.remaining, 7);
  assert.equal(partial.result.completed, 1); assert.equal(partial.result.failed, 1);
  const failed = await runFixture([], 0);
  assert.equal(failed.result.status, 'FAILED'); assert.equal(failed.result.ok, false);
  assert.equal(failed.result.completed, 0); assert.equal(failed.result.failed, 2);
  assert.equal(failed.result.remaining, 0); assert.equal(failed.exitCode, 1);
});
