import { createHash } from 'node:crypto';
import sharp from 'sharp';

export const CARD_WIDTH = 1600;
export const CARD_HEIGHT = 900;
// Stricter than the attachment worker's NEAR_DUPLICATE_MAX_DISTANCE (10) so cards never trip it.
export const MIN_CARD_DISTANCE = 18;
const MAX_ATTEMPTS = 64;
const TILE_COLUMNS = 9;
const TILE_ROWS = 4;
const TILE_TONES = ['#12263a', '#1a3450', '#224566', '#2b577c', '#356a92', '#4180a8', '#4f95bb'];
const FONT = 'DejaVu Sans, Liberation Sans, Arial, sans-serif';

const text = (value, max, field) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`CARD_${field}_INVALID`);
  return value.trim();
};
const escape = value => value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]);

export function validateCardSpec(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new Error('CARD_SPEC_REQUIRED');
  const facts = spec.facts;
  if (!Array.isArray(facts) || facts.length < 1 || facts.length > 3) throw new Error('CARD_FACTS_INVALID');
  return {
    kicker: text(spec.kicker, 48, 'KICKER'),
    headline: text(spec.headline, 110, 'HEADLINE'),
    facts: facts.map(fact => ({ value: text(fact?.value, 12, 'FACT_VALUE'), label: text(fact?.label, 30, 'FACT_LABEL') })),
    location: text(spec.location, 60, 'LOCATION'),
    source: text(spec.source, 110, 'SOURCE'),
  };
}

function wrap(value, maxChars, maxLines) {
  const lines = [];
  for (const word of value.split(/\s+/)) {
    const last = lines.at(-1);
    if (last && `${last} ${word}`.length <= maxChars) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  if (lines.length > maxLines || lines.some(line => line.length > maxChars)) throw new Error('CARD_HEADLINE_TOO_LONG');
  return lines;
}

function seededTones(seed) {
  const bytes = createHash('sha256').update(seed).digest();
  return Array.from({ length: TILE_COLUMNS * TILE_ROWS }, (_, index) => TILE_TONES[bytes[index % bytes.length] % TILE_TONES.length]);
}

export function buildCardSvg(input, attempt = 0) {
  const spec = validateCardSpec(input);
  const tones = seededTones(`${JSON.stringify(spec)}:${attempt}`);
  const tileW = CARD_WIDTH / TILE_COLUMNS;
  const tileH = 450 / TILE_ROWS;
  const tiles = tones.map((tone, index) => {
    const x = (index % TILE_COLUMNS) * tileW;
    const y = Math.floor(index / TILE_COLUMNS) * tileH;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(tileW + 1).toFixed(1)}" height="${(tileH + 1).toFixed(1)}" fill="${tone}"/>`;
  }).join('');
  const factWidth = 1440 / spec.facts.length;
  const facts = spec.facts.map((fact, index) => {
    const x = 80 + index * factWidth;
    const inner = factWidth - 32 - 72;
    // Bold DejaVu glyphs average under 0.68em; sizing to that keeps every value inside its box.
    const valueSize = Math.min(92, Math.floor(inner / (fact.value.length * 0.68)));
    const labelSize = Math.min(34, Math.floor(inner / (fact.label.length * 0.56)));
    return `<rect x="${x}" y="120" width="${factWidth - 32}" height="210" rx="14" fill="#0b1826" fill-opacity="0.82"/>`
      + `<text x="${x + 36}" y="228" font-family="${FONT}" font-size="${valueSize}" font-weight="700" fill="#ffffff">${escape(fact.value)}</text>`
      + `<text x="${x + 38}" y="290" font-family="${FONT}" font-size="${labelSize}" fill="#cfe3f2">${escape(fact.label)}</text>`;
  }).join('');
  const headline = wrap(spec.headline, 38, 3).map((line, index) =>
    `<text x="80" y="${566 + index * 62}" font-family="${FONT}" font-size="52" font-weight="700" fill="#ffffff">${escape(line)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">`
    + `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#0f1e2e"/>${tiles}`
    + `<text x="80" y="76" font-family="${FONT}" font-size="30" font-weight="700" letter-spacing="3" fill="#ffffff">${escape(spec.kicker.toUpperCase())}</text>`
    + facts
    + `<rect x="80" y="480" width="120" height="8" fill="#f2b134"/>${headline}`
    + `<text x="80" y="786" font-family="${FONT}" font-size="34" fill="#cfe3f2">${escape(spec.location)}</text>`
    + `<text x="80" y="848" font-family="${FONT}" font-size="${Math.min(26, Math.floor(1160 / (spec.source.length * 0.56)))}" fill="#9fb6c8">${escape(spec.source)}</text>`
    + `<text x="1520" y="848" text-anchor="end" font-family="${FONT}" font-size="26" font-weight="700" fill="#9fb6c8">CREN graphic</text>`
    + '</svg>';
}

/** Same 9x8 difference hash as lib/article-image-fingerprint-core.ts. */
export async function perceptualHash(bytes) {
  const raw = await sharp(Buffer.from(bytes)).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let hash = '';
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 4) {
      let nibble = 0;
      for (let bit = 0; bit < 4; bit += 1) {
        const index = row * 9 + column + bit;
        nibble = (nibble << 1) | (raw[index] > raw[index + 1] ? 1 : 0);
      }
      hash += nibble.toString(16);
    }
  }
  return hash;
}

export function hammingDistance(left, right) {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    let difference = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    while (difference) { distance += difference & 1; difference >>= 1; }
  }
  return distance;
}

export function gitBlobSha(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

/** Renders a deterministic PNG whose layout tiles keep it clear of every compared image. */
export async function renderCard(spec, { compareHashes = [] } = {}) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const bytes = await sharp(Buffer.from(buildCardSvg(spec, attempt))).png({ compressionLevel: 9 }).toBuffer();
    const hash = await perceptualHash(bytes);
    const minDistance = compareHashes.reduce((min, other) => Math.min(min, hammingDistance(hash, other)), 64);
    if (minDistance >= MIN_CARD_DISTANCE) {
      return {
        bytes, attempt, perceptualHash: hash, minDistance,
        sourceSha256: createHash('sha256').update(bytes).digest('hex'), gitBlobSha: gitBlobSha(bytes),
      };
    }
  }
  throw new Error('CARD_TOO_SIMILAR_TO_EXISTING_IMAGE');
}
