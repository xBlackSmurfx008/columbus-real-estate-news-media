import assert from 'node:assert/strict';
import test from 'node:test';
import { generateArticleSlug, getArticlePath, getArticleSlug } from '../lib/article-routing.ts';

test('article slugs remain stable when a headline changes', () => {
  const article = {
    title: 'A Corrected and Improved Headline',
    canonical_slug: 'original-public-headline',
  };

  assert.equal(getArticleSlug(article), 'original-public-headline');
  assert.equal(getArticlePath(article), '/blog/original-public-headline');
});

test('legacy articles fall back to a normalized headline slug', () => {
  const title = "Columbus Inventory Climbs 14.2%: What's Next?";
  assert.equal(generateArticleSlug(title), 'columbus-inventory-climbs-14-2-what-s-next');
  assert.equal(getArticlePath({ title }), '/blog/columbus-inventory-climbs-14-2-what-s-next');
});
