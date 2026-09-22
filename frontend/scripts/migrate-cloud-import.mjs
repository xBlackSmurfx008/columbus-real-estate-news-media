#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import { cloudImportSchema } from './cloud-draft-import.mjs';
const args = new Set(process.argv.slice(2));
if (args.has('--check')) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'
    AND table_name IN ('cren_cloud_draft_imports','cren_cloud_import_runs')`;
  const columns=await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public'
    AND table_name='article_image_jobs' AND column_name='cloud_lease_token'`;
  const ok=rows.length===2&&columns.length===1;
  console.log(JSON.stringify({ok,mode:'check',installed:rows.map(row=>row.table_name),imageLeaseReady:columns.length===1}));
  if(!ok) process.exitCode=1;
} else if(args.has('--apply')) {
  if(!args.has('--confirm=cren-cloud-import')) throw new Error('CONFIRMATION_REQUIRED');
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
  const sql=neon(process.env.DATABASE_URL);
  await sql.transaction(cloudImportSchema.map(statement=>sql.query(statement)));
  console.log(JSON.stringify({ok:true,mode:'apply',statements:cloudImportSchema.length}));
} else console.log(JSON.stringify({ok:true,mode:'dry-run',statements:cloudImportSchema},null,2));
