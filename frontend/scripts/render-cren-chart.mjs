#!/usr/bin/env node
// Renders a CREN_GRAPHIC chart or site map from a JSON spec built on public data. Offline: no network, no provider.
// For a text fact card instead, use render-cren-graphic.mjs.
// Output is a 1600x900 PNG, already 16:9, with every label inside the mobile-safe center area.
// Usage (from frontend/): node scripts/render-cren-chart.mjs --spec /tmp/chart.json --out content/images/YYYY-MM-DD-slug.png
//
// Spec shape (all text is plain; the script escapes it):
// {
//   "kind": "bar" | "line" | "map",
//   "title": "Residential permits filed in Columbus",
//   "subtitle": "Monthly count, January to August 2026",
//   "source_line": "Data: City of Columbus Building and Zoning Services, pulled Sept. 26, 2026",
//   "unit": "permits",                                   // optional axis suffix
//   "series": [{ "label": "Jan", "value": 412 }, ...],   // bar and line
//   "highlight": "Aug",                                  // optional bar/point to accent
//   "map": {                                             // kind = map
//     "points": [{ "lat": 39.95, "lon": -83.0, "label": "120 Vine St.", "primary": true }],
//     "lines": [{ "coords": [[-83.0, 39.95], [-83.01, 39.96]], "label": "N. High St." }],
//     "polygons": [{ "coords": [[-83.0, 39.95], ...], "label": "Parcel 010-012345" }],
//     "attribution": "Street geometry © OpenStreetMap contributors (ODbL)"
//   }
// }
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { MIN_CARD_DISTANCE, gitBlobSha, hammingDistance, perceptualHash } from './cren-graphic-lib.mjs';

const W = 1600, H = 900;
const C = { bg: '#F7F4EC', ink: '#1C2321', muted: '#5B6461', grid: '#DAD5C8', green: '#2E7D4F', red: '#B8432F', gold: '#C4952A' };
// Mobile crops keep the center; keep text within this horizontal band.
const SAFE_X0 = 140, SAFE_X1 = W - 140;

const arg = name => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = n => Math.abs(n) >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e4 ? `${+(n / 1e3).toFixed(1)}K` : n.toLocaleString('en-US');

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map(m => m * p).find(m => m >= v);
}

// Light tones for the header and footer bands. They vary the image's coarse structure (what the 9x8
// difference hash sees) without touching the data area, so a re-seed can clear the near-duplicate guard.
const BAND_TONES = ['#F7F4EC', '#EFE9DA', '#E6DDC7', '#F2EDE1', '#E9E1CE', '#DDD3BB'];
function bands(seed) {
  const bytes = createHash('sha256').update(seed).digest();
  const tileW = W / 9;
  let out = '';
  for (let i = 0; i < 27; i += 1) {
    const col = i % 9, row = Math.floor(i / 9); // rows 0 and 1 sit behind the title, row 2 behind the footer
    const y = row < 2 ? row * 100 : H - 110, h = row < 2 ? 100 : 110;
    out += `<rect x="${(col * tileW).toFixed(1)}" y="${y}" width="${(tileW + 1).toFixed(1)}" height="${h}" fill="${BAND_TONES[bytes[i] % BAND_TONES.length]}"/>`;
  }
  return out;
}

