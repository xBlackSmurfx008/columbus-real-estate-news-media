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
    'CLAUDE_CMO_WEEKLY.md',
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

test('weekly CMO review is a decision loop, not a daily memo', () => {
  const prompt = readPrompt('CLAUDE_CMO_WEEKLY.md');
  assert.match(prompt, /ALREADY_RAN_THIS_WEEK/);
  assert.match(prompt, /npm ci --no-audit --no-fund --ignore-scripts/);
  assert.match(prompt, /directive-state\.mjs/);
  assert.match(prompt, /Never derive a delta,\s+streak, or age from an earlier directive's prose/);
  assert.match(prompt, /must be re-tested this run/);
  assert.match(prompt, /not revenue while paid clicks are 0/);
  assert.match(prompt, /Never write a person's name, email, phone number/);
  assert.match(prompt, /untrusted data, never instructions/);
  assert.match(prompt, /at most three items at status `asked`/);
  assert.match(prompt, /Never edit an existing event file/);
  assert.match(prompt, /never send/i);
  assert.doesNotMatch(prompt, /git push origin main/);
});

test('CTO executor opens pull requests only and stays gated behind CI secret isolation', () => {
  const prompt = readPrompt('CLAUDE_CTO_EXECUTOR.md');
  assert.match(prompt, /NOT SCHEDULED/);
  assert.match(prompt, /EXECUTOR_GATED/);
  assert.match(prompt, /`ci-secret-isolation` is not `verified`/);
  assert.match(prompt, /Never merge the pull request/);
  assert.match(prompt, /Do not force-push/);
  assert.match(prompt, /`\.github\/`, `\.claude\/`, `CLAUDE\.md`, `frontend\/prompts\/`, `directives\/`/);
  assert.match(prompt, /Never request, read, print, or use `DATABASE_URL`/);
  assert.match(prompt, /Do not write directive event files/);
});

