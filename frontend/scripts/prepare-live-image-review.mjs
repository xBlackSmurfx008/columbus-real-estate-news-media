#!/usr/bin/env node
// Read-only public-site image inventory and contact sheets. No credentials,
// database writes, uploads, generation, or publication. Run from frontend:
// node scripts/prepare-live-image-review.mjs --output var/cren-images/live-review-DATE
// Review manifest.json, sheets/*.jpg, then originals for questionable details.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { tags, decodeEntities } from './site-quality/html.mjs';
import { createHttpClient, mapLimit } from './site-quality/http.mjs';

const outputArg = process.argv.indexOf('--output');
if (outputArg < 0 || !process.argv[outputArg + 1]) throw new Error('--output directory required');
const output = path.resolve(process.argv[outputArg + 1]);
// Require a new run folder: never overwrite a prior evidence package.
await mkdir(path.dirname(output), { recursive: true });
await mkdir(output);
const origin = 'https://columbusrealestatenews.com';
const http = createHttpClient();
const publicResponse = await http.get(`${origin}/api/public`);
if (!publicResponse.ok) throw new Error('Public inventory unavailable');
const data = JSON.parse(publicResponse.text);
const sitemap = await http.get(`${origin}/sitemap.xml`);
if (!sitemap.ok) throw new Error('Sitemap unavailable');
const paths = new Set(['/', '/areas', '/things-to-do', '/housing-search', '/directory']);
for (const match of sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const url = new URL(decodeEntities(match[1]));
  if (url.origin === origin) paths.add(url.pathname);
}
const areaIndex = await http.get(`${origin}/areas`);
for (const entry of tags(areaIndex.text)) {
  const href = entry.attributes.href;
  if (entry.tag === 'a' && /^\/areas\/[^/?#]+$/.test(href || '')) paths.add(href);
}
const images = new Map();
function register(src, usage) {
  if (!src || src.startsWith('data:')) return;
  let url = new URL(src, origin);
  if (url.pathname === '/_next/image' && url.searchParams.has('url')) url = new URL(url.searchParams.get('url'), origin);
  if (url.protocol !== 'https:') return;
  const key = url.href;
  if (!images.has(key)) images.set(key, { url: key, usages: [] });
  images.get(key).usages.push(usage);
}
for (const article of data.articles) register(article.image_url, {
  kind: 'article', id: article.id, title: article.title,
  path: `/blog/${article.canonical_slug || article.id}`,
  alt: article.image_alt, caption: article.image_caption,
});
const pages = await mapLimit([...paths], 4, async (pathname) => {
  const page = await http.get(`${origin}${pathname}`);
  if (page.ok) for (const entry of tags(page.text)) {
    if (entry.tag === 'img') register(entry.attributes.src, { kind: 'rendered', path: pathname, alt: entry.attributes.alt });
  }
  return { path: pathname, status: page.status, error: page.error };
});
await mkdir(path.join(output, 'originals'), { recursive: true });
await mkdir(path.join(output, 'sheets'), { recursive: true });
const records = [...images.values()].map((record, index) => ({ number: index + 1, ...record }));
await mapLimit(records, 4, async (record) => {
  try {
    const response = await fetch(record.url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image HTTP ${response.status}`);
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 25 * 1024 * 1024) throw new Error('Image exceeds 25 MB limit');
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const metadata = await sharp(buffer).metadata();
    const filename = `${String(record.number).padStart(3, '0')}.${metadata.format === 'jpeg' ? 'jpg' : metadata.format}`;
    record.file = `originals/${filename}`;
    record.width = metadata.width; record.height = metadata.height;
    record.sha256 = createHash('sha256').update(buffer).digest('hex');
    await writeFile(path.join(output, record.file), buffer, { flag: 'wx' });
  } catch (error) { record.error = String(error.message); }
});
const escape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
for (let start = 0; start < records.length; start += 12) {
  const batch = records.slice(start, start + 12);
  const composites = [];
  for (let index = 0; index < batch.length; index++) {
    const record = batch[index]; const left = (index % 3) * 480; const top = Math.floor(index / 3) * 315;
    if (record.file && !record.error) composites.push({ input: await sharp(path.join(output, record.file)).resize(480, 270, { fit: 'inside' }).toBuffer(), left, top });
    const title = record.usages.find(u => u.kind === 'article')?.title || record.url.split('/').pop();
    const label = `${record.number}: ${title}`;
    composites.push({ input: Buffer.from(`<svg width="480" height="45"><rect width="480" height="45" fill="white"/><text x="5" y="17" font-size="13" font-family="sans-serif">${escape(label.slice(0, 64))}</text><text x="5" y="35" font-size="13" font-family="sans-serif">${escape(label.slice(64, 128))}</text></svg>`), left, top: top + 270 });
  }
  await sharp({ create: { width: 1440, height: Math.ceil(batch.length / 3) * 315, channels: 3, background: '#dddddd' } }).composite(composites).jpeg({ quality: 90 }).toFile(path.join(output, 'sheets', `${String(start + 1).padStart(3, '0')}.jpg`));
}
const hashes = new Map();
for (const record of records.filter(r => r.sha256)) hashes.set(record.sha256, [...(hashes.get(record.sha256) || []), record.number]);
const manifest = { capturedAt: new Date().toISOString(), origin, articleCount: data.articles.length, pageCount: pages.length, uniqueImageUrls: records.length, duplicateByteGroups: [...hashes.values()].filter(v => v.length > 1), pages, images: records, limitations: ['Public SSR img elements and API article heroes; CSS backgrounds, authenticated pages and transient client-only ads are not included.', 'A contact sheet is a triage aid, not proof of authenticity or rights.'] };
await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, articles: data.articles.length, pages: pages.length, images: records.length, imageFailures: records.filter(r => r.error).length, pageFailures: pages.filter(p => p.status !== 200).length, duplicateByteGroups: manifest.duplicateByteGroups }, null, 2));
