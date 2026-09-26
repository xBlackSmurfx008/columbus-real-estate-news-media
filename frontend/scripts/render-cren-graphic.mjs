#!/usr/bin/env node
// Offline CREN data-card renderer: no network, no provider, no credentials.
// Usage: node scripts/render-cren-graphic.mjs --spec card.json --out content/images/YYYY-MM-DD-slug.png
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { perceptualHash, renderCard } from './cren-graphic-lib.mjs';

const arg = name => { const index = process.argv.indexOf(`--${name}`); return index > 0 ? process.argv[index + 1] : undefined; };
const specPath = arg('spec');
const outPath = arg('out');
if (!specPath || !outPath) throw new Error('USAGE: --spec card.json --out content/images/YYYY-MM-DD-slug.png');
if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.png$/.test(basename(outPath))) throw new Error('CARD_OUTPUT_NAME_INVALID');
if (existsSync(outPath)) throw new Error('CARD_OUTPUT_EXISTS');

const compareDir = arg('compare-dir') ?? dirname(outPath);
const compareHashes = [];
if (existsSync(compareDir)) {
  for (const name of readdirSync(compareDir).filter(file => /\.(png|jpe?g|webp)$/i.test(file))) {
    // A skipped file would silently weaken the duplicate check, so an unreadable one stops the run.
    try { compareHashes.push(await perceptualHash(readFileSync(join(compareDir, name)))); }
    catch (error) { throw new Error(`CARD_COMPARE_IMAGE_INVALID: ${name}: ${error.message}`); }
  }
}
let spec;
try { spec = JSON.parse(readFileSync(specPath, 'utf8')); }
catch (error) { throw new Error(`CARD_SPEC_PARSE_ERROR: ${error.message}`); }
const card = await renderCard(spec, { compareHashes });
writeFileSync(outPath, card.bytes);
console.log(JSON.stringify({
  path: outPath, bytes: card.bytes.length, git_blob_sha: card.gitBlobSha, source_sha256: card.sourceSha256,
  perceptual_hash: card.perceptualHash, compared_images: compareHashes.length, min_distance: card.minDistance,
}, null, 2));
