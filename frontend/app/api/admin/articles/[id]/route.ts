import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isDurableArticleImageUrl, verifyArticleImageUrl } from "@/lib/article-image";
import {
  fingerprintArticleImageUrl,
  hammingDistance,
  NEAR_DUPLICATE_MAX_DISTANCE,
  type ArticleImageFingerprint,
} from "@/lib/article-image-fingerprint";
import { evaluateArticle } from "@/scripts/editorial-quality-lib.mjs";
import { validateHumanReview } from "@/lib/editorial-review";
import { mergePublicationCandidate } from "@/lib/publication-candidate";

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

    const existing = await sql`
      SELECT
        id, status, featured, category, title, excerpt, body, author, date,
        read_time, area_slug, topic_slug, tags, image_url, meta_description,
        image_alt, image_caption, fact_checked_at, updated_at
      FROM articles
      WHERE id = ${id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const requestedStatus = body.status === "published" ? "live" : body.status;
    if (requestedStatus && !["draft", "live"].includes(requestedStatus)) {
      return NextResponse.json({ error: "Status must be draft or live" }, { status: 400 });
    }

    const editorialFields = [
      "title", "excerpt", "body", "author", "date", "read_time", "area_slug", "topic_slug", "tags",
      "image_url", "meta_description", "image_alt", "image_caption", "fact_checked_at",
    ];
    const changesEditorialContent = editorialFields.some((field) => Object.hasOwn(body, field));
    const requiresPublicationGate = (requestedStatus === "live" && existing[0].status !== "live")
      || (existing[0].status === "live" && changesEditorialContent && requestedStatus !== "draft");

    let machineReview;
    let reviewedSubmission;
    let approvedImageFingerprint: ArticleImageFingerprint | null = null;
    let humanReview;
    let reviewer: string | null = null;
    if (requiresPublicationGate) {
      const [review] = await sql`
        SELECT status, submission
        FROM editorial_review_jobs
        WHERE article_id = ${id}
      `;
      if (!review?.submission || typeof review.submission !== "object") {
        return NextResponse.json({ error: "Stage this article through the CREN editorial gate before publishing" }, { status: 409 });
      }
      if (review.status !== "READY_FOR_REVIEW") {
        return NextResponse.json({
          error: `The article is not ready for approval (review status: ${review.status ?? "missing"})`,
        }, { status: 409 });
      }
      // Review the exact persisted draft plus the edits in this request. An
      // editor may save draft changes before publishing; evaluating only the
      // original staging payload would allow those saved changes to bypass the
      // machine gate on a later status-only publication request.
      reviewedSubmission = mergePublicationCandidate(
        mergePublicationCandidate(review.submission, existing[0]),
        body,
      );
      machineReview = evaluateArticle(reviewedSubmission);
      if (!machineReview.passed) {
        return NextResponse.json({
          error: `The exact publication copy failed the editorial gate: ${machineReview.failedCodes.join(", ")}`,
        }, { status: 409 });
      }
      const candidateImageUrl = body.image_url ?? existing[0].image_url;
      if (!isDurableArticleImageUrl(candidateImageUrl)) {
        return NextResponse.json({ error: "A durable story-specific hero image is required before publishing" }, { status: 409 });
      }
      if (!await verifyArticleImageUrl(candidateImageUrl)) {
        return NextResponse.json({ error: "The approved hero image is not reachable" }, { status: 409 });
      }
      approvedImageFingerprint = await fingerprintArticleImageUrl(candidateImageUrl);
      if (!approvedImageFingerprint) {
        return NextResponse.json({ error: "The approved hero image could not be decoded and fingerprinted" }, { status: 409 });
      }
      await sql`
        CREATE TABLE IF NOT EXISTS article_image_fingerprints (
          article_id TEXT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          sha256 TEXT NOT NULL UNIQUE,
          perceptual_hash TEXT NOT NULL,
          verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      const existingFingerprints = await sql`
        SELECT article_id, sha256, perceptual_hash
        FROM article_image_fingerprints
        WHERE article_id <> ${id}
      `;
      const duplicateImage = existingFingerprints.find((fingerprint) =>
        fingerprint.sha256 === approvedImageFingerprint?.sha256
        || hammingDistance(fingerprint.perceptual_hash, approvedImageFingerprint?.perceptualHash ?? '')
          <= NEAR_DUPLICATE_MAX_DISTANCE);
      if (duplicateImage) {
        return NextResponse.json({
          error: `That hero duplicates the image assigned to article ${duplicateImage.article_id}`,
        }, { status: 409 });
      }

      humanReview = validateHumanReview(body.human_scores);
      reviewer = typeof body.reviewer === "string" ? body.reviewer.trim().slice(0, 200) : "";
      if (body.human_decision !== "APPROVED" || !reviewer || !humanReview.passed) {
        return NextResponse.json({
          error: "Explicit editorial approval requires a reviewer and a passing 10-part scorecard (17/20 minimum; accuracy, fairness, originality, and visible evidence must score 2).",
          humanReview,
        }, { status: 409 });
      }
    }

    if (requiresPublicationGate && approvedImageFingerprint) {
      const candidateImageUrl = body.image_url ?? existing[0].image_url;
      await sql`
        INSERT INTO article_image_fingerprints (article_id, image_url, sha256, perceptual_hash, verified_at)
        VALUES (
          ${id}, ${candidateImageUrl}, ${approvedImageFingerprint.sha256},
          ${approvedImageFingerprint.perceptualHash}, NOW()
        )
        ON CONFLICT (article_id) DO UPDATE SET
          image_url = EXCLUDED.image_url,
          sha256 = EXCLUDED.sha256,
          perceptual_hash = EXCLUDED.perceptual_hash,
          verified_at = NOW()
      `;
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
        tags = COALESCE(${Array.isArray(body.tags) ? JSON.stringify(body.tags) : null}::jsonb, tags),
        image_url = COALESCE(${body.image_url ?? null}, image_url),
        meta_description = COALESCE(${body.meta_description ?? null}, meta_description),
        image_alt = COALESCE(${body.image_alt ?? null}, image_alt),
        image_caption = COALESCE(${body.image_caption ?? null}, image_caption),
        fact_checked_at = COALESCE(${body.fact_checked_at ?? null}, fact_checked_at),
        updated_at = NOW()
      WHERE id = ${id} AND updated_at = ${existing[0].updated_at}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({
        error: "The article changed while it was being reviewed. Reload it and review the current candidate before publishing.",
      }, { status: 409 });
    }

    if (requiresPublicationGate && machineReview && reviewedSubmission && humanReview && reviewer) {
      await sql`
        UPDATE editorial_review_jobs SET
          status = 'APPROVED',
          machine_score = ${machineReview.score},
          machine_possible = ${machineReview.possible},
          machine_report = ${JSON.stringify(machineReview)}::jsonb,
          submission = ${JSON.stringify(reviewedSubmission)}::jsonb,
          human_score = ${humanReview.total},
          human_scores = ${JSON.stringify(humanReview.scores)}::jsonb,
          human_decision = 'APPROVED',
          reviewer = ${reviewer},
          reviewed_at = NOW(),
          updated_at = NOW()
        WHERE article_id = ${id}
      `;
      await sql`
        UPDATE article_image_jobs SET status = 'PUBLISHED', updated_at = NOW()
        WHERE article_id = ${id}
      `;
      await sql`
        UPDATE newsroom_runs SET
          published_count = (
            SELECT COUNT(*)::int
            FROM jsonb_array_elements_text(staged_article_ids) AS staged(article_id)
            JOIN articles ON articles.id = staged.article_id
            WHERE articles.status = 'live'
          ),
          updated_at = NOW()
        WHERE staged_article_ids ? ${id}
      `.catch(() => undefined);

      try {
        const { closeCalendarLoop } = await import("@/scripts/coverage-calendar-store.mjs");
        const dateParts = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date());
        const dateValues = Object.fromEntries(dateParts.map((part) => [part.type, part.value]));
        await closeCalendarLoop(sql, {
          articleId: id,
          title: String(reviewedSubmission.title ?? result[0].title),
          body: String(reviewedSubmission.body ?? result[0].body ?? ""),
          publishedOn: `${dateValues.year}-${dateValues.month}-${dateValues.day}`,
          explicitEntryId: typeof reviewedSubmission.coverage_calendar_id === "string"
            ? reviewedSubmission.coverage_calendar_id
            : null,
        });
      } catch (calendarError) {
        console.warn("Coverage calendar not updated after publication", calendarError);
      }
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
