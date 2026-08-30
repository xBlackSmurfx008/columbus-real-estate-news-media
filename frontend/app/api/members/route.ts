import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { setMemberSessionCookie, signMemberToken } from "@/lib/member-auth";
import { sendTelegramInquiry } from "@/lib/telegram-inquiry";
import { FORM_VERSIONS } from "@/lib/compliance/policy-versions";
import { recordConsentEventSafely } from "@/lib/compliance/consent-events";
import { recommendCrmRoute, syncTo008Crm, warnOnCrmSyncFailure } from "@/lib/crm-sync";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST: free membership signup (public). Upserts by email and mirrors
// into subscribers so there is a single email list.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, interests, source, termsConsent, emailConsent } = body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > 320) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 10 || password.length > 128) {
      return NextResponse.json({ error: "Use a password with at least 10 characters." }, { status: 400 });
    }
    if (termsConsent !== true) {
      return NextResponse.json({ error: "Please accept the Terms and Privacy Policy to create an account." }, { status: 400 });
    }

    const sql = getDb();
    const cleanName = typeof name === "string" ? name.trim().slice(0, 200) : null;
    const cleanInterests = typeof interests === "string" ? interests.slice(0, 500) : null;
    if (!cleanName) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    const passwordHash = await bcrypt.hash(password, 12);

    const [member] = await sql`
      INSERT INTO members (email, name, interests, password_hash, tier, status)
      VALUES (${normalizedEmail}, ${cleanName}, ${cleanInterests}, ${passwordHash}, 'free', 'active')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, name, interests, preferred_area, role, bio, tier, status
    `;
    if (!member) {
      return NextResponse.json({ error: "An account already exists for this email. Sign in to continue." }, { status: 409 });
    }

    const cleanSource = typeof source === "string" ? source.slice(0, 120) : "join";
    await recordConsentEventSafely(sql, {
      consentKey: "memberTerms",
      actorType: "member",
      actorId: member.id,
      entityType: "member",
      entityId: member.id,
      email: normalizedEmail,
      sourceRoute: typeof body.sourceRoute === "string" ? body.sourceRoute.slice(0, 500) : cleanSource,
      formId: "join-form",
      formVersion: FORM_VERSIONS.join,
      recipientCategory: "member_account",
      compensationDisclosureCategory: "none",
    });

    if (emailConsent === true) {
      // Mirror into subscribers (select-then-write; table predates the index).
      const existing = await sql`SELECT id FROM subscribers WHERE email = ${normalizedEmail} LIMIT 1`;
      let subscriberId: string | number;
      if (existing.length > 0) {
        const [subscriber] = await sql`
          UPDATE subscribers
          SET topic = COALESCE(${cleanInterests}, topic), status = 'active', updated_at = NOW()
          WHERE id = ${existing[0].id}
          RETURNING id
        `;
        subscriberId = subscriber.id;
      } else {
        const [subscriber] = await sql`
          INSERT INTO subscribers (email, area, topic, source, status)
          VALUES (${normalizedEmail}, null, ${cleanInterests}, ${cleanSource}, 'active')
          RETURNING id
        `;
        subscriberId = subscriber.id;
      }
      await recordConsentEventSafely(sql, {
        consentKey: "emailMarketing",
        actorType: "member",
        actorId: member.id,
        entityType: "subscriber",
        entityId: subscriberId,
        email: normalizedEmail,
        sourceRoute: typeof body.sourceRoute === "string" ? body.sourceRoute.slice(0, 500) : cleanSource,
        formId: "join-form",
        formVersion: FORM_VERSIONS.join,
        recipientCategory: "cren_newsletter",
        compensationDisclosureCategory: "none",
      });
    }

    await setMemberSessionCookie(await signMemberToken({ userId: member.id, email: member.email }));

    await sendTelegramInquiry({
      kind: 'membership',
      recordId: member.id,
      name: cleanName,
      email: normalizedEmail,
      interests: cleanInterests,
      source: cleanSource,
    });

    const crmRoute = recommendCrmRoute({
      source: "member-profile",
      role: member.role,
      topic: cleanInterests,
      interests: cleanInterests,
    });
    const crmSync = await syncTo008Crm({
      eventType: "member_profile",
      externalId: `cren:members:${String(member.id)}`,
      contact: {
        name: cleanName,
        email: normalizedEmail,
        role: member.role,
      },
      lead: {
        title: `CREN member: ${cleanName}`,
        source: cleanSource,
        routeKey: crmRoute.routeKey,
        assignedTo: crmRoute.assigneeLabel,
        routingStatus: crmRoute.routingStatus,
        subscriberSegment: crmRoute.subscriberSegment,
        interestTags: crmRoute.interestTags,
        recordUrl: "https://www.columbusrealestatenews.com/profile",
      },
      metadata: {
        emailConsent: emailConsent === true,
        sourceRoute: "/api/members",
        routeReason: crmRoute.reason,
        responseSlaHours: crmRoute.responseSlaHours,
      },
    });
    warnOnCrmSyncFailure(`member ${String(member.id)}`, crmSync);

    return NextResponse.json({ ok: true, profile: member }, { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// GET: admin-only member listing
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const sql = getDb();
    const members = await sql`
      SELECT id, email, name, interests, preferred_area, role, bio, tier, status, created_at, updated_at
      FROM members ORDER BY created_at DESC LIMIT 500
    `;
    return NextResponse.json({ members });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
