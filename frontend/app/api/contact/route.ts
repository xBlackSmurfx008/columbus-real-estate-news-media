import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendTelegramInquiry } from "@/lib/telegram-inquiry";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST: contact form submission (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message, source, inquiry_type: inquiryType, company, package_interest: packageInterest, budget } = body;

    if (typeof name !== "string" || !name.trim() || name.length > 200) {
      return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 320) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (typeof message !== "string" || !message.trim() || message.length > 5000) {
      return NextResponse.json({ error: "Enter a message." }, { status: 400 });
    }

    const cleanSource = typeof source === 'string' ? source.slice(0, 120) : null;
    const isAdvertising = inquiryType === 'advertising' || cleanSource?.startsWith('advertise');
    const cleanCompany = typeof company === 'string' ? company.trim().slice(0, 200) : null;
    const cleanPackage = typeof packageInterest === 'string' ? packageInterest.trim().slice(0, 120) : null;
    const cleanBudget = typeof budget === 'string' ? budget.trim().slice(0, 120) : null;
    const cleanMessage = message.trim();
    const storedMessage = isAdvertising
      ? [`Company: ${cleanCompany || 'Not provided'}`, `Package: ${cleanPackage || 'Not selected'}`, `Budget: ${cleanBudget || 'Not provided'}`, '', cleanMessage].join('\n')
      : cleanMessage;
    const sql = getDb();
    const [contact] = await sql`
      INSERT INTO contacts (name, email, message, source, status)
      VALUES (${name.trim()}, ${email}, ${storedMessage}, ${cleanSource}, 'new')
      RETURNING id
    `;

    await sendTelegramInquiry({
      kind: isAdvertising ? 'advertising' : 'general',
      recordId: contact.id,
      name: name.trim(),
      email,
      source: cleanSource,
      company: cleanCompany,
      packageInterest: cleanPackage,
      budget: cleanBudget,
      message: cleanMessage,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
