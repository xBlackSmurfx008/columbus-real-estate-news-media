import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// PUT: Update ad by id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json();

    const sql = getDb();

    const existing = await sql`SELECT id FROM ads WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    const result = await sql`
      UPDATE ads SET
        name = COALESCE(${body.name ?? null}, name),
        type = COALESCE(${body.type ?? null}, type),
        status = COALESCE(${body.status ?? null}, status),
        placement = COALESCE(${body.placement ?? null}, placement),
        size = COALESCE(${body.size ?? null}, size),
        image_url = COALESCE(${body.image_url ?? null}, image_url),
        link_url = COALESCE(${body.link_url ?? null}, link_url),
        html_content = COALESCE(${body.html_content ?? null}, html_content),
        alt_text = COALESCE(${body.alt_text ?? null}, alt_text),
        title = COALESCE(${body.title ?? null}, title),
        text = COALESCE(${body.text ?? null}, text),
        cta_text = COALESCE(${body.cta_text ?? null}, cta_text),
        cta_url = COALESCE(${body.cta_url ?? null}, cta_url),
        brand_name = COALESCE(${body.brand_name ?? null}, brand_name),
        brand_color = COALESCE(${body.brand_color ?? null}, brand_color),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// DELETE: Remove ad by id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const sql = getDb();

    const existing = await sql`SELECT id FROM ads WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    await sql`DELETE FROM ads WHERE id = ${id}`;
    return NextResponse.json({ success: true, message: "Ad deleted" });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
