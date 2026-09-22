import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
function evaluate(source, stubs = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(source, {
    fileName: 'fixture.tsx', compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  runInNewContext(outputText, { exports, require: id => Object.hasOwn(stubs, id) ? stubs[id] : require(id) });
  return exports;
}
const imageLabels = evaluate(read('lib/image-disclosure.ts'));
const cardHelpers = evaluate(read('lib/article-card.ts'), {
  '@/lib/article-routing': { getArticlePath: article => `/blog/${article.id}` },
  './image-disclosure': imageLabels,
});
const { ArticleCard } = evaluate(read('components/cren/article-card.tsx'), {
  'next/link': ({ children, ...props }) => createElement('a', props, children),
  '@/components/cren/cover-image': { CoverImage: ({ src, alt, aspect }) => createElement('img', { src, alt, 'data-aspect': aspect }) },
  '@/lib/article-card': cardHelpers,
});
const article = {
  id: 'italian-village', title: 'Article headline', excerpt: 'Original excerpt', category: 'Development', featured: true,
  author: 'CREN Newsroom', date: 'September 22, 2026', read_time: '3 min', image_url: '/reviewed-photo.webp',
  image_alt: 'Italian Village welcome sign beside a neighborhood street, photographed in 2009.',
  image_caption: 'Archival context: neighborhood photograph, not the development site.',
};

test('featured and standard article cards retain the reviewed 16:9 frame, true alt and disclosure', () => {
  for (const featured of [true, false]) {
    const html = renderToStaticMarkup(createElement(ArticleCard, { article: cardHelpers.toArticleCardData(article), featured }));
    assert.match(html, /aspect-\[16\/9\]/);
    assert.doesNotMatch(html, /aspect-\[16\/8\]|aspect-square/);
    assert.ok(html.includes(article.image_alt));
    assert.ok(html.includes('Archival photo · see caption for context'));
    for (const value of [article.title, article.excerpt, article.author, '/blog/italian-village']) assert.ok(html.includes(value));
  }
});

test('article-card image labels stay distinct and disappear when there is no image', () => {
  for (const [caption, label] of [
    ['AI-generated illustration.', 'AI illustration · not the actual property or event'],
    ['Official rendering of the proposed building.', 'Rendering · not a completed-project photograph'],
  ]) {
    const card = cardHelpers.toArticleCardData({ ...article, image_caption: caption });
    assert.ok(renderToStaticMarkup(createElement(ArticleCard, { article: card })).includes(label));
    assert.ok(!renderToStaticMarkup(createElement(ArticleCard, { article: { ...card, imageUrl: null } })).includes(label));
  }
});

test('homepage bento CSS has no fixed-height overrides that crop narrow mobile cards', () => {
  const css = read('app/cren-v2.css');
  const imageRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selector]) => /\.bento-img\b(?!-)/.test(selector));
  assert.ok(imageRules.some(([, , declarations]) => /aspect-ratio:\s*16\s*\/\s*9/.test(declarations)));
  for (const [, selector, declarations] of imageRules) {
    assert.doesNotMatch(declarations, /(?:^|;)\s*(?:min-|max-)?height:\s*[\d.]+(?:px|vh|rem)/, selector);
  }
  assert.match(css, /\.decision-lead-image\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/);
});

test('area, topic and homepage image labels require a displayed image and preserve descriptive alt', () => {
  for (const path of ['app/areas/[slug]/page.tsx', 'app/topics/[slug]/page.tsx', 'components/cren/home-sections.tsx']) {
    const text = read(path);
    assert.match(text, /alt=\{article\.image_alt \|\| article\.title\}/, path);
    assert.match(text, /article\.image_url && imageDisclosure\(article\.image_caption\)/, path);
  }
  assert.match(read('components/cren/home-sections.tsx'), /heroArticle\.image_url && imageDisclosure\(heroArticle\.image_caption\)/);
});

test('article captions render source/license links as safe React links while leaving HTML inert', () => {
  const source = read('app/blog/[slug]/page.tsx');
  assert.match(source, /renderInline\(article\.image_caption, 'image-caption'\)/);
  const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const inline = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'renderInline');
  assert.ok(inline);
  const { renderInline } = evaluate(`${inline.getText(ast)}\nexport { renderInline };`);
  const caption = 'Archival photo. Credit: [Photographer](https://commons.wikimedia.org/wiki/User:Example). '
    + '[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). <script>alert(1)</script> [unsafe](javascript:alert(1))';
  const html = renderToStaticMarkup(createElement('figcaption', null, renderInline(caption, 'image-caption')));
  assert.match(html, /href="https:\/\/commons.wikimedia.org\/wiki\/User:Example"/);
  assert.match(html, /href="https:\/\/creativecommons.org\/licenses\/by-sa\/3.0\/"/);
  assert.equal((html.match(/rel="nofollow noopener"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /<script|href="javascript:/);
  assert.match(html, /&lt;script&gt;/);
});
