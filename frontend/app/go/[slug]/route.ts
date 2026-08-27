import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function isPlaceholderAffiliateUrl(url: string) {
  return /example\.com/i.test(url);
}

// GET /go/<slug>?from=<path> — affiliate redirect with click logging.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const sql = getDb();

    const rows = await sql`
      SELECT url FROM affiliate_partners WHERE slug = ${slug} AND active = true LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (isPlaceholderAffiliateUrl(rows[0].url as string)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from")?.slice(0, 300) ?? null;
    const referrer = request.headers.get("referer")?.slice(0, 300) ?? null;

    // Best-effort logging — never block the redirect on it.
    try {
      await sql`
        INSERT INTO affiliate_clicks (partner_slug, path, referrer)
        VALUES (${slug}, ${from}, ${referrer})
      `;
    } catch {
      // swallow
    }

    return NextResponse.redirect(rows[0].url as string, 302);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
