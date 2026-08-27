import { NextRequest, NextResponse } from "next/server";
import { getDb, initSchema, seedData } from "@/lib/db";
import { ensureAdminUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const initToken = process.env.ADMIN_INIT_TOKEN;
    const authorization = request.headers.get("authorization");
    if (!initToken) {
      return NextResponse.json(
        { error: "Admin initialization is disabled" },
        { status: 503 }
      );
    }
    if (authorization !== `Bearer ${initToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sql = getDb();

    // Check if schema already exists (safe to call multiple times)
    const tableCheck = await sql`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'admin_users'
    `;
    const schemaExists = Number(tableCheck[0].count) > 0;

    if (!schemaExists) {
      await initSchema();
    }

    // Seed data (will skip if already seeded)
    const seedResult = await seedData();

    // Ensure admin user exists
    const adminResult = await ensureAdminUser();

    return NextResponse.json({
      success: true,
      schemaExists,
      seeded: seedResult,
      admin: adminResult,
      message: "Database initialized and ready for use",
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
