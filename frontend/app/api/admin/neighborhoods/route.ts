import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET: Fetch all neighborhoods
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const sql = getDb();
    const neighborhoods = await sql`SELECT * FROM neighborhoods ORDER BY sort_order ASC`;
    return NextResponse.json(neighborhoods);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// POST: Add single neighborhood
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { name, median, yoy, rent, dom, inventory, sort_order } = body;

    if (!name || !median || !yoy || !rent || !dom || !inventory) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sql = getDb();
    const result = await sql`
      INSERT INTO neighborhoods (name, median, yoy, rent, dom, inventory, sort_order)
      VALUES (${name}, ${median}, ${yoy}, ${rent}, ${dom}, ${inventory}, ${sort_order || 0})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// PUT: Replace all neighborhoods
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be an array of neighborhoods" },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Delete existing neighborhoods
    await sql`DELETE FROM neighborhoods`;

    // Insert new neighborhoods
    for (const neighborhood of body) {
      await sql`
        INSERT INTO neighborhoods (name, median, yoy, rent, dom, inventory, sort_order)
        VALUES (${neighborhood.name}, ${neighborhood.median}, ${neighborhood.yoy}, ${neighborhood.rent}, ${neighborhood.dom}, ${neighborhood.inventory}, ${neighborhood.sort_order || 0})
      `;
    }

    // Fetch and return updated data
    const updated = await sql`SELECT * FROM neighborhoods ORDER BY sort_order ASC`;

    return NextResponse.json({
      success: true,
      neighborhoods: updated,
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
