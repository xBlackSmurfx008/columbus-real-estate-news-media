import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileEditorialPublication } from '../lib/editorial-publication-bookkeeping.ts';
import type { EditorialSql } from '../lib/editorial-email-review.ts';

function fixture(options: { missing?: boolean; calendarUnavailable?: boolean; countFailure?: boolean } = {}) {
  const statements: string[] = [];
  const sql: EditorialSql = async (strings) => {
    const statement = strings.join('?');
    statements.push(statement);
    if (statement.includes('SELECT a.title')) return options.missing ? [] : [{
      title: 'Published title', body: 'Published copy', submission: {}, published_on: '2026-09-22',
    }];
    if (statement.includes('UPDATE newsroom_runs')) {
      if (options.countFailure) throw new Error('private database detail');
      return [];
    }
    if (statement.includes('information_schema.tables')) return [{ exists: !options.calendarUnavailable }];
    if (statement.includes('SELECT * FROM coverage_calendar')) return [];
    throw new Error(`Unexpected statement: ${statement}`);
  };
  return { sql, statements };
}

test('bookkeeping recomputes counts on replay and treats no matching calendar entry as success', async () => {
  const { sql, statements } = fixture();
  for (let index = 0; index < 2; index++) {
    const result = await reconcileEditorialPublication(sql, 'article-id');
    assert.equal(result.ok, true);
    assert.equal(result.calendar.status, 'no-match');
  }
  assert.equal(statements.filter((statement) => statement.includes('UPDATE newsroom_runs')).length, 2);
  assert.ok(statements.every((statement) => !/UPDATE articles|INSERT INTO editorial_email|published_count\s*\+/i.test(statement)));
  assert.match(statements[0], /MAX\(published_at\)/);
  assert.match(statements[0], /America\/New_York/);
});

test('missing or unpublished article performs no bookkeeping writes', async () => {
  const { sql, statements } = fixture({ missing: true });
  await assert.rejects(reconcileEditorialPublication(sql, 'article-id'), /^Error: EDITORIAL_PUBLICATION_BOOKKEEPING_RETRY$/);
  assert.equal(statements.length, 1);
  assert.match(statements[0], /a.status = 'live'/);
});

test('database and swallowed calendar failures become stable retry signals', async () => {
  for (const options of [{ calendarUnavailable: true }, { countFailure: true }]) {
    const { sql } = fixture(options);
    await assert.rejects(reconcileEditorialPublication(sql, 'article-id'), /^Error: EDITORIAL_PUBLICATION_BOOKKEEPING_RETRY$/);
  }
});
