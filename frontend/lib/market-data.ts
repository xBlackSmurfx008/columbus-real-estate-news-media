import { cache } from "react";
import {
  getLatestMarketObservations,
  getMarketData,
  type DbMarketObservation,
  type DbMarketSnapshot,
} from "@/lib/public-data";
import {
  buildMarketDataSet,
  EMPTY_MARKET_DATA_SET,
  type MarketDataSet,
  type MarketObservationRow,
  type MarketSnapshotRow,
} from "@/lib/market-data-core";

export * from "@/lib/market-data-core";

/**
 * The single server-side entry point for public market numbers.
 *
 * Every surface — homepage stat bar, /market-data, /embed/market-data, area
 * hubs, article components, structured data — calls this and then picks
 * metrics with the selectors in market-data-core. Nothing else may read
 * market_snapshot, market_observations, or hero_stats for public display.
 *
 * hero_stats is deliberately NOT read here. It remains an editable table for
 * the admin panel but is no longer a source of truth for any public number.
 */
export const getCanonicalMarketData = cache(async (): Promise<MarketDataSet> => {
  try {
    const [legacy, observations] = await Promise.all([getMarketData(), getLatestMarketObservations()]);
    return buildMarketDataSet({
      observations: observations as unknown as MarketObservationRow[],
      snapshotCards: (legacy.snapshot as DbMarketSnapshot[]) as unknown as MarketSnapshotRow[],
      fromFallback: legacy.fromFallback,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[market-data] canonical set unavailable: ${message}`);
    return EMPTY_MARKET_DATA_SET;
  }
});

export type { DbMarketObservation, DbMarketSnapshot };
