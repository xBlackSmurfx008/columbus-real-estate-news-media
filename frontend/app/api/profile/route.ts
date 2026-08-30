import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireMemberAuth } from "@/lib/member-auth";
import { recommendCrmRoute, syncTo008Crm, warnOnCrmSyncFailure } from "@/lib/crm-sync";

const MAX_BODY_BYTES = 8_192;

function clean(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const result = value.trim().replace(/\s+/g, " ");
  return result ? result.slice(0, max) : null;
}

function cleanInterests(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => clean(item, 80)).filter(Boolean).join(", ").slice(0, 500) || null;
  return clean(value, 500);
}

function profileColumns() {
  return "id, email, name, interests, preferred_area, role, bio, tier, status, created_at, updated_at";
}

export async function GET(request: NextRequest) {
  const auth = await requireMemberAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const sql = getDb();
    const [profile] = await sql.query(`SELECT ${profileColumns()} FROM members WHERE id = $1 AND status = 'active'`, [auth.userId]);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireMemberAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Profile update is too large." }, { status: 413 });
    const body = JSON.parse(raw);
    const name = clean(body.name, 200);
    const interests = cleanInterests(body.interests);
    const preferredArea = clean(body.preferredArea, 120);
    const role = clean(body.role, 80);
    const bio = clean(body.bio, 500);
    if (!name) return NextResponse.json({ error: "Enter your name." }, { status: 400 });

    const sql = getDb();
    const [profile] = await sql`
      UPDATE members
      SET name = ${name}, interests = ${interests}, preferred_area = ${preferredArea},
          role = ${role}, bio = ${bio}, updated_at = NOW()
      WHERE id = ${auth.userId} AND status = 'active'
      RETURNING id, email, name, interests, preferred_area, role, bio, tier, status, created_at, updated_at
    `;
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const subscriber = await sql`SELECT id FROM subscribers WHERE email = ${profile.email} LIMIT 1`;
    if (subscriber.length > 0) {
      await sql`
        UPDATE subscribers
        SET area = ${preferredArea}, topic = ${interests}, status = 'active', updated_at = NOW()
        WHERE id = ${subscriber[0].id}
      `;
    } else {
      await sql`
        INSERT INTO subscribers (email, area, topic, source, status)
        VALUES (${profile.email}, ${preferredArea}, ${interests}, 'member-profile', 'active')
      `;
    }

    const crmRoute = recommendCrmRoute({
      source: "member-profile",
      role,
      topic: interests,
      interests,
    });
    const crmSync = await syncTo008Crm({
      eventType: "member_profile",
      externalId: `cren:members:${String(profile.id)}:profile:${Date.now()}`,
      contact: {
        name,
        email: profile.email,
        role,
      },
      lead: {
        title: `CREN profile update: ${name}`,
        source: "member-profile",
        routeKey: crmRoute.routeKey,
        assignedTo: crmRoute.assigneeLabel,
        routingStatus: crmRoute.routingStatus,
        area: preferredArea,
        message: bio,
        subscriberSegment: crmRoute.subscriberSegment,
        interestTags: crmRoute.interestTags,
        recordUrl: "https://www.columbusrealestatenews.com/profile",
      },
      metadata: {
        sourceRoute: "/api/profile",
        routeReason: crmRoute.reason,
        responseSlaHours: crmRoute.responseSlaHours,
      },
    });
    warnOnCrmSyncFailure(`member profile ${String(profile.id)}`, crmSync);

    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
