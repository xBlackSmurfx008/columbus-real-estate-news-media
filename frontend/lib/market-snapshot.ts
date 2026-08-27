export type MarketSnapshotMetric = {
  label: string;
  value: string;
  change: string;
  changeClassName: string;
};

/** Deprecated static strip. Market figures must now come from sourced observations. */
export const marketSnapshotMetrics: MarketSnapshotMetric[] = [];
