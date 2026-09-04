// ============================================================
// Canonical market-data core (pure, dependency-free).
//
// One rule: a public market number exists in exactly one shape,
// and that shape always carries its provenance —
//   value + geography + period + source + updated_at.
//
// Why this file exists (2026-09-04 owner review): the same metric
// was rendering different values on different pages because four
// independent copies of the numbers existed —
//   1. market_snapshot (DB, current)
//   2. content/snapshot/public-data.json (committed outage fallback, stale)
//   3. hero_stats (DB, hand-maintained homepage bar)
//   4. columbusrealestatenews-v{2,3}.html (indexed prototypes)
// Nothing reconciled them and nothing stamped an updated_at.
//
// Every public surface now derives from buildMarketDataSet(): the
// homepage stat bar, /market-data, /embed/market-data, area hubs,
// article components, and structured data. Surfaces choose which
// metrics to show; they never choose the value.
//
// This module is deliberately import-free so it can be unit tested
// with `node --test` and reused from build scripts.
// ============================================================

export type MarketGeographyType = "national" | "metro" | "city" | "neighborhood";

export interface MarketGeography {
  slug: string;
  label: string;
  type: MarketGeographyType;
}

export interface MarketPeriod {
  /** ISO date of the first day covered, when the source states one. */
  start: string | null;
  /** ISO date of the last day covered, when it is stated or unambiguously derivable. */
  end: string | null;
  /** Human label exactly as the source describes the reporting period. */
  label: string;
  /** How precisely the period is known. Never guessed beyond what the source says. */
  precision: "day" | "month" | "unknown";
}

export interface MarketSource {
  name: string | null;
  url: string | null;
  methodologyUrl: string | null;
  /** ISO date the value was observed/collected, when known. */
  asOf: string | null;
}

export type MarketDirection = "up" | "down" | "neutral";

export interface MarketMetric {
  /** Stable identity: metricKey + geography.slug + propertyType. */
  id: string;
  metricKey: string;
  label: string;
  /** Display string exactly as stored. Never computed, never rounded here. */
  value: string;
  /** Numeric form when the display string parses cleanly; null otherwise. */
  valueNumeric: number | null;
  /** Change/context line as stored (e.g. "+9.8% YoY"). Null when the source has none. */
  changeLabel: string | null;
  direction: MarketDirection;
  propertyType: string;
  geography: MarketGeography;
  period: MarketPeriod;
  source: MarketSource;
  /** ISO timestamp for the freshest thing we know about this value. */
  updatedAt: string | null;
  /** Which store the surviving record came from. */
  origin: "observation" | "snapshot";
  /** False when source name or URL is missing — surfaces must not present it as sourced. */
  hasCompleteProvenance: boolean;
}

export interface MarketMetricConflict {
  id: string;
  metricKey: string;
  geographySlug: string;
  propertyType: string;
  kind: "value" | "period";
  entries: Array<{ origin: string; value: string; periodLabel: string; source: string | null }>;
}

export interface MarketDataSet {
  metrics: MarketMetric[];
  conflicts: MarketMetricConflict[];
  /** Freshest updatedAt across all metrics, or null when nothing is dated. */
  updatedAt: string | null;
  /** True when the set came from the committed outage fallback rather than the DB. */
  fromFallback: boolean;
}

// ---------- input row shapes (mirror the DB tables) ----------

export interface MarketObservationRow {
  id: number | string;
  metric_key: string;
  label: string;
  value_display: string;
  value_numeric: string | number | null;
  unit?: string | null;
  geography_type: string;
  geography_slug: string;
  geography_label: string;
  property_type: string;
  period_start: string | null;
  period_end: string;
  as_of_date: string;
  source_name: string;
  source_url: string;
  methodology_url: string | null;
  notes?: string | null;
}

export interface MarketSnapshotRow {
  id: number | string;
  label: string;
  value: string;
  change: string;
  direction: string;
  sort_order?: number;
  source_name?: string | null;
  source_url?: string | null;
  source_date?: string | null;
  methodology?: string | null;
}

