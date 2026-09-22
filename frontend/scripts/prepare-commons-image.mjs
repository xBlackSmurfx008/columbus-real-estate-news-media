#!/usr/bin/env node
// Download explicitly selected Commons originals and prepare local 16:9 crops.
// No generation, upload, DB, or publication. License metadata needs editorial review.
// node scripts/prepare-commons-image.mjs --plan FILE --output NEW_DIRECTORY
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const arg = name => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
if (!arg('plan') || !arg('output')) throw new Error('--plan and --output required');
const plan = JSON.parse(await readFile(resolve(arg('plan')), 'utf8'));
if (!Array.isArray(plan) || !plan.length || plan.length > 20 || new Set(plan.map(p => p.article_id)).size !== plan.length) throw new Error('INVALID_PLAN');
const output = resolve(arg('output')); await mkdir(dirname(output), { recursive: true }); await mkdir(output);
const api = new URL('https://commons.wikimedia.org/w/api.php');
api.search = new URLSearchParams({ action: 'query', format: 'json', titles: plan.map(p => p.file_title).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata|size' });
const result = await fetch(api, { signal: AbortSignal.timeout(30000) });
if (!result.ok) throw new Error(`COMMONS_METADATA_HTTP_${result.status}`);
const data = await result.json();
const pages = Object.values(data.query?.pages ?? {});
const clean = value => String(value ?? '').replace(/<[^>]+>/g, '').trim();
const prepared = [];
for (const item of plan) {
  if (!/^[a-z0-9-]+$/.test(item.article_id)) throw new Error('INVALID_ARTICLE_ID');
  const entry = pages.find(p => p.title === item.file_title)?.imageinfo?.[0];
  if (!entry || entry.size > 25_000_000 || entry.width < 1000 || entry.height < 600) throw new Error(`UNSUITABLE_SOURCE:${item.file_title}`);
  const meta = entry.extmetadata;
  const license = clean(meta.LicenseShortName?.value);
  if (!/^(Public domain|CC0|CC BY(?:-SA)? [234]\.0)$/.test(license)) throw new Error(`LICENSE_REVIEW_REQUIRED:${license}`);
  const url = new URL(entry.url); url.search = '';
  if (url.hostname !== 'upload.wikimedia.org' || url.protocol !== 'https:') throw new Error('SOURCE_HOST_INVALID');
  const response = await fetch(url, { redirect: 'error', headers: { 'User-Agent': 'CREN-Editorial-Image-Review/1.0 (https://columbusrealestatenews.com/contact)' }, signal: AbortSignal.timeout(60000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`SOURCE_HTTP_${response.status}`);
  const chunks = []; let length = 0;
  for await (const chunk of response.body) { length += chunk.length; if (length > 25_000_000) throw new Error('SOURCE_TOO_LARGE'); chunks.push(chunk); }
  const bytes = Buffer.concat(chunks);
  const file = join(output, `${item.article_id}-source.jpg`);
  await writeFile(file, bytes, { flag: 'wx' });
  const normalized = await sharp(bytes).rotate().resize(1600, 900, { fit: 'cover', position: 'centre' }).webp({ quality: 90, effort: 5 }).toBuffer();
  const normalizedFile = join(output, `${item.article_id}.webp`);
  await writeFile(normalizedFile, normalized, { flag: 'wx' });
  prepared.push({ ...item, source_file: file, file: normalizedFile, source_url: url.href,
    source_page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(item.file_title.replaceAll(' ', '_'))}`,
    source_sha256: createHash('sha256').update(bytes).digest('hex'), sha256: createHash('sha256').update(normalized).digest('hex'),
    credit: clean(meta.Artist?.value), license, license_url: clean(meta.LicenseUrl?.value),
    date: clean(meta.DateTimeOriginal?.value), description: clean(meta.ImageDescription?.value),
    license_metadata: meta, reviewed: false });
}
await writeFile(join(output, 'sources.json'), JSON.stringify(prepared, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(prepared.map(({ article_id, file, credit, license, date, description }) => ({ article_id, file, credit, license, date, description })), null, 2));
