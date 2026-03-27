export type MarketSnapshotMetric = {
  label: string;
  value: string;
  change: string;
  changeClassName: string;
};

/** Single source for the market strip (home hub + /market-data). */
export const marketSnapshotMetrics: MarketSnapshotMetric[] = [
  {
    label: "Median listing price",
    value: "$364K",
    change: "+1.9% YoY",
    changeClassName: "cren-data-up",
  },
  {
    label: "Average rent",
    value: "$1,428/mo",
    change: "+2.4% YoY",
    changeClassName: "cren-data-neutral",
  },
  {
    label: "Days on market",
    value: "22 days",
    change: "-3 days MoM",
    changeClassName: "cren-data-up",
  },
  {
    label: "New listings",
    value: "1,142",
    change: "This week",
    changeClassName: "cren-data-neutral",
  },
];
