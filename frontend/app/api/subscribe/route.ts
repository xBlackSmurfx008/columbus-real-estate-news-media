import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendTelegramInquiry } from "@/lib/telegram-inquiry";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SubscribePayload = {
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
    const email = cleanString(body.email, 320)?.toLowerCase() ?? "";

    if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 320) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
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
    const topicValue = [topic, ...interests].filter(Boolean).join(" | ").slice(0, 500) || null;
    const sourceValue = [
      source,
      role ? `role=${role}` : null,
      cadence ? `cadence=${cadence}` : null,
      timeline ? `timeline=${timeline}` : null,
      budget ? `budget=${budget}` : null,
      commuteAnchor ? `commute=${commuteAnchor}` : null,
    ]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 700);

    const sql = getDb();
    // Select-then-write: subscribers.email uniqueness is enforced by the
    // migration script's index, but older rows may predate it.
    const existing = await sql`SELECT id FROM subscribers WHERE email = ${email} LIMIT 1`;
    let subscriberId: string | number;
    if (existing.length > 0) {
      const [subscriber] = await sql`
        UPDATE subscribers
        SET area = ${area}, topic = ${topicValue}, source = ${sourceValue},
            status = 'active', updated_at = NOW()
        WHERE id = ${existing[0].id}
        RETURNING id
      `;
      subscriberId = subscriber.id;
    } else {
      const [subscriber] = await sql`
        INSERT INTO subscribers (email, area, topic, source, status)
        VALUES (${email}, ${area}, ${topicValue}, ${sourceValue}, 'active')
        RETURNING id
      `;
      subscriberId = subscriber.id;
    }

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

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
