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
    compareHashes.push(await perceptualHash(readFileSync(join(compareDir, name))));
  }
}
const card = await renderCard(JSON.parse(readFileSync(specPath, 'utf8')), { compareHashes });
writeFileSync(outPath, card.bytes);
console.log(JSON.stringify({
  path: outPath, bytes: card.bytes.length, git_blob_sha: card.gitBlobSha, source_sha256: card.sourceSha256,
  perceptual_hash: card.perceptualHash, compared_images: compareHashes.length, min_distance: card.minDistance,
}, null, 2));
