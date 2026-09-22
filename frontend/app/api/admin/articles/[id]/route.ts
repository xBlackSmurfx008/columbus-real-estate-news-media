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
import { editorialCandidateHash, type EditorialCandidate } from "@/lib/editorial-email-review";
import { publishEditorialCandidate } from "@/lib/editorial-publication";
import { reconcileEditorialPublication } from "@/lib/editorial-publication-bookkeeping";

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
        image_alt, image_caption, fact_checked_at, updated_at::text AS updated_at
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
      "title", "category", "excerpt", "body", "author", "date", "read_time", "area_slug", "topic_slug", "tags",
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
    let ownerApproval: { version: number; hash: string; candidate: EditorialCandidate; staged: unknown } | null = null;
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

      const humanDecision = body.human_decision;
      {
        const [emailApproval] = await sql`
          SELECT version, status, candidate_hash, reviewer
          FROM editorial_email_reviews
          WHERE article_id = ${id}
          ORDER BY version DESC
          LIMIT 1
        `;
        const provenance = reviewedSubmission.image_provenance && typeof reviewedSubmission.image_provenance === "object"
          ? reviewedSubmission.image_provenance as Record<string, unknown>
          : {};
        const exactCandidate = {
          ...reviewedSubmission,
          title: String(reviewedSubmission.title), excerpt: String(reviewedSubmission.excerpt),
          body: String(reviewedSubmission.body), author: String(reviewedSubmission.author),
          date: String(reviewedSubmission.date), category: String(reviewedSubmission.category),
          id,
          image_url: candidateImageUrl,
          image_caption: body.image_caption ?? existing[0].image_caption ?? provenance.caption ?? null,
          image_sha256: approvedImageFingerprint.sha256,
        } as EditorialCandidate;
        if (!emailApproval || emailApproval.status !== 'APPROVED' || editorialCandidateHash(exactCandidate) !== emailApproval.candidate_hash) {
          return NextResponse.json({
            error: "The email approval is missing or applies to an older candidate. Send the exact current proof again.",
          }, { status: 409 });
        }
        ownerApproval = { version: Number(emailApproval.version), hash: String(emailApproval.candidate_hash), candidate: exactCandidate, staged: review.submission };
        humanReview = validateHumanReview(body.human_scores);
        reviewer = typeof body.reviewer === "string" ? body.reviewer.trim().slice(0, 200) : "";
      }
      if (humanDecision !== "APPROVED" || !reviewer || !humanReview.passed) {
        return NextResponse.json({
          error: "Explicit editorial approval requires a reviewer and a passing 10-part scorecard (17/20 minimum; accuracy, fairness, originality, and visible evidence must score 2).",
          humanReview,
        }, { status: 409 });
      }
    }

    const result = requiresPublicationGate && ownerApproval && machineReview && humanReview && reviewer && approvedImageFingerprint
      ? await publishEditorialCandidate(sql, {
        id, version: ownerApproval.version, hash: ownerApproval.hash, candidate: ownerApproval.candidate,
        updatedAt: existing[0].updated_at, stagedSubmission: ownerApproval.staged,
        reviewer, humanScores: humanReview.scores, humanTotal: humanReview.total,
        machineReport: machineReview, image: approvedImageFingerprint,
      }) : await sql`
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
      try {
        await reconcileEditorialPublication(sql, id);
      } catch {
        console.warn("EDITORIAL_PUBLICATION_BOOKKEEPING_RETRY");
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