// ---------- geography + metric vocabulary ----------

/**
 * The Columbus REALTORS series covers the Columbus & Central Ohio MLS
 * footprint — a different geography from Zillow's "Columbus" city series.
 * Keeping them as separate geographies is what stops a metro median sale
 * price from being compared against a city typical home value.
 */
export const METRO_GEOGRAPHY: MarketGeography = {
  slug: "columbus-metro",
  label: "Columbus & Central Ohio",
  type: "metro",
};

export const NATIONAL_GEOGRAPHY: MarketGeography = {
  slug: "united-states",
  label: "United States",
  type: "national",
};

/** market_snapshot rows are label-keyed; this maps them into the canonical vocabulary. */
const SNAPSHOT_LABEL_MAP: Record<string, { metricKey: string; geography: MarketGeography }> = {
  "median sale price": { metricKey: "median-sale-price", geography: METRO_GEOGRAPHY },
  "active listings": { metricKey: "active-listings", geography: METRO_GEOGRAPHY },
  "months of supply": { metricKey: "months-of-supply", geography: METRO_GEOGRAPHY },
  "new listings": { metricKey: "new-listings", geography: METRO_GEOGRAPHY },
  "homes sold": { metricKey: "homes-sold", geography: METRO_GEOGRAPHY },
  "days on market": { metricKey: "days-on-market", geography: METRO_GEOGRAPHY },
  "avg days on market": { metricKey: "days-on-market", geography: METRO_GEOGRAPHY },
  "average days on market": { metricKey: "days-on-market", geography: METRO_GEOGRAPHY },
  "30-yr mortgage rate": { metricKey: "mortgage-30-year-fixed", geography: NATIONAL_GEOGRAPHY },
  "30-year mortgage rate": { metricKey: "mortgage-30-year-fixed", geography: NATIONAL_GEOGRAPHY },
};

/** Display order for the metro headline bar. Surfaces share it so they cannot drift apart. */
export const HEADLINE_METRIC_ORDER = [
  "median-sale-price",
  "active-listings",
  "months-of-supply",
  "days-on-market",
  "mortgage-30-year-fixed",
];

export function slugifyMetricLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function geographyTypeOf(raw: string): MarketGeographyType {
  if (raw === "national" || raw === "metro" || raw === "city" || raw === "neighborhood") return raw;
  return "city";
}

function normalizeDirection(raw: string | null | undefined): MarketDirection {
  if (raw === "up" || raw === "down") return raw;
  return "neutral";
}

// ---------- value + date normalization ----------

const K_M_SUFFIX = /^(-?[\d.]+)\s*([km])$/;

/**
 * Reduce a display string to a comparable form so "$350,000" and "$350K"
 * are recognised as the same number while genuinely different values
 * ("+9.8% YoY" vs "+7% YoY") still compare unequal.
 * Returns a number when the string is numeric, else a lowercased string.
 */
export function normalizeMetricValue(value: string): number | string {
  const trimmed = String(value ?? "").trim().toLowerCase();
  if (!trimmed) return "";
  const stripped = trimmed.replace(/[$,%\s]/g, "").replace(/,/g, "");
  const suffixed = K_M_SUFFIX.exec(stripped);
  if (suffixed) {
    const base = Number(suffixed[1]);
    if (Number.isFinite(base)) return suffixed[2] === "k" ? base * 1_000 : base * 1_000_000;
  }
  const plain = Number(stripped.replace(/^\+/, ""));
  if (stripped !== "" && Number.isFinite(plain)) return plain;
  return trimmed;
}

