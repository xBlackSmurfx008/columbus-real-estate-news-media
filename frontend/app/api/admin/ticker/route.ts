import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET: Fetch all ticker items
export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    const items = await sql`SELECT * FROM ticker_items ORDER BY sort_order ASC`;
    return NextResponse.json({ items });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// POST: Add single ticker item
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { text, active, sort_order } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Missing required field: text" },
        { status: 400 }
      );
    }

    const sql = getDb();
    const result = await sql`
      INSERT INTO ticker_items (text, active, sort_order)
      VALUES (${text}, ${active !== false}, ${sort_order || 0})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// PUT: Replace all ticker items
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Request must contain items array" },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Delete existing ticker items
    await sql`DELETE FROM ticker_items`;

    // Insert new ticker items
    for (const item of items) {
      if (item.text) {
        await sql`
          INSERT INTO ticker_items (text, active, sort_order)
          VALUES (${item.text}, ${item.active !== false}, ${item.sort_order || 0})
        `;
      }
    }

    // Fetch and return updated data
    const updated = await sql`SELECT * FROM ticker_items ORDER BY sort_order ASC`;

    return NextResponse.json({
      success: true,
      items: updated,
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
