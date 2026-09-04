import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendTelegramInquiry } from "@/lib/telegram-inquiry";
import { FORM_VERSIONS } from "@/lib/compliance/policy-versions";
import { recordConsentEventSafely } from "@/lib/compliance/consent-events";
import { isTestTraffic } from "@/scripts/test-traffic-lib.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Progressive profiling: "signup" is step 1 (email + area/topic, the only
// thing that stands between a visitor and membership). "profile" is the
// optional step 2 that fills in the rest of the subscriber record.
type SubscribeStep = "signup" | "profile";

type SubscribePayload = {
  step?: unknown;
  email?: unknown;
  area?: unknown;
  topic?: unknown;
  source?: unknown;
  role?: unknown;
  timeline?: unknown;
  budget?: unknown;
  commuteAnchor?: unknown;
  cadence?: unknown;
  interests?: unknown;
  consent?: unknown;
  sourceRoute?: unknown;
};

function cleanString(value: unknown, max = 160): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  return cleaned.slice(0, max);
}

function cleanList(value: unknown, maxItems = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item, 80))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);
}

// POST: newsletter signup (public)
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubscribePayload;
    const step: SubscribeStep = body.step === "profile" ? "profile" : "signup";
    const email = cleanString(body.email, 320)?.toLowerCase() ?? "";

    if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 320) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    // Consent is captured once, at step 1. Step 2 only enriches a record that
    // already carries a logged consent event.
    if (step === "signup" && body.consent !== true) {
      return NextResponse.json({ error: "Please check the email permission box." }, { status: 400 });
    }

    const area = cleanString(body.area, 120);
    const topic = cleanString(body.topic, 120);
    const source = cleanString(body.source, 120) ?? "direct";
    const role = cleanString(body.role, 80);
    const timeline = cleanString(body.timeline, 80);
    const budget = cleanString(body.budget, 80);
    const commuteAnchor = cleanString(body.commuteAnchor, 120);
    const cadence = cleanString(body.cadence, 80);
    const interests = cleanList(body.interests);
    const topicValue =
      [...new Set([topic, ...interests].filter((value): value is string => Boolean(value)))].join(" | ").slice(0, 500) ||
      null;
    const sourceValue =
      [
        source,
        step === "profile" ? "step=profile" : null,
        role ? `role=${role}` : null,
        cadence ? `cadence=${cadence}` : null,
        timeline ? `timeline=${timeline}` : null,
        budget ? `budget=${budget}` : null,
        commuteAnchor ? `commute=${commuteAnchor}` : null,
      ]
        .filter(Boolean)
        .join(" | ")
        .slice(0, 700) || null;

    // Shared predicate, applied at write time: a smoke subscriber is flagged
    // as it is created, so no report has to recognise it later.
    const isTest = isTestTraffic({ source: sourceValue, email });

    const sql = getDb();
    // Select-then-write: subscribers.email uniqueness is enforced by the
    // migration script's index, but older rows may predate it.
    const existing = await sql`SELECT id FROM subscribers WHERE email = ${email} LIMIT 1`;

    if (step === "profile") {
      // Step 2 never creates a member and never blanks out what step 1 stored.
      if (existing.length === 0) {
        return NextResponse.json({ error: "We could not find that email. Sign up first." }, { status: 404 });
      }
      const [subscriber] = await sql`
        UPDATE subscribers
        SET area = COALESCE(${area}, area),
            topic = COALESCE(${topicValue}, topic),
            source = COALESCE(${sourceValue}, source),
            status = 'active', updated_at = NOW()
        WHERE id = ${existing[0].id}
        RETURNING id
      `;
      await sendTelegramInquiry({
        kind: "newsletter",
        recordId: subscriber.id,
        email,
        area,
        role,
        topic: topicValue,
        cadence,
        timeline,
        budget,
        commuteAnchor,
        interests: interests.join(", ") || null,
        source: sourceValue,
      });
      return NextResponse.json({ ok: true, step: "profile" }, { status: 200 });
    }

    let subscriberId: string | number;
    if (existing.length > 0) {
      const [subscriber] = await sql`
        UPDATE subscribers
        SET area = COALESCE(${area}, area), topic = COALESCE(${topicValue}, topic),
            source = COALESCE(${sourceValue}, source),
            status = 'active', is_test = ${isTest}, updated_at = NOW()
        WHERE id = ${existing[0].id}
        RETURNING id
      `;
      subscriberId = subscriber.id;
    } else {
      const [subscriber] = await sql`
        INSERT INTO subscribers (email, area, topic, source, status, is_test)
        VALUES (${email}, ${area}, ${topicValue}, ${sourceValue}, 'active', ${isTest})
        RETURNING id
      `;
      subscriberId = subscriber.id;
    }
    await recordConsentEventSafely(sql, {
      consentKey: "emailMarketing",
      entityType: "subscriber",
      entityId: subscriberId,
      email,
      sourceRoute: cleanString(body.sourceRoute, 500) ?? source,
      formId: "subscribe-form",
      formVersion: FORM_VERSIONS.subscribe,
      recipientCategory: "cren_newsletter",
      compensationDisclosureCategory: "none",
    });

    await sendTelegramInquiry({
      kind: 'newsletter',
      recordId: subscriberId,
      email,
      area,
      role,
      topic: topicValue,
      cadence,
      timeline,
      budget,
      commuteAnchor,
      interests: interests.join(', ') || null,
      source: sourceValue,
    });

    return NextResponse.json({ ok: true, step: "signup" }, { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