export function parseNumericValue(value: string): number | null {
  const normalized = normalizeMetricValue(value);
  return typeof normalized === "number" ? normalized : null;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function lastDayOfMonth(year: number, month: number): string {
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = String(value);
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  if (match) return match[1]!;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

/**
 * Read a reporting period out of a market_snapshot `source_date` string
 * such as "July 2026 report, released August 12, 2026" or "August 27, 2026".
 * Only what the string actually states is used; when nothing parses the
 * period stays unknown rather than being invented.
 */
export function parseSnapshotPeriod(sourceDate: string | null | undefined, fallbackLabel: string): MarketPeriod {
  const raw = (sourceDate ?? "").trim();
  const label = raw || fallbackLabel || "Period not stated";
  if (!raw) return { start: null, end: null, label, precision: "unknown" };

  const fullDate = /(\b[A-Za-z]{3,9})\.?\s+(\d{1,2}),\s*(\d{4})/.exec(raw);
  const monthYear = /(\b[A-Za-z]{3,9})\.?\s+(\d{4})/.exec(raw);

  // "July 2026 report, released August 12, 2026": the reporting period is the
  // leading month-year, not the release date, so a bare month-year that appears
  // before any full date wins.
  if (monthYear && (!fullDate || monthYear.index < fullDate.index)) {
    const month = MONTHS[monthYear[1]!.toLowerCase()];
    const year = Number(monthYear[2]);
    if (month && Number.isFinite(year)) {
      return {
        start: `${year}-${String(month).padStart(2, "0")}-01`,
        end: lastDayOfMonth(year, month),
        label,
        precision: "month",
      };
    }
  }

  if (fullDate) {
    const month = MONTHS[fullDate[1]!.toLowerCase()];
    const year = Number(fullDate[3]);
    const day = Number(fullDate[2]);
    if (month && Number.isFinite(year) && Number.isFinite(day)) {
      const end = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { start: end, end, label, precision: "day" };
    }
  }

  return { start: null, end: null, label, precision: "unknown" };
}

// ---------- builders ----------

function metricId(metricKey: string, geographySlug: string, propertyType: string): string {
  return `${metricKey}::${geographySlug}::${propertyType}`;
}

function observationToMetric(row: MarketObservationRow): MarketMetric {
  const periodEnd = isoDate(row.period_end);
  const geography: MarketGeography = {
    slug: row.geography_slug,
    label: row.geography_label,
    type: geographyTypeOf(row.geography_type),
  };
  const propertyType = row.property_type || "all-residential";
  const asOf = isoDate(row.as_of_date);
  const numeric = row.value_numeric === null || row.value_numeric === undefined
    ? parseNumericValue(row.value_display)
    : Number(row.value_numeric);

  return {
    id: metricId(row.metric_key, geography.slug, propertyType),
    metricKey: row.metric_key,
    label: row.label,
    value: row.value_display,
    valueNumeric: Number.isFinite(numeric as number) ? (numeric as number) : null,
    changeLabel: null,
    direction: "neutral",
    propertyType,
    geography,
    period: {
      start: isoDate(row.period_start),
      end: periodEnd,
      label: periodEnd ? `Period ending ${periodEnd}` : "Period not stated",
      precision: periodEnd ? "day" : "unknown",
    },
    source: {
      name: row.source_name ?? null,
      url: row.source_url ?? null,
      methodologyUrl: row.methodology_url ?? null,
      asOf,
    },
    updatedAt: asOf ?? periodEnd,
    origin: "observation",
    hasCompleteProvenance: Boolean(row.source_name && row.source_url),
  };
}

function snapshotToMetric(row: MarketSnapshotRow): MarketMetric {
  const mapped = SNAPSHOT_LABEL_MAP[row.label.trim().toLowerCase()];
  const metricKey = mapped?.metricKey ?? slugifyMetricLabel(row.label);
  const geography = mapped?.geography ?? METRO_GEOGRAPHY;
  const propertyType = "all-residential";
  const period = parseSnapshotPeriod(row.source_date, row.change);

  return {
    id: metricId(metricKey, geography.slug, propertyType),
    metricKey,
    label: row.label,
    value: row.value,
    valueNumeric: parseNumericValue(row.value),
    changeLabel: row.change?.trim() ? row.change.trim() : null,
    direction: normalizeDirection(row.direction),
    propertyType,
    geography,
    period,
    source: {
      name: row.source_name ?? null,
      url: row.source_url ?? null,
      methodologyUrl: row.methodology ?? null,
      asOf: period.end,
    },
    updatedAt: period.end,
    origin: "snapshot",
    hasCompleteProvenance: Boolean(row.source_name && row.source_url),
  };
}

/** Later-dated record wins; ties prefer the source-aware observation store. */
function preferred(a: MarketMetric, b: MarketMetric): MarketMetric {
  const aDate = a.updatedAt ?? a.period.end ?? "";
  const bDate = b.updatedAt ?? b.period.end ?? "";
  if (aDate !== bDate) return aDate > bDate ? a : b;
  if (a.origin !== b.origin) return a.origin === "observation" ? a : b;
  return a;
}

export interface BuildMarketDataSetInput {
  observations?: MarketObservationRow[];
  snapshotCards?: MarketSnapshotRow[];
  fromFallback?: boolean;
}

/**
 * Reconcile every stored market number into one canonical set.
 *
 * Two records describing the same metric + geography + property type are the
 * same fact. When their values disagree the disagreement is reported as a
 * conflict (the consistency test fails the build on any conflict) and the
 * freshest record is what surfaces render — a stale copy never wins.
 */
export function buildMarketDataSet(input: BuildMarketDataSetInput): MarketDataSet {
  const candidates: MarketMetric[] = [
    ...(input.observations ?? []).map(observationToMetric),
    ...(input.snapshotCards ?? []).map(snapshotToMetric),
  ];

  const grouped = new Map<string, MarketMetric[]>();
  for (const metric of candidates) {
    const existing = grouped.get(metric.id);
    if (existing) existing.push(metric);
    else grouped.set(metric.id, [metric]);
  }

  const metrics: MarketMetric[] = [];
  const conflicts: MarketMetricConflict[] = [];

  for (const [id, group] of grouped) {
    // Only the current (freshest) record of each series is a "current surface"
    // value; older periods of the same series are history, not disagreement.
    const currentDate = group.reduce<string>((max, m) => {
      const d = m.updatedAt ?? m.period.end ?? "";
      return d > max ? d : max;
    }, "");
    const current = group.filter((m) => (m.updatedAt ?? m.period.end ?? "") === currentDate);

    const distinctValues = new Set(current.map((m) => String(normalizeMetricValue(m.value))));
    if (distinctValues.size > 1) {
      const first = current[0]!;
      conflicts.push({
        id,
        metricKey: first.metricKey,
        geographySlug: first.geography.slug,
        propertyType: first.propertyType,
        kind: "value",
        entries: current.map((m) => ({
          origin: m.origin,
          value: m.value,
          periodLabel: m.period.label,
          source: m.source.name,
        })),
      });
    }

    let winner = current.reduce(preferred);
    // Keep the richer change/context line if only one record carries it.
    const withChange = current.find((m) => m.changeLabel);
    if (!winner.changeLabel && withChange) {
      winner = { ...winner, changeLabel: withChange.changeLabel, direction: withChange.direction };
    }
    metrics.push(winner);
  }

  metrics.sort((a, b) => {
    const ai = HEADLINE_METRIC_ORDER.indexOf(a.metricKey);
    const bi = HEADLINE_METRIC_ORDER.indexOf(b.metricKey);
    if (ai !== bi) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    if (a.metricKey !== b.metricKey) return a.metricKey.localeCompare(b.metricKey);
    return a.geography.slug.localeCompare(b.geography.slug);
  });

  const updatedAt = metrics.reduce<string | null>((max, m) => {
    if (!m.updatedAt) return max;
    return !max || m.updatedAt > max ? m.updatedAt : max;
  }, null);

  return { metrics, conflicts, updatedAt, fromFallback: Boolean(input.fromFallback) };
}

export const EMPTY_MARKET_DATA_SET: MarketDataSet = {
  metrics: [],
  conflicts: [],
  updatedAt: null,
  fromFallback: false,
};

// ---------- surface selectors ----------
// Surfaces pick which metrics to show. They never pick the value, which is why
// two surfaces cannot report different numbers for the same series.

export function selectMetric(set: MarketDataSet, metricKey: string, geographySlug?: string): MarketMetric | null {
  return (
    set.metrics.find(
      (m) => m.metricKey === metricKey && (!geographySlug || m.geography.slug === geographySlug),
    ) ?? null
  );
}

/** Metro/national headline bar shared by the homepage, /market-data and the embed. */
export function selectHeadlineMetrics(set: MarketDataSet, limit?: number): MarketMetric[] {
  const headline = set.metrics
    .filter(
      (m) =>
        HEADLINE_METRIC_ORDER.includes(m.metricKey) &&
        (m.geography.type === "metro" || m.geography.type === "national"),
    )
    .sort((a, b) => HEADLINE_METRIC_ORDER.indexOf(a.metricKey) - HEADLINE_METRIC_ORDER.indexOf(b.metricKey));
  return typeof limit === "number" ? headline.slice(0, limit) : headline;
}

/** All metrics for one area hub, ordered by measure then property type. */
export function selectAreaMetrics(set: MarketDataSet, geographySlug: string): MarketMetric[] {
  return set.metrics
    .filter((m) => m.geography.slug === geographySlug)
    .sort((a, b) => a.metricKey.localeCompare(b.metricKey) || a.propertyType.localeCompare(b.propertyType));
}

/** Everything a full dashboard lists: local first, national context last. */
export function selectAllMetrics(set: MarketDataSet): MarketMetric[] {
  const rank: Record<MarketGeographyType, number> = { metro: 0, city: 1, neighborhood: 2, national: 3 };
  return [...set.metrics].sort((a, b) => {
    const r = rank[a.geography.type] - rank[b.geography.type];
    if (r !== 0) return r;
    const ai = HEADLINE_METRIC_ORDER.indexOf(a.metricKey);
    const bi = HEADLINE_METRIC_ORDER.indexOf(b.metricKey);
    if (ai !== bi) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    return a.geography.label.localeCompare(b.geography.label);
  });
}

/** The one place a metric's period is turned into display text. */
export function formatPeriod(metric: MarketMetric): string {
  if (metric.period.precision === "month" && metric.period.end) {
    const [year, month] = metric.period.end.split("-");
    const name = Object.keys(MONTHS).find((k) => k.length > 3 && MONTHS[k] === Number(month));
    const pretty = name ? name.charAt(0).toUpperCase() + name.slice(1) : month;
    return `${pretty} ${year}`;
  }
  if (metric.period.end) return metric.period.end;
  return metric.period.label;
}

/** Source line for display. Returns null when provenance is incomplete. */
export function formatSource(metric: MarketMetric): string | null {
  if (!metric.source.name) return null;
  return metric.source.asOf ? `${metric.source.name} · ${metric.source.asOf}` : metric.source.name;
}

/** schema.org Dataset describing the canonical set, so structured data cannot drift either. */
export function marketDataStructuredData(set: MarketDataSet, pageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Columbus, Ohio housing market indicators",
    description:
      "Columbus and Central Ohio housing indicators published with geography, reporting period, source, and observation date.",
    url: pageUrl,
    dateModified: set.updatedAt ?? undefined,
    creator: { "@type": "Organization", name: "Columbus Real Estate News" },
    variableMeasured: set.metrics
      .filter((m) => m.hasCompleteProvenance)
      .map((m) => ({
        "@type": "PropertyValue",
        name: `${m.label} — ${m.geography.label}`,
        value: m.value,
        measurementTechnique: m.source.name ?? undefined,
        url: m.source.url ?? undefined,
        significantLink: m.source.methodologyUrl ?? undefined,
        observationDate: m.source.asOf ?? m.period.end ?? undefined,
      })),
  };
}
