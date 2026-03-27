import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const sql = getDb();

    // Fetch all public data
    const articles = await sql`
      SELECT * FROM articles WHERE status = 'live' ORDER BY created_at DESC
    `;

    const ads = await sql`
      SELECT * FROM ads WHERE status = 'live' ORDER BY created_at DESC
    `;

    const marketSnapshot = await sql`
      SELECT * FROM market_snapshot ORDER BY sort_order ASC
    `;

    const heroStats = await sql`
      SELECT * FROM hero_stats ORDER BY sort_order ASC
    `;

    const neighborhoods = await sql`
      SELECT * FROM neighborhoods ORDER BY sort_order ASC
    `;

    const tickers = await sql`
      SELECT * FROM ticker_items WHERE active = true ORDER BY sort_order ASC
    `;

    const interviews = await sql`
      SELECT * FROM interviews ORDER BY sort_order ASC
    `;

    const testimonials = await sql`
      SELECT * FROM testimonials ORDER BY sort_order ASC
    `;

    const settingsRows = await sql`SELECT key, value FROM settings`;
    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(
      {
        articles,
        ads,
        marketSnapshot,
        heroStats,
        neighborhoods,
        tickers,
        interviews,
        testimonials,
        settings,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
