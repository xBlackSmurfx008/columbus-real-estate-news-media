#!/usr/bin/env node
// Scoped rollout configuration. Dry-run by default; never prints secret values.
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const project = JSON.parse(readFileSync(new URL('../.vercel/project.json', import.meta.url), 'utf8'));
const projectId = 'prj_DNobqWei6zEnYnlxMGbrSTPcx2VR';
const teamId = 'team_bofjJO20r16HH2HjhvOz9Ouy';
if (project.projectId !== projectId || project.orgId !== teamId) throw new Error('CREN_PROJECT_LINK_REQUIRED');
const cwd = new URL('../', import.meta.url);
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
if (apply && !args.has('--confirm=cren-disabled-rollout')) throw new Error('EXPLICIT_ROLLOUT_CONFIRMATION_REQUIRED');

function vercel(parameters, input) {
  try { return execFileSync('vercel', parameters, { cwd, input, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }); }
  catch { throw new Error(`VERCEL_CONFIGURATION_FAILED:${parameters[0]}`); }
}
const existing = JSON.parse(vercel(['api', `/v9/projects/${projectId}/env?teamId=${teamId}`, '--raw']));
const productionNames = new Set((existing.envs ?? []).filter(entry => entry.target?.includes('production')).map(entry => entry.key));
const values = {
  CREN_OPERATIONS_ENABLED: 'false', CREN_CADENCE_ENABLED: 'false', CRM_SYNC_ENABLED: 'false',
  AGENT_EXTERNAL_SENDS_ENABLED: 'false', AGENT_AUTO_SEND_LOW_RISK: 'false',
  CREN_EDITORIAL_CORRECTIONS_ENABLED: 'false', CREN_EDITORIAL_PROOFS_ENABLED: 'false',
  CREN_ACQUISITION_INTAKE_ENABLED: 'false', NEXT_PUBLIC_CREN_ACQUISITION_INTAKE_ENABLED: 'false',
  CREN_ACQUISITION_ENTITY_NAME: 'CREN', NEXT_PUBLIC_CREN_ACQUISITION_ENTITY_NAME: 'CREN',
  CREN_OPERATIONS_MAX_AGE_MINUTES: '150',
  INTAKE_PUBLIC_ORIGIN: 'https://www.columbusrealestatenews.com',
  TURNSTILE_EXPECTED_HOSTNAMES: 'columbusrealestatenews.com,www.columbusrealestatenews.com',
};
const needsHash = !productionNames.has('INTAKE_HASH_SECRET');
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', projectId, teamId,
  configuredKeys: Object.keys(values), createIntakeHashSecret: needsHash,
  missingChallengeKeys: ['TURNSTILE_SECRET_KEY','NEXT_PUBLIC_TURNSTILE_SITE_KEY'].filter(key => !productionNames.has(key)),
  deploymentOrActivation: false }));
if (apply) {
  if (needsHash) values.INTAKE_HASH_SECRET = randomBytes(32).toString('hex');
  for (const [key,value] of Object.entries(values)) {
    vercel(['env','add',key,'production','--force','--yes', key === 'INTAKE_HASH_SECRET' ? '--sensitive' : '--no-sensitive'], value);
    console.log(JSON.stringify({ configured: key, valueRedacted: true }));
  }
}
