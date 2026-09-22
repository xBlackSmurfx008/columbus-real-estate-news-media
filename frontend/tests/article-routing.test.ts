import assert from 'node:assert/strict';
import test from 'node:test';
import { generateArticleSlug, getArticlePath, getArticleSlug, LEGACY_ARTICLE_SLUG_REDIRECTS } from '../lib/article-routing.ts';

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

test('verified legacy aliases have no redirect chains and do not conflate different Livingston projects', () => {
  for (const [source, destination] of Object.entries(LEGACY_ARTICLE_SLUG_REDIRECTS)) {
    assert.notEqual(source, destination);
    assert.equal(Object.hasOwn(LEGACY_ARTICLE_SLUG_REDIRECTS, destination), false);
  }
  assert.equal(LEGACY_ARTICLE_SLUG_REDIRECTS['columbus-livingston-avenue-170-apartments-mixed-use-2026'], undefined);
  assert.equal(LEGACY_ARTICLE_SLUG_REDIRECTS['downtown-columbus-merchant-building-fall-2026-opening'], 'columbus-north-market-tower-program-now-lists-142-residences');
});
