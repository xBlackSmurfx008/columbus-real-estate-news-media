import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendTelegramInquiry } from "@/lib/telegram-inquiry";
import { FORM_VERSIONS } from "@/lib/compliance/policy-versions";
import { recordConsentEventSafely } from "@/lib/compliance/consent-events";
import { mirrorAdvertisingInquirySafely } from "@/lib/compliance/intake-records";
import { enqueueInquirySafely } from "@/lib/inquiry-queue-db";
import { inquiryTypeForContact } from "@/lib/inquiry-queue";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST: contact form submission (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message, source, inquiry_type: inquiryType, company, package_interest: packageInterest, budget, consent } = body;

    if (typeof name !== "string" || !name.trim() || name.length > 200) {
      return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 320) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (typeof message !== "string" || !message.trim() || message.length > 5000) {
      return NextResponse.json({ error: "Enter a message." }, { status: 400 });
    }
    if (consent !== true) {
      return NextResponse.json({ error: "Please check the permission box so we can respond." }, { status: 400 });
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
    const sourceRoute = typeof body.sourceRoute === "string" ? body.sourceRoute.slice(0, 500) : cleanSource;

    // Same invariant as the lead funnel: advertiser, directory, and general
    // contact messages all enter the one operating queue with an owner and a
    // one-business-day timer.
    await enqueueInquirySafely(sql, {
      sourceTable: "contacts",
      sourceId: contact.id,
      inquiryType: inquiryTypeForContact(cleanSource, typeof inquiryType === "string" ? inquiryType : null),
      name: name.trim(),
      email,
      source: cleanSource,
      sourceRoute,
      summary: [cleanCompany ? `Company: ${cleanCompany}` : null, cleanPackage ? `Package: ${cleanPackage}` : null, cleanMessage]
        .filter(Boolean)
        .join(" | ")
        .slice(0, 900),
    });

    await recordConsentEventSafely(sql, {
      consentKey: isAdvertising ? "advertiserTerms" : "contactPermission",
      entityType: "contact",
      entityId: contact.id,
      email,
      sourceRoute,
      formId: isAdvertising ? "advertising-inquiry-form" : "contact-form",
      formVersion: isAdvertising ? FORM_VERSIONS.advertisingInquiry : FORM_VERSIONS.contact,
      recipientCategory: isAdvertising ? "sales_review_queue" : "cren_team",
      compensationDisclosureCategory: isAdvertising ? "advertiser" : "none",
    });
    if (isAdvertising) {
      await mirrorAdvertisingInquirySafely(sql, {
        contactId: contact.id,
        name: name.trim(),
        email,
        company: cleanCompany,
        packageInterest: cleanPackage,
        budget: cleanBudget,
        message: cleanMessage,
      });
    }

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
