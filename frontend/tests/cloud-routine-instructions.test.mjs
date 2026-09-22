import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCloudRoutineInstructions,
  CREN_HANDOFF_END,
  CREN_HANDOFF_START,
  CREN_ROUTINE_IDENTITY,
} from '../scripts/cloud-routine-instructions.mjs';

test('cloud routine instructions replace legacy direct database and publication prefixes', () => {
  const result = buildCloudRoutineInstructions({
    handoff: 'Do not use DATABASE_URL or publish-article.mjs.',
    writing: 'prompt_version cren-article-v1.0.2',
  });
  assert.equal(result.startsWith(CREN_ROUTINE_IDENTITY), true);
  assert.equal(result.match(new RegExp(CREN_HANDOFF_START, 'g'))?.length, 1);
  assert.equal(result.match(new RegExp(CREN_HANDOFF_END, 'g'))?.length, 1);
  assert.equal(result.includes('prompt_version cren-article-v1.0.2'), true);
  assert.equal(result.includes('newsroom-run.mjs start'), false);
  assert.equal(result.includes('status=live'), false);
});

test('cloud routine instructions require both current policies', () => {
  assert.throws(() => buildCloudRoutineInstructions({ handoff: '', writing: 'policy' }), /ROUTINE_POLICY_INPUT_REQUIRED/);
  assert.throws(() => buildCloudRoutineInstructions({ handoff: 'handoff', writing: '' }), /ROUTINE_POLICY_INPUT_REQUIRED/);
});
