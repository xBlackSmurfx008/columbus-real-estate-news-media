import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readPrompt = name => readFileSync(new URL(`../prompts/${name}`, import.meta.url), 'utf8');

test('every cloud routine has a verified branch-to-main delivery contract', () => {
  const prompts = [
    'CLOUD_ROUTINE_HANDOFF.md',
    'CLAUDE_SOCIAL_LISTENER.md',
    'CLAUDE_WEEKLY_SEO.md',
    'CLAUDE_MONTHLY_REVIEW.md',
  ];

  for (const name of prompts) {
    const prompt = readPrompt(name);
    assert.match(prompt, /origin\/main/);
    assert.match(prompt, /pull request/i);
    assert.match(prompt, /inspect .*file|file list/i);
    assert.match(prompt, /merge/i);
    assert.match(prompt, /verify .*present|readback/i);
    assert.match(prompt, /HANDOFF_BLOCKED/);
    assert.match(prompt, /do not force-push|never force-push/i);
  }
});

test('social listener forbids inferred recency, volume, and sentiment', () => {
  const prompt = readPrompt('CLAUDE_SOCIAL_LISTENER.md');
  assert.match(prompt, /publication timestamp inside the 24-to-48-hour window/i);
  assert.match(prompt, /volume and sentiment `UNMEASURED`/);
  assert.match(prompt, /never infer them from the number or tone of news articles/i);
  assert.match(prompt, /Count authors, not articles or domains/i);
});

test('weekly report requires recomputed counts and rejects unsupported readiness and demand claims', () => {
  const prompt = readPrompt('CLAUDE_WEEKLY_SEO.md');
  assert.match(prompt, /Recompute every coverage\/source count/);
  assert.match(prompt, /candidate, never "publishable"/);
  assert.match(prompt, /sentiment `UNMEASURED`/);
  assert.match(prompt, /latest corrected social report/);
  assert.match(prompt, /supervised correction path/);
});
