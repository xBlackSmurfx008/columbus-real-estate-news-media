import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { validateHumanReview } from "@/lib/editorial-review";

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

    const existing = await sql`SELECT id, status, image_url FROM articles WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const requestedStatus = body.status === "published" ? "live" : body.status;
    if (requestedStatus && !["draft", "live"].includes(requestedStatus)) {
      return NextResponse.json({ error: "Status must be draft or live" }, { status: 400 });
    }

    const editorialFields = [
      "title", "excerpt", "body", "author", "date", "read_time", "area_slug", "topic_slug",
      "image_url", "meta_description", "image_alt", "image_caption", "fact_checked_at",
    ];
    const changesEditorialContent = editorialFields.some((field) => Object.hasOwn(body, field));
    const requiresReview = (requestedStatus === "live" && existing[0].status !== "live")
      || (existing[0].status === "live" && changesEditorialContent && requestedStatus !== "draft");

    let humanReview;
    if (requiresReview) {
      const [review] = await sql`
        SELECT machine_score, machine_possible
        FROM editorial_review_jobs
        WHERE article_id = ${id}
      `;
      humanReview = validateHumanReview(body.human_scores);
      if (!review || review.machine_possible <= 0 || review.machine_score !== review.machine_possible) {
        return NextResponse.json({ error: "The machine editorial gate has not passed" }, { status: 409 });
      }
      if (!humanReview.passed) {
        return NextResponse.json({ error: "Human review requires 14/18 and no zero on blocking criteria" }, { status: 409 });
      }
      if (!existing[0].image_url || body.image_approved !== true) {
        return NextResponse.json({ error: "Inspect and approve a story-specific hero image before publishing" }, { status: 409 });
      }
    }

    const result = await sql`
      UPDATE articles SET
        status = COALESCE(${requestedStatus ?? null}, status),
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
        meta_description = COALESCE(${body.meta_description ?? null}, meta_description),
        image_alt = COALESCE(${body.image_alt ?? null}, image_alt),
        image_caption = COALESCE(${body.image_caption ?? null}, image_caption),
        fact_checked_at = COALESCE(${body.fact_checked_at ?? null}, fact_checked_at),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (requiresReview && humanReview?.passed) {
      await sql`
        UPDATE editorial_review_jobs SET
          status = 'APPROVED',
          human_score = ${humanReview.total},
          human_scores = ${JSON.stringify(humanReview.scores)}::jsonb,
          human_decision = 'APPROVED',
          reviewer = 'admin',
          reviewed_at = NOW(),
          updated_at = NOW()
        WHERE article_id = ${id}
      `;
      await sql`
        UPDATE article_image_jobs SET status = 'APPROVED', updated_at = NOW()
        WHERE article_id = ${id}
      `;
    }

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
