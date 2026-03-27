import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// PUT: Update article by id
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

    const existing = await sql`SELECT id FROM articles WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const result = await sql`
      UPDATE articles SET
        status = COALESCE(${body.status ?? null}, status),
        featured = COALESCE(${body.featured ?? null}, featured),
        category = COALESCE(${body.category ?? null}, category),
        category_class = COALESCE(${body.category_class ?? null}, category_class),
        icon = COALESCE(${body.icon ?? null}, icon),
        title = COALESCE(${body.title ?? null}, title),
        excerpt = COALESCE(${body.excerpt ?? null}, excerpt),
        body = COALESCE(${body.body ?? null}, body),
        author = COALESCE(${body.author ?? null}, author),
        date = COALESCE(${body.date ?? null}, date),
        read_time = COALESCE(${body.read_time ?? null}, read_time),
        area_slug = COALESCE(${body.area_slug ?? null}, area_slug),
        topic_slug = COALESCE(${body.topic_slug ?? null}, topic_slug),
        image_url = COALESCE(${body.image_url ?? null}, image_url),
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

// DELETE: Remove article by id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const sql = getDb();

    const existing = await sql`SELECT id FROM articles WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await sql`DELETE FROM articles WHERE id = ${id}`;
    return NextResponse.json({ success: true, message: "Article deleted" });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