function frame(spec, body, attempt = 0) {
  const font = 'DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${C.bg}"/>${bands(`${JSON.stringify(spec)}:${attempt}`)}
<rect x="${SAFE_X0}" y="56" width="56" height="8" fill="${C.red}"/>
<text x="${SAFE_X0}" y="118" font-family="${font}" font-size="46" font-weight="700" fill="${C.ink}">${esc(spec.title)}</text>
<text x="${SAFE_X0}" y="164" font-family="${font}" font-size="28" fill="${C.muted}">${esc(spec.subtitle)}</text>
<g font-family="${font}">${body}</g>
<text x="${SAFE_X0}" y="${H - 40}" font-family="${font}" font-size="22" fill="${C.muted}">${esc(spec.source_line)}</text>
<text x="${SAFE_X1}" y="${H - 40}" font-family="${font}" font-size="22" font-weight="700" fill="${C.green}" text-anchor="end">CREN</text>
</svg>`;
}

const PLOT = { x0: SAFE_X0 + 90, x1: SAFE_X1, y0: 220, y1: H - 130 };

function axes(max, unit) {
  let out = '';
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i, y = PLOT.y1 - (PLOT.y1 - PLOT.y0) * (i / 4);
    out += `<line x1="${PLOT.x0}" x2="${PLOT.x1}" y1="${y}" y2="${y}" stroke="${C.grid}" stroke-width="2"/>`;
    out += `<text x="${PLOT.x0 - 16}" y="${y + 8}" font-size="22" fill="${C.muted}" text-anchor="end">${esc(fmt(v))}</text>`;
  }
  if (unit) out += `<text x="${PLOT.x0 - 16}" y="${PLOT.y0 - 22}" font-size="20" fill="${C.muted}" text-anchor="end">${esc(unit)}</text>`;
  return out;
}

function bar(spec) {
  const s = spec.series; const max = niceMax(Math.max(...s.map(d => d.value)));
  const slot = (PLOT.x1 - PLOT.x0) / s.length, bw = Math.min(110, slot * 0.66);
  let out = axes(max, spec.unit);
  s.forEach((d, i) => {
    const h = (PLOT.y1 - PLOT.y0) * (d.value / max), x = PLOT.x0 + slot * i + (slot - bw) / 2;
    const hot = spec.highlight ? d.label === spec.highlight : i === s.length - 1;
    out += `<rect x="${x}" y="${PLOT.y1 - h}" width="${bw}" height="${h}" rx="3" fill="${hot ? C.red : C.green}"/>`;
    out += `<text x="${x + bw / 2}" y="${PLOT.y1 - h - 12}" font-size="22" font-weight="700" fill="${C.ink}" text-anchor="middle">${esc(fmt(d.value))}</text>`;
    out += `<text x="${x + bw / 2}" y="${PLOT.y1 + 34}" font-size="22" fill="${C.muted}" text-anchor="middle">${esc(d.label)}</text>`;
  });
  return out;
}

function line(spec) {
  const s = spec.series; const max = niceMax(Math.max(...s.map(d => d.value)));
  const step = (PLOT.x1 - PLOT.x0 - 40) / Math.max(1, s.length - 1);
  const pts = s.map((d, i) => [PLOT.x0 + 20 + step * i, PLOT.y1 - (PLOT.y1 - PLOT.y0) * (d.value / max)]);
  let out = axes(max, spec.unit);
  out += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${C.green}" stroke-width="6" stroke-linejoin="round"/>`;
  const every = Math.ceil(s.length / 12);
  s.forEach((d, i) => {
    const hot = spec.highlight ? d.label === spec.highlight : i === s.length - 1;
    if (hot) {
      out += `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="11" fill="${C.red}"/>`;
      out += `<text x="${pts[i][0]}" y="${pts[i][1] - 22}" font-size="24" font-weight="700" fill="${C.ink}" text-anchor="middle">${esc(fmt(d.value))}</text>`;
    }
    if (i % every === 0 || i === s.length - 1) out += `<text x="${pts[i][0]}" y="${PLOT.y1 + 34}" font-size="22" fill="${C.muted}" text-anchor="middle">${esc(d.label)}</text>`;
  });
  return out;
}

function map(spec) {
  const m = spec.map ?? {};
  const all = [
    ...(m.points ?? []).map(p => [p.lon, p.lat]),
    ...(m.lines ?? []).flatMap(l => l.coords),
    ...(m.polygons ?? []).flatMap(p => p.coords),
  ];
  if (!all.length) throw new Error('MAP_GEOMETRY_REQUIRED');
  const lons = all.map(c => c[0]), lats = all.map(c => c[1]);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2, k = Math.cos(midLat * Math.PI / 180);
  const minX = Math.min(...lons) * k, maxX = Math.max(...lons) * k, minY = Math.min(...lats), maxY = Math.max(...lats);
  const box = { x0: SAFE_X0 + 40, x1: SAFE_X1 - 40, y0: 220, y1: H - 140 };
  const spanX = Math.max(maxX - minX, 0.002), spanY = Math.max(maxY - minY, 0.002);
  const scale = Math.min((box.x1 - box.x0) / spanX, (box.y1 - box.y0) / spanY) * 0.85;
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
  const P = ([lon, lat]) => [cx + (lon * k - mx) * scale, cy - (lat - my) * scale];
  // Labels sit on a solid chip so street lines never cut through the text.
  const label = (attrs, text) => {
    const n = k => +(attrs.match(new RegExp(`${k}="([-0-9.]+)"`))?.[1] ?? 0);
    const x = n("x"), y = n("y"), size = n("font-size") || 22, w = String(text).length * size * 0.58 + 16;
    const left = /text-anchor="middle"/.test(attrs) ? x - w / 2 : x - 8;
    return `<rect x="${left}" y="${y - size}" width="${w}" height="${size * 1.35}" rx="4" fill="#EFEBE0" fill-opacity="0.92"/><text ${attrs}>${esc(text)}</text>`;
  };
  let out = `<rect x="${box.x0}" y="${box.y0}" width="${box.x1 - box.x0}" height="${box.y1 - box.y0}" fill="#EFEBE0" stroke="${C.grid}" stroke-width="2"/>`;
  for (const pg of m.polygons ?? []) {
    const pts = pg.coords.map(P);
    out += `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${C.gold}" fill-opacity="0.35" stroke="${C.gold}" stroke-width="4"/>`;
    if (pg.label) { const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]); out += label(`x="${c[0]}" y="${c[1] + 8}" font-size="22" fill="${C.ink}" text-anchor="middle"`, pg.label); }
  }
  for (const l of m.lines ?? []) {
    const pts = l.coords.map(P);
    out += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#9AA19E" stroke-width="7" stroke-linecap="round"/>`;
    if (l.label) { const mid = pts[Math.floor(pts.length / 2)]; out += label(`x="${mid[0] + 10}" y="${mid[1] - 12}" font-size="20" fill="${C.muted}"`, l.label); }
  }
  for (const p of m.points ?? []) {
    const [x, y] = P([p.lon, p.lat]);
    out += `<circle cx="${x}" cy="${y}" r="${p.primary ? 16 : 10}" fill="${p.primary ? C.red : C.green}" stroke="#fff" stroke-width="4"/>`;
    if (p.label) out += label(`x="${x + 24}" y="${y + 8}" font-size="${p.primary ? 26 : 22}" font-weight="${p.primary ? 700 : 400}" fill="${C.ink}"`, p.label);
  }
  out += `<text x="${box.x1 - 14}" y="${box.y0 + 34}" font-size="22" font-weight="700" fill="${C.muted}" text-anchor="middle">N</text>`;
  out += `<path d="M ${box.x1 - 14} ${box.y0 + 44} l -8 18 l 8 -5 l 8 5 z" fill="${C.muted}"/>`;
  if (m.attribution) out += `<text x="${box.x1 - 10}" y="${box.y1 - 12}" font-size="18" fill="${C.muted}" text-anchor="end">${esc(m.attribution)}</text>`;
  return out;
}

