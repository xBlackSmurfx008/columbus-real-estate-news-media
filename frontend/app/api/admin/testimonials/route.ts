import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET: Fetch all testimonials
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const sql = getDb();
    const testimonials = await sql`SELECT * FROM testimonials ORDER BY sort_order ASC`;
    return NextResponse.json(testimonials);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// POST: Add single testimonial
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { initials, name, role, quote, sort_order } = body;

    if (!initials || !name || !role || !quote) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sql = getDb();
    const result = await sql`
      INSERT INTO testimonials (initials, name, role, quote, sort_order)
      VALUES (${initials}, ${name}, ${role}, ${quote}, ${sort_order || 0})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// PUT: Replace all testimonials
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be an array of testimonials" },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Delete existing testimonials
    await sql`DELETE FROM testimonials`;

    // Insert new testimonials
    for (const testimonial of body) {
      await sql`
        INSERT INTO testimonials (initials, name, role, quote, sort_order)
        VALUES (${testimonial.initials}, ${testimonial.name}, ${testimonial.role}, ${testimonial.quote}, ${testimonial.sort_order || 0})
      `;
    }

    // Fetch and return updated data
    const updated = await sql`SELECT * FROM testimonials ORDER BY sort_order ASC`;

    return NextResponse.json({
      success: true,
      testimonials: updated,
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
