// Fingerprint of the market payload inside content/snapshot/public-data.json.
//
// The 2026-09-04 drift (homepage showing +9.8% YoY while /market-data showed
// +7% YoY) happened because the committed outage fallback was edited/aged out
// of step with the database and nothing noticed. Two guards now exist:
//
//   1. scripts/refresh-market-data.mjs re-exports the snapshot after every
//      market refresh, so the fallback cannot age behind the DB.
//   2. This fingerprint is written into the snapshot's _meta and recomputed by
//      tests/market-data-consistency.test.mjs. Hand-editing a market number in
//      the committed fallback breaks the fingerprint and fails the build.

import { createHash } from "node:crypto";

/** Deterministic JSON: keys sorted at every level so key order can't change the hash. */
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
    return out;
  }
  return value;
}

/** The market-bearing slices of the snapshot, and only those. */
export function marketPayload(snapshot) {
  return {
    marketSnapshot: snapshot?.marketSnapshot ?? [],
    marketObservations: snapshot?.marketObservations ?? [],
    neighborhoods: snapshot?.neighborhoods ?? [],
  };
}

export function marketSnapshotFingerprint(snapshot) {
  return createHash("sha256").update(JSON.stringify(stable(marketPayload(snapshot)))).digest("hex").slice(0, 32);
}
