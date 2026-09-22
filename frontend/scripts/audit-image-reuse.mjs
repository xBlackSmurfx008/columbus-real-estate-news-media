#!/usr/bin/env node
// Offline-only audit of a prepare-live-image-review evidence folder. Outputs JSON.
// node scripts/audit-image-reuse.mjs --manifest var/cren-images/RUN/manifest.json
// Optional --output report.json (must not already exist). No DB/provider writes.
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { reuseFingerprint, compareReuse, classifyImageUsages } from './image-reuse-lib.mjs';
import { mapLimit } from './site-quality/http.mjs';

const arg = name => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const manifestPath = arg('manifest');
if (!manifestPath) throw new Error('Usage: audit-image-reuse.mjs --manifest FILE [--output NEW_FILE]');
const root = await realpath(dirname(resolve(manifestPath)));
const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
if (!Array.isArray(manifest.images) || !Array.isArray(manifest.pages)) throw new Error('IMAGE_MANIFEST_INVALID');
const failures = [];
const records = await mapLimit(manifest.images, 4, async image => {
  try {
    if (image.error || !image.file || !/^[a-f0-9]{64}$/.test(image.sha256 ?? '')) throw new Error('DOWNLOAD_MISSING_OR_INVALID');
    const file = await realpath(resolve(root, image.file));
    const rel = relative(root, file);
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('IMAGE_PATH_OUTSIDE_MANIFEST');
    const bytes = await readFile(file);
    if (createHash('sha256').update(bytes).digest('hex') !== image.sha256) throw new Error('EVIDENCE_BYTES_CHANGED');
    return { number: image.number, url: image.url, usage: classifyImageUsages(image), fingerprint: await reuseFingerprint(bytes) };
  } catch (error) { failures.push({ number: image.number, error: error.message }); return null; }
});
const valid = records.filter(Boolean);
const pairs = [];
for (let i = 0; i < valid.length; i++) for (let j = i + 1; j < valid.length; j++) {
  const match = compareReuse(valid[i].fingerprint, valid[j].fingerprint);
  if (match) pairs.push({ left: valid[i].number, right: valid[j].number, ...match });
}
const crossArticleReuse = valid.filter(r => r.usage.crossArticleReuse).map(({ number, url, usage }) => ({ number, url, ...usage }));
const sharedGuideAssets = valid.filter(r => r.usage.sharedNonArticleAsset).map(({ number, url, usage }) => ({ number, url, ...usage }));
const pageFailures = manifest.pages.filter(p => p.status !== 200);
const report = {
  auditedAt: new Date().toISOString(), snapshotCapturedAt: manifest.capturedAt,
  inspectedAssets: valid.length, comparisons: valid.length * (valid.length - 1) / 2,
  technicalUniquenessPass: failures.length === 0 && pageFailures.length === 0 && pairs.length === 0
    && crossArticleReuse.length === 0 && sharedGuideAssets.length === 0,
  realism: 'NOT_CERTIFIED_BY_FINGERPRINTS', pairs, crossArticleReuse, sharedGuideAssets, failures, pageFailures,
  limitations: ['Offline snapshot, not a fresh site or provenance check.',
    'dHash plus seven full/crop probes can miss arbitrary crops or alterations. Similarity candidates require visual confirmation.',
    'Same-story cards and hero are one use. Shared non-article assets are reported by pages/placements, not presumed distinct editorial subjects.',
    'No visual similarity method proves naturalness, actual location, rights or factual project status.'],
};
const json = JSON.stringify(report, null, 2) + '\n';
if (arg('output')) await writeFile(resolve(arg('output')), json, { flag: 'wx' });
console.log(json);
if (!report.technicalUniquenessPass) process.exitCode = 1;
