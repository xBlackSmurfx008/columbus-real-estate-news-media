const CITY_AREAS = [
  ["columbus-citywide", "Columbus citywide", "Columbus"],
  ["dublin", "Dublin", "Dublin"],
  ["upper-arlington", "Upper Arlington", "Upper Arlington"],
  ["new-albany", "New Albany", "New Albany"],
  ["bexley", "Bexley", "Bexley"],
  ["westerville", "Westerville", "Westerville"],
  ["worthington", "Worthington", "Worthington"],
  ["hilliard", "Hilliard", "Hilliard"],
  ["gahanna", "Gahanna", "Gahanna"],
  ["grandview-heights", "Grandview Heights", "Grandview Heights"],
];

const NEIGHBORHOOD_AREAS = [
  ["german-village", "German Village", "German Village"],
  ["short-north", "Short North", "Short North"],
  ["clintonville", "Clintonville", "Clintonville"],
  ["franklinton", "Franklinton", "Franklinton"],
];

export const ZILLOW_FEEDS = {
  zhviCity: "https://files.zillowstatic.com/research/public_csvs/zhvi/City_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
  zhviNeighborhood: "https://files.zillowstatic.com/research/public_csvs/zhvi/Neighborhood_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
  zoriCity: "https://files.zillowstatic.com/research/public_csvs/zori/City_zori_uc_sfrcondomfr_sm_month.csv",
};

export const FRED_FEED = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US";

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      values.push(current);
      current = "";
    } else current += character;
  }
  values.push(current);
  return values;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0] ?? "");
  return { header, rows: lines.slice(1).map(parseCsvLine) };
}

function monthStart(date) {
  return `${date.slice(0, 7)}-01`;
}

function latestSeriesValue(row, dateColumns) {
  for (let index = dateColumns.length - 1; index >= 0; index -= 1) {
    const column = dateColumns[index];
    const value = row[column.index];
    if (value !== undefined && value !== "" && Number.isFinite(Number(value))) {
      return { periodEnd: column.date, value: Number(value) };
    }
  }
  return null;
}

export function buildZillowObservations(text, { metricKey, label, propertyType, sourceUrl, methodologyUrl = "https://www.zillow.com/research/data/", notes }, asOfDate, areas, geographyType = "city") {
  const { header, rows } = parseCsv(text);
  const columnIndex = (name) => header.indexOf(name);
  const dateColumns = header
    .map((date, index) => (/^\d{4}-\d{2}-\d{2}$/.test(date) ? { date, index } : null))
    .filter(Boolean);
  const stateIndex = columnIndex("State");
  const metroIndex = columnIndex("Metro");
  const regionIndex = columnIndex("RegionName");
  const byName = new Map(areas.map(([slug, areaLabel, sourceName]) => [sourceName, { slug, areaLabel }]));
  const observations = [];

  for (const row of rows) {
    if (row[stateIndex] !== "OH" || row[metroIndex] !== "Columbus, OH") continue;
    const area = byName.get(row[regionIndex]);
    if (!area) continue;
    const latest = latestSeriesValue(row, dateColumns);
    if (!latest) continue;
    observations.push({
      metric_key: metricKey,
      label,
      value_display: `$${Math.round(latest.value).toLocaleString("en-US")}`,
      value_numeric: latest.value,
      unit: "USD",
      geography_type: geographyType,
      geography_slug: area.slug,
      geography_label: area.areaLabel,
      property_type: propertyType,
      period_start: monthStart(latest.periodEnd),
      period_end: latest.periodEnd,
      as_of_date: asOfDate,
      source_slug: "zillow-research",
      source_url: sourceUrl,
      methodology_url: methodologyUrl,
      notes,
    });
  }
  return observations;
}

export function buildMortgageObservation(text, asOfDate) {
  const rows = text.split(/\r?\n/).filter(Boolean).slice(1);
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const [date, value] = rows[index].split(",");
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && value && value !== "." && Number.isFinite(Number(value))) {
      return {
        metric_key: "mortgage-30-year-fixed",
        label: "30-year fixed mortgage rate",
        value_display: `${Number(value).toFixed(2)}%`,
        value_numeric: Number(value),
        unit: "percent",
        geography_type: "national",
        geography_slug: "united-states",
        geography_label: "United States",
        property_type: "all-residential",
        period_start: date,
        period_end: date,
        as_of_date: asOfDate,
        source_slug: "freddie-mac-pmms",
        source_url: FRED_FEED,
        methodology_url: "https://www.freddiemac.com/pmms",
        notes: "Freddie Mac PMMS is a national weekly survey average, not a Columbus borrower quote.",
      };
    }
  }
  return null;
}

export function getCityAreas() {
  return CITY_AREAS;
}

export function getNeighborhoodAreas() {
  return NEIGHBORHOOD_AREAS;
}
