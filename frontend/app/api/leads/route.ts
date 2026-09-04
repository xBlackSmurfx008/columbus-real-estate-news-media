import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendTelegramInquiry } from "@/lib/telegram-inquiry";
import { FORM_VERSIONS } from "@/lib/compliance/policy-versions";
import { recordConsentEventSafely } from "@/lib/compliance/consent-events";
import { mirrorLeadIntakeSafely } from "@/lib/compliance/intake-records";
import { enqueueInquirySafely } from "@/lib/inquiry-queue-db";
import { inquiryTypeForPersona } from "@/lib/inquiry-queue";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERSONAS = ["fsbo_seller", "investor_seller", "capital_partner", "renter", "rental_listing", "directory_listing", "profile_claim"] as const;
const MAX_BODY_BYTES = 16_384;

function cleanString(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  return cleaned.slice(0, max);
}

function summarizeDetails(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const parts = Object.entries(value)
    .slice(0, 12)
    .map(([key, item]) => {
      const label = key.replace(/[_-]+/g, " ").slice(0, 60);
      if (Array.isArray(item)) {
        const list = item.map((entry) => cleanString(entry, 80)).filter(Boolean).join(", ");
        return list ? `${label}: ${list}` : null;
      }
      if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
        return `${label}: ${cleanString(String(item), 160) ?? String(item).slice(0, 160)}`;
      }
      return null;
    })
    .filter((part): part is string => Boolean(part));

  return parts.join(" | ").slice(0, 900) || null;
}

function leadRecipientCategory(persona: typeof PERSONAS[number]) {
  if (persona === "rental_listing" || persona === "directory_listing" || persona === "profile_claim") return "profile_review_queue";
  if (persona === "capital_partner") return "owner_review_only";
  return "cren_team";
}

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
    const [lead] = await sql`
      INSERT INTO leads (persona, name, email, phone, area, details, source, status, consent)
      VALUES (
        ${persona}, ${name.trim()}, ${email}, ${typeof phone === "string" ? phone.slice(0, 40) : null},
        ${typeof area === "string" ? area.slice(0, 120) : null},
        ${JSON.stringify(details && typeof details === "object" ? details : {})}::jsonb,
        ${typeof source === "string" ? source.slice(0, 120) : null}, 'new', true
      )
      RETURNING id
    `;
    const cleanPhone = typeof phone === "string" ? phone.slice(0, 40) : null;
    const cleanSource = typeof source === "string" ? source.slice(0, 120) : null;
    const cleanSourceRoute = typeof body.sourceRoute === "string" ? body.sourceRoute.slice(0, 500) : null;

    // Operating invariant: a lead does not exist without an assigned owner and
    // an SLA timer. The queue row is written here, in the same request; the
    // scheduled sweep reconciles anything this call ever fails to create.
    await enqueueInquirySafely(sql, {
      sourceTable: "leads",
      sourceId: lead.id,
      inquiryType: inquiryTypeForPersona(persona),
      persona,
      name: name.trim(),
      email,
      phone: cleanPhone,
      area: typeof area === "string" ? area.slice(0, 120) : null,
      source: cleanSource,
      sourceRoute: cleanSourceRoute,
      summary: summarizeDetails(details),
    });

    await recordConsentEventSafely(sql, {
      consentKey: persona === "profile_claim" ? "profileClaim" : "leadRouting",
      entityType: "lead",
      entityId: lead.id,
      email,
      phone: cleanPhone,
      sourceRoute: cleanSourceRoute ?? cleanSource,
      formId: "lead-form",
      formVersion: FORM_VERSIONS.lead,
      recipientCategory: leadRecipientCategory(persona),
      compensationDisclosureCategory: persona === "capital_partner" ? "unknown_pending_review" : "none",
    });
    await mirrorLeadIntakeSafely(sql, {
      leadId: lead.id,
      persona,
      name: name.trim(),
      email,
      phone: cleanPhone,
      area: typeof area === "string" ? area.slice(0, 120) : null,
      details: details && typeof details === "object" && !Array.isArray(details) ? details as Record<string, unknown> : {},
    });

    await sendTelegramInquiry({
      kind: 'lead',
      recordId: lead.id,
      persona,
      name: name.trim(),
      email,
      phone: cleanPhone,
      area: typeof area === "string" ? area.slice(0, 120) : null,
      source: cleanSource,
      message: summarizeDetails(details),
    });

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
