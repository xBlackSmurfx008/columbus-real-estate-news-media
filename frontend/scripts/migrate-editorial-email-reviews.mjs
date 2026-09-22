#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import { editorialEmailSchema } from './editorial-email-schema.mjs';
const apply = process.argv.includes('--apply');
if (!apply && !process.argv.includes('--check')) {
  console.log(JSON.stringify({ dryRun: true, statements: editorialEmailSchema }));
} else {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
  const sql = neon(process.env.DATABASE_URL);
  if (apply) {
    if (!process.argv.includes('--confirm=editorial-email-v2')) throw new Error('MIGRATION_CONFIRMATION_REQUIRED');
    await sql.transaction(editorialEmailSchema.map((statement) => sql.query(statement)));
    console.log(JSON.stringify({ applied: true }));
  } else {
    const rows = await sql`SELECT to_regclass('editorial_email_reviews') AS reviews,
      to_regclass('editorial_email_events') AS events, to_regclass('editorial_email_event_actions') AS actions,
      to_regclass('editorial_correction_jobs') AS jobs,
      to_regclass('editorial_email_owner_confirmations') AS owner_confirmations,
      to_regclass('editorial_email_publications') AS publications,
      to_regclass('editorial_email_publication_checks') AS publication_checks,
      to_regclass('editorial_publication_fence') AS publication_fence`;
    const ready = Object.values(rows[0]).every(Boolean);
    console.log(JSON.stringify({ ready, schema: rows[0] }));
    if (!ready) process.exitCode = 1;
  }
}
