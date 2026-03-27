import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET: Fetch market_snapshot, hero_stats, and neighborhoods
export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    const snapshot = await sql`SELECT * FROM market_snapshot ORDER BY sort_order ASC`;
    const heroStats = await sql`SELECT * FROM hero_stats ORDER BY sort_order ASC`;
    let neighborhoods: Record<string, unknown>[] = [];

    try {
      neighborhoods = await sql`SELECT * FROM neighborhoods ORDER BY name ASC`;
    } catch (e) {
      // neighborhoods table might not exist yet
      neighborhoods = [];
    }

    return NextResponse.json({
      snapshot,
      heroStats,
      neighborhoods,
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// PUT: Update market data (delete and re-insert)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { snapshot, heroStats, neighborhoods } = body;

    if (!snapshot || !heroStats || !Array.isArray(snapshot) || !Array.isArray(heroStats)) {
      return NextResponse.json(
        { error: "Request must contain snapshot and heroStats arrays" },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Delete existing rows
    await sql`DELETE FROM market_snapshot`;
    await sql`DELETE FROM hero_stats`;

    // Insert new snapshot data
    for (const item of snapshot) {
      await sql`
        INSERT INTO market_snapshot (label, value, change, direction, sort_order)
        VALUES (${item.label}, ${item.value}, ${item.change}, ${item.direction || "up"}, ${item.sort_order || 0})
      `;
    }

    // Insert new hero stats data
    for (const item of heroStats) {
      await sql`
        INSERT INTO hero_stats (value, label, sort_order)
        VALUES (${item.value}, ${item.label}, ${item.sort_order || 0})
      `;
    }

    // Handle neighborhoods if provided
    if (neighborhoods && Array.isArray(neighborhoods)) {
      try {
        await sql`DELETE FROM neighborhoods`;
        for (const item of neighborhoods) {
          if (item.name) {
            await sql`
              INSERT INTO neighborhoods (name, median, yoy, rent, dom, inventory, sort_order)
              VALUES (${item.name}, ${item.median || ''}, ${item.yoy || ''}, ${item.rent || ''}, ${item.dom || ''}, ${item.inventory || ''}, ${item.sort_order || 0})
            `;
          }
        }
      } catch (e) {
        // neighborhoods table might not exist yet, continue without error
      }
    }

    // Fetch and return updated data
    const updatedSnapshot = await sql`SELECT * FROM market_snapshot ORDER BY sort_order ASC`;
    const updatedHeroStats = await sql`SELECT * FROM hero_stats ORDER BY sort_order ASC`;
    let updatedNeighborhoods: Record<string, unknown>[] = [];
    try {
      updatedNeighborhoods = await sql`SELECT * FROM neighborhoods ORDER BY name ASC`;
    } catch (e) {
      // neighborhoods table might not exist yet
    }

    return NextResponse.json({
      success: true,
      snapshot: updatedSnapshot,
      heroStats: updatedHeroStats,
      neighborhoods: updatedNeighborhoods,
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
