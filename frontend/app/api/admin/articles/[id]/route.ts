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

const SUBMISSION_FIELDS = [
  "title", "category", "excerpt", "body", "author", "date", "read_time", "area_slug", "topic_slug", "tags",
  "image_url", "meta_description", "image_alt", "fact_checked_at",
] as const;

function candidateSubmission(staged: Record<string, unknown>, edits: Record<string, unknown>) {
  const candidate = structuredClone(staged);
  for (const field of SUBMISSION_FIELDS) {
    if (Object.hasOwn(edits, field)) candidate[field] = edits[field];
  }
  if (Object.hasOwn(edits, "image_caption")) {
    const provenance = candidate.image_provenance && typeof candidate.image_provenance === "object"
      ? candidate.image_provenance as Record<string, unknown>
      : {};
    candidate.image_provenance = { ...provenance, caption: edits.image_caption };
  }
  return candidate;
}

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
      "title", "excerpt", "body", "author", "date", "read_time", "area_slug", "topic_slug", "tags",
      "image_url", "meta_description", "image_alt", "image_caption", "fact_checked_at",
    ];
    const changesEditorialContent = editorialFields.some((field) => Object.hasOwn(body, field));
    const requiresPublicationGate = (requestedStatus === "live" && existing[0].status !== "live")
      || (existing[0].status === "live" && changesEditorialContent && requestedStatus !== "draft");

    let machineReview;
    let reviewedSubmission;
    let approvedImageFingerprint: ArticleImageFingerprint | null = null;
    if (requiresPublicationGate) {
      const [review] = await sql`
        SELECT submission
        FROM editorial_review_jobs
        WHERE article_id = ${id}
      `;
      if (!review?.submission || typeof review.submission !== "object") {
        return NextResponse.json({ error: "Stage this article through the CREN editorial gate before publishing" }, { status: 409 });
      }
      reviewedSubmission = candidateSubmission(review.submission, body);
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
      WHERE id = ${id}
      RETURNING *
    `;

    if (requiresPublicationGate && machineReview && reviewedSubmission) {
      await sql`
        UPDATE editorial_review_jobs SET
          status = 'AUTO_PUBLISHED',
          machine_score = ${machineReview.score},
          machine_possible = ${machineReview.possible},
          machine_report = ${JSON.stringify(machineReview)}::jsonb,
          submission = ${JSON.stringify(reviewedSubmission)}::jsonb,
          human_score = NULL,
          human_scores = NULL,
          human_decision = 'NOT_REQUIRED',
          reviewer = 'admin-auto-gate',
          reviewed_at = NOW(),
          updated_at = NOW()
        WHERE article_id = ${id}
      `;
      await sql`
        UPDATE article_image_jobs SET status = 'PUBLISHED', updated_at = NOW()
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
