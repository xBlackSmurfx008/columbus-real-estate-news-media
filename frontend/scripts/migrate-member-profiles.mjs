#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);
const table = await sql`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members'`;
if (table.length === 0) {
  await sql`
    CREATE TABLE members (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      interests TEXT,
      preferred_area TEXT,
      role TEXT,
      bio TEXT,
      password_hash TEXT,
      tier TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'active',
      stripe_customer_id TEXT,
      tier_started_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("created: members");
} else {
  for (const column of [
    ["preferred_area", "TEXT"],
    ["role", "TEXT"],
    ["bio", "TEXT"],
    ["password_hash", "TEXT"],
  ]) {
    await sql.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS ${column[0]} ${column[1]}`);
    console.log(`ensured: members.${column[0]}`);
  }
}

console.log("member profile migration complete");
