import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { generateArticleSlug } from "@/lib/article-routing";

// GET: Fetch all articles
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const sql = getDb();
    const articles = await sql`
      SELECT
        articles.*,
        editorial_review_jobs.machine_score,
        editorial_review_jobs.machine_possible,
        editorial_review_jobs.human_scores,
        editorial_review_jobs.human_decision,
        editorial_review_jobs.status AS review_status,
        editorial_review_jobs.submission
      FROM articles
      LEFT JOIN editorial_review_jobs ON editorial_review_jobs.article_id = articles.id
      ORDER BY articles.created_at DESC
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
      tags,
      meta_description,
      image_alt,
      image_caption,
      fact_checked_at,
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
        id, canonical_slug, status, featured, category, category_class, icon, title, excerpt,
        body, author, date, read_time, area_slug, topic_slug, tags,
        meta_description, image_alt, image_caption, fact_checked_at
      ) VALUES (
        ${id}, ${generateArticleSlug(title)}, 'draft', ${featured || false}, ${category},
        ${category_class || "card-img-market"}, ${icon || "$"}, ${title},
        ${excerpt || null}, ${articleBody || null}, ${author}, ${date || new Date().toISOString().split('T')[0]},
        ${read_time || "5 min read"}, ${area_slug || null}, ${topic_slug || null}, ${JSON.stringify(Array.isArray(tags) ? tags : [])}::jsonb,
        ${meta_description || null}, ${image_alt || null}, ${image_caption || null}, ${fact_checked_at || null}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
