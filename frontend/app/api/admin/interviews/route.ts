import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET: Fetch all interviews
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const sql = getDb();
    const interviews = await sql`SELECT * FROM interviews ORDER BY sort_order ASC`;
    return NextResponse.json({ interviews });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// POST: Create new interview
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const {
      title,
      subject,
      interviewer,
      date,
      status,
      featured,
      excerpt,
      body: interviewBody,
      read_time,
      // Legacy fields
      id,
      name,
      initials,
      role,
      topic,
      sort_order
    } = body;

    // Use title/subject/interviewer if provided, otherwise fallback to legacy fields
    const finalId = id || `interview-${Date.now()}`;
    const finalName = title || name || 'Untitled';
    const finalInitials = initials || (name ? name.substring(0, 2).toUpperCase() : 'IN');
    const finalRole = role || subject || 'Interview';

    const sql = getDb();

    // Try inserting with new schema first
    try {
      const result = await sql`
        INSERT INTO interviews (id, title, subject, interviewer, date, status, featured, excerpt, body, read_time)
        VALUES (${finalId}, ${title || null}, ${subject || null}, ${interviewer || null}, ${date || new Date().toISOString().split('T')[0]}, ${status || "draft"}, ${featured || false}, ${excerpt || null}, ${interviewBody || null}, ${read_time || 5})
        RETURNING *
      `;
      return NextResponse.json(result[0], { status: 201 });
    } catch {
      // Fallback to legacy schema
      const result = await sql`
        INSERT INTO interviews (id, name, initials, role, topic, status, date, sort_order)
        VALUES (${finalId}, ${finalName}, ${finalInitials}, ${finalRole}, ${topic || null}, ${status || "pitched"}, ${date || "TBD"}, ${sort_order || 0})
        RETURNING *
      `;
      return NextResponse.json(result[0], { status: 201 });
    }
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
