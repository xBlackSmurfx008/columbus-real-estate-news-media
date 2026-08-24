import { NextResponse } from "next/server";
import { getPublicData } from "@/lib/public-data";

// Public content JSON. Served through the resilient data layer:
// article bodies are omitted (no consumer of this endpoint renders
// them) and a database outage returns the last-known-good snapshot
// instead of a 500 — both keep Neon data transfer inside plan limits.
export async function GET() {
  const data = await getPublicData();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
