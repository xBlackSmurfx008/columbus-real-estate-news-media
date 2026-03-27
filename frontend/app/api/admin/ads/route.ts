import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET: Fetch all ads
export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    const ads = await sql`SELECT * FROM ads ORDER BY created_at DESC`;
    return NextResponse.json({ ads });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// POST: Create new ad
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const {
      id,
      name,
      type,
      status,
      placement,
      size,
      image_url,
      link_url,
      html_content,
      alt_text,
      title,
      text,
      cta_text,
      cta_url,
      brand_name,
      brand_color,
    } = body;

    if (!id || !name || !placement) {
      return NextResponse.json(
        { error: "Missing required fields: id, name, placement" },
        { status: 400 }
      );
    }

    const sql = getDb();
    const result = await sql`
      INSERT INTO ads (
        id, name, type, status, placement, size, image_url, link_url,
        html_content, alt_text, title, text, cta_text, cta_url, brand_name, brand_color
      ) VALUES (
        ${id}, ${name}, ${type || "display"}, ${status || "draft"}, ${placement},
        ${size || null}, ${image_url || null}, ${link_url || null},
        ${html_content || null}, ${alt_text || null}, ${title || null},
        ${text || null}, ${cta_text || null}, ${cta_url || null},
        ${brand_name || null}, ${brand_color || null}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
