import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET: Fetch all articles
export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    const articles = await sql`
      SELECT * FROM articles ORDER BY created_at DESC
    `;
    return NextResponse.json({ articles });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// POST: Create new article
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const {
      id,
      status,
      featured,
      category,
      category_class,
      icon,
      title,
      excerpt,
      body: articleBody,
      author,
      date,
      read_time,
      area_slug,
      topic_slug,
    } = body;

    if (!id || !title || !category || !author) {
      return NextResponse.json(
        { error: "Missing required fields: id, title, category, author" },
        { status: 400 }
      );
    }

    const sql = getDb();
    const result = await sql`
      INSERT INTO articles (
        id, status, featured, category, category_class, icon, title, excerpt,
        body, author, date, read_time, area_slug, topic_slug
      ) VALUES (
        ${id}, ${status || "draft"}, ${featured || false}, ${category},
        ${category_class || "card-img-market"}, ${icon || "$"}, ${title},
        ${excerpt || null}, ${articleBody || null}, ${author}, ${date || new Date().toISOString().split('T')[0]},
        ${read_time || "5 min read"}, ${area_slug || null}, ${topic_slug || null}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
