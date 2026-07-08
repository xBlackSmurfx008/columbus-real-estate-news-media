import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET: all lead-layer datasets for the admin screen
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const sql = getDb();
    const leads = await sql`SELECT * FROM leads ORDER BY created_at DESC LIMIT 500`;
    const subscribers = await sql`SELECT * FROM subscribers ORDER BY created_at DESC LIMIT 500`;
    const contacts = await sql`SELECT * FROM contacts ORDER BY created_at DESC LIMIT 500`;
    const members = await sql`SELECT * FROM members ORDER BY created_at DESC LIMIT 500`;

    return NextResponse.json({ leads, subscribers, contacts, members });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
