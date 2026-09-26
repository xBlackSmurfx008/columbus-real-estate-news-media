import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { gitBlobSha } from '../scripts/cren-graphic-lib.mjs';

const script = new URL('../scripts/render-cren-chart.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const run = (spec, out, dir) => {
  const specPath = join(dir, `${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(specPath, JSON.stringify(spec));
  return execFileSync(process.execPath, [script, '--spec', specPath, '--out', out], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
};
const bar = values => ({
  kind: 'bar', title: 'Fixture permits', subtitle: 'Test data only', source_line: 'Data: test fixture',
  series: values.map((value, i) => ({ label: `M${i + 1}`, value })),
});

test('chart renderer prints receipt hashes that match the written bytes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cren-chart-'));
  const out = join(dir, '2026-09-26-fixture-chart.png');
  const receipt = JSON.parse(run(bar([412, 388, 501, 547]), out, dir));
  const bytes = readFileSync(out);
  assert.equal(receipt.source_sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(receipt.git_blob_sha, gitBlobSha(bytes));
});

test('chart renderer re-seeds past similar charts and refuses unsourced specs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cren-chart-'));
  run(bar([412, 388, 501, 547, 610, 588, 530, 566]), join(dir, '2026-09-26-week-one.png'), dir);
  const second = JSON.parse(run(bar([520, 610, 480, 700, 655, 590, 720, 640]), join(dir, '2026-09-27-week-two.png'), dir));
  assert.ok(second.min_distance >= 18);
  assert.throws(() => run({ ...bar([1, 2]), source_line: 'test fixture' }, join(dir, '2026-09-28-unsourced.png'), dir),
    /CHART_SOURCE_LINE_MUST_START_WITH_DATA/);
});
