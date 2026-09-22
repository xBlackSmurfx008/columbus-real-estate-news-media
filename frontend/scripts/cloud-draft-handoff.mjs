#!/usr/bin/env node
// Read-only default: fetch today's immutable public artifacts, validate against existing DB, print safe outcomes.
import { neon } from '@neondatabase/serverless';
import { readCloudDrafts } from './cloud-draft-source.mjs';
import { runCloudImport } from './cloud-draft-import.mjs';
const apply=process.argv.includes('--apply');
if(apply&&!process.argv.includes('--confirm=cren-cloud-draft-import')) throw new Error('CONFIRMATION_REQUIRED');
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
try {
  const now=new Date();
  const result=await runCloudImport(neon(process.env.DATABASE_URL),()=>readCloudDrafts({now}),{now,apply});
  console.log(JSON.stringify({mode:apply?'apply':'dry-run',...result},null,2));
  if(!result.ok) process.exitCode=1;
} catch { console.error('CLOUD_IMPORT_UNAVAILABLE');process.exitCode=1; }
