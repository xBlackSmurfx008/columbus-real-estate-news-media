import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERSONAS = ["fsbo_seller", "investor_seller", "capital_partner", "renter", "rental_listing", "directory_listing"] as const;
const MAX_BODY_BYTES = 16_384;

// POST: public lead intake from the funnel pages
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    }
    const body = JSON.parse(raw);
    const { persona, name, email, phone, area, details, source, consent, company } = body;

    // Honeypot: real visitors never see or fill this field.
    if (typeof company === "string" && company.trim() !== "") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!PERSONAS.includes(persona)) {
      return NextResponse.json({ error: "Unknown request type." }, { status: 400 });
    }
    if (typeof name !== "string" || !name.trim() || name.length > 200) {
      return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 320) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (consent !== true) {
      return NextResponse.json({ error: "Please check the consent box so we can contact you." }, { status: 400 });
    }

    const sql = getDb();
    await sql`
      INSERT INTO leads (persona, name, email, phone, area, details, source, status, consent)
      VALUES (
        ${persona}, ${name.trim()}, ${email}, ${typeof phone === "string" ? phone.slice(0, 40) : null},
        ${typeof area === "string" ? area.slice(0, 120) : null},
        ${JSON.stringify(details && typeof details === "object" ? details : {})}::jsonb,
        ${typeof source === "string" ? source.slice(0, 120) : null}, 'new', true
      )
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// GET: admin-only lead listing with optional persona/status filters
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const persona = searchParams.get("persona");
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);

    const sql = getDb();
    const leads = await sql`
      SELECT * FROM leads
      WHERE (${persona}::text IS NULL OR persona = ${persona})
        AND (${status}::text IS NULL OR status = ${status})
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ leads });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