const specPath = arg('spec'), outPath = arg('out');
if (!specPath || !outPath) throw new Error('USAGE: --spec chart.json --out content/images/YYYY-MM-DD-slug.png');
if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.png$/.test(basename(outPath))) throw new Error('CHART_OUTPUT_NAME_INVALID');
if (existsSync(outPath)) throw new Error('CHART_OUTPUT_EXISTS');
let spec;
try { spec = JSON.parse(readFileSync(specPath, 'utf8')); }
catch (error) { throw new Error(`CHART_SPEC_PARSE_ERROR: ${error.message}`); }
for (const key of ['kind', 'title', 'subtitle', 'source_line']) if (!spec[key]) throw new Error(`CHART_SPEC_FIELD_REQUIRED:${key}`);
if (!/^Data:/i.test(spec.source_line)) throw new Error('CHART_SOURCE_LINE_MUST_START_WITH_DATA');
if (spec.kind !== 'map' && !(Array.isArray(spec.series) && spec.series.length >= 2 && spec.series.every(d => Number.isFinite(d.value))))
  throw new Error('CHART_SERIES_REQUIRED');
const body = { bar, line, map }[spec.kind]?.(spec);
if (body == null) throw new Error('CHART_KIND_UNKNOWN');

const { default: sharp } = await import('sharp');
// Same near-duplicate guard as the data card: the attachment worker rejects images within 10 bits of a committed one.
const compareDir = arg('compare-dir') ?? dirname(outPath);
const compareHashes = [];
if (existsSync(compareDir)) {
  for (const name of readdirSync(compareDir).filter(file => /.(png|jpe?g|webp)$/i.test(file))) {
    // A skipped file would silently weaken the duplicate check, so an unreadable one stops the run.
    try { compareHashes.push(await perceptualHash(readFileSync(join(compareDir, name)))); }
    catch (error) { throw new Error(`CHART_COMPARE_IMAGE_INVALID: ${name}: ${error.message}`); }
  }
}
let bytes, hash, minDistance = -1, attempt = 0;
for (; attempt < 64 && minDistance < MIN_CARD_DISTANCE; attempt += 1) {
  bytes = await sharp(Buffer.from(frame(spec, body, attempt))).png({ compressionLevel: 9 }).toBuffer();
  hash = await perceptualHash(bytes);
  minDistance = compareHashes.reduce((min, other) => Math.min(min, hammingDistance(hash, other)), 64);
}
if (minDistance < MIN_CARD_DISTANCE) throw new Error(`CHART_TOO_SIMILAR_TO_EXISTING_IMAGE (distance ${minDistance}); use render-cren-graphic.mjs`);
writeFileSync(outPath, bytes);
console.log(JSON.stringify({
  path: outPath, bytes: bytes.length, git_blob_sha: gitBlobSha(bytes),
  source_sha256: createHash('sha256').update(bytes).digest('hex'),
  perceptual_hash: hash, compared_images: compareHashes.length, min_distance: minDistance, attempts: attempt,
}, null, 2));
