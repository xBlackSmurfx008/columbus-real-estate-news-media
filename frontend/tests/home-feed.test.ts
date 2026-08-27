import assert from 'node:assert/strict';
import test from 'node:test';
import { isLocalLivingArticle, prepareHomeArticles } from '../lib/home-feed.ts';
import type { DbArticle } from '../lib/public-data.ts';

function article(overrides: Partial<DbArticle>): DbArticle {
  return {
    id: 'article-1',
    status: 'live',
    featured: false,
    category: 'Development',
    category_class: '',
    icon: '',
    title: 'A Columbus story',
    excerpt: 'Excerpt',
    body: null,
    author: 'CRE Newsroom',
    date: 'August 25, 2026',
    read_time: '4 min read',
    area_slug: null,
    topic_slug: null,
    tags: [],
    image_url: null,
    image_alt: null,
    image_caption: null,
    meta_description: null,
    fact_checked_at: null,
    created_at: '2026-08-25T00:00:00Z',
    updated_at: '2026-08-25T00:00:00Z',
    ...overrides,
  };
}

test('home feed removes repeated article identities', () => {
  const result = prepareHomeArticles([
    article({ id: '1', canonical_slug: 'same-story' }),
    article({ id: '2', canonical_slug: 'same-story', title: 'Changed headline' }),
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, '1');
});

test('home feed keeps a later story but suppresses its repeated image URL', () => {
  const result = prepareHomeArticles([
    article({ id: '1', image_url: 'https://cdn.example.com/hero.jpg?width=1200' }),
    article({ id: '2', title: 'Another story', image_url: 'https://cdn.example.com/hero.jpg?width=600' }),
  ]);

  assert.equal(result.length, 2);
  assert.equal(result[0]?.image_url, 'https://cdn.example.com/hero.jpg?width=1200');
  assert.equal(result[1]?.image_url, null);
});

test('local-living classification does not confuse starts with arts', () => {
  assert.equal(
    isLocalLivingArticle(article({ title: 'A project starts construction', category: 'Development' })),
    false,
  );
  assert.equal(
    isLocalLivingArticle(article({ title: 'Annual arts festival returns', category: 'Lifestyle' })),
    true,
  );
});
