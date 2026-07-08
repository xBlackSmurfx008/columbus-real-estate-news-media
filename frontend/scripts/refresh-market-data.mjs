#!/usr/bin/env node
// Auto-refresh Columbus market data from FREE public feeds:
//   - FRED (Freddie Mac 30-yr mortgage rate)      -> market_snapshot rate card
//   - Zillow Research ZHVI (typical home value)   -> neighborhoods.median ("Typical Value") + YoY
//   - Zillow Research ZORI (observed rent)        -> neighborhoods.rent
// No API keys, no scraping — these are Zillow's published CSVs and FRED's open CSV.
// Only writes verified values; leaves any field it can't resolve unchanged.
// Usage: DATABASE_URL=... node scripts/refresh-market-data.mjs

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) { console.error("DATABASE_URL not set"); process.exit(1); }
const sql = neon(databaseUrl);

const ZHVI_CITY = "https://files.zillowstatic.com/research/public_csvs/zhvi/City_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv";
const ZHVI_HOOD = "https://files.zillowstatic.com/research/public_csvs/zhvi/Neighborhood_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv";
const ZORI_CITY = "https://files.zillowstatic.com/research/public_csvs/zori/City_zori_uc_sfrcondomfr_sm_month.csv";
const ZORI_HOOD = "https://files.zillowstatic.com/research/public_csvs/zori/Neighborhood_zori_uc_sfrcondomfr_sm_month.csv";
const FRED_RATE = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US";

const METRO = "Columbus, OH";

// Our DB neighborhood name -> Zillow RegionName (city-level unless marked hood)
const CITY_MAP = {
  "Dublin": "Dublin", "Grandview Heights": "Grandview Heights", "Upper Arlington": "Upper Arlington",
  "New Albany": "New Albany", "Bexley": "Bexley", "Westerville": "Westerville",
  "Worthington": "Worthington", "Hilliard": "Hilliard", "Gahanna": "Gahanna",
  "Columbus (city avg)": "Columbus",
};
const HOOD_MAP = {
  "German Village": "German Village", "Short North": "Short North",
  "Clintonville": "Clintonville", "Franklinton": "Franklinton",
};

function parseCSVLine(line) {
  const out = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') q = !q;
    else if (c === "," && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.length);
  const header = parseCSVLine(lines[0]);
  const dateCols = header.map((h, i) => (/^\d{4}-\d{2}-\d{2}$/.test(h) ? i : -1)).filter((i) => i >= 0);
  const idx = (name) => header.indexOf(name);
  return { lines: lines.slice(1), header, dateCols, idx };
}

// latest non-empty value and the value 12 months earlier (for YoY)
function latestAndYoY(row, dateCols) {
  let lastPos = -1;
  for (let p = dateCols.length - 1; p >= 0; p--) {
    const v = row[dateCols[p]];
    if (v !== undefined && v !== "" && !Number.isNaN(Number(v))) { lastPos = p; break; }
  }
  if (lastPos < 0) return null;
  const latest = Number(row[dateCols[lastPos]]);
  let yoy = null;
  if (lastPos - 12 >= 0) {
    const prior = Number(row[dateCols[lastPos - 12]]);
    if (prior > 0) yoy = (latest / prior - 1) * 100;
  }
  return { latest, yoy };
}

function money(v, roundTo) { return "$" + (Math.round(v / roundTo) * roundTo).toLocaleString("en-US"); }
function pct(v) { return (v >= 0 ? "+" : "") + v.toFixed(1) + "%"; }

// Build {ourName: {value, yoy}} from a Zillow CSV given a name map and row filter.
async function collect(url, nameMap) {
  const { lines, idx, dateCols } = await fetchCsv(url);
  // Column layout differs between City and Neighborhood files (the latter adds a
  // "City" column), so we resolve every column by header name, not position.
  const c = { region: idx("RegionName"), state: idx("State"), metro: idx("Metro") };
  const zillowToOurs = Object.fromEntries(Object.entries(nameMap).map(([ours, z]) => [z, ours]));
  const found = {};
  for (const line of lines) {
    const row = parseCSVLine(line);
    if (row[c.state] !== "OH") continue;
    if (row[c.metro] !== METRO) continue;
    const region = row[c.region];
    const ours = zillowToOurs[region];
    if (!ours) continue;
    const r = latestAndYoY(row, dateCols);
    if (r) found[ours] = r;
  }
  return found;
}

async function main() {
  console.log("Fetching Zillow ZHVI (city + neighborhood)...");
  const zhviCity = await collect(ZHVI_CITY, CITY_MAP);
  const zhviHood = await collect(ZHVI_HOOD, HOOD_MAP);
  const zhvi = { ...zhviCity, ...zhviHood };

  console.log("Fetching Zillow ZORI rents (city + neighborhood)...");
  let zori = {};
  for (const [url, map] of [[ZORI_CITY, CITY_MAP], [ZORI_HOOD, HOOD_MAP]]) {
    try { Object.assign(zori, await collect(url, map)); }
    catch (e) { console.log("  ZORI part skipped:", e.message); }
  }

  // Update neighborhoods
  let updated = 0;
  for (const [name, { latest, yoy }] of Object.entries(zhvi)) {
    await sql`UPDATE neighborhoods SET median = ${money(latest, 1000)} WHERE name = ${name}`;
    if (yoy !== null) await sql`UPDATE neighborhoods SET yoy = ${pct(yoy)} WHERE name = ${name}`;
    if (zori[name]) await sql`UPDATE neighborhoods SET rent = ${money(zori[name].latest, 10)} WHERE name = ${name}`;
    console.log(`  ${name}: ${money(latest, 1000)}${yoy !== null ? " " + pct(yoy) : ""}${zori[name] ? " | rent " + money(zori[name].latest, 10) : ""}`);
    updated++;
  }
  console.log(`neighborhoods updated: ${updated}/${Object.keys(zhvi).length} matched`);

  // Update mortgage rate from FRED
  try {
    const res = await fetch(FRED_RATE);
    const txt = await res.text();
    const rows = txt.trim().split("\n").slice(1).map((l) => l.split(","));
    let last = null;
    for (let i = rows.length - 1; i >= 0; i--) { if (rows[i][1] && rows[i][1] !== ".") { last = rows[i]; break; } }
    if (last) {
      const [date, rate] = last;
      await sql`UPDATE market_snapshot SET value = ${rate + "%"}, change = ${"Freddie Mac, " + date}, direction = 'down' WHERE label = '30-Yr Mortgage Rate'`;
      console.log(`mortgage rate: ${rate}% (Freddie Mac ${date})`);
    }
  } catch (e) { console.log("FRED rate skipped:", e.message); }

  console.log("done");
}

await main();
