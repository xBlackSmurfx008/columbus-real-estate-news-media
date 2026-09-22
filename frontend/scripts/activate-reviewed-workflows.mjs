#!/usr/bin/env node
// Exact-project activation; dry-run default. Never emits credentials or changes provider budgets.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { planWorkflowActivation, WORKFLOW_ENABLE_FLAGS, WORKFLOW_KEEP_OFF_FLAGS, WORKFLOW_REQUIRED_VALUES } from './workflow-activation-policy.mjs';

const projectId = 'prj_DNobqWei6zEnYnlxMGbrSTPcx2VR', teamId = 'team_bofjJO20r16HH2HjhvOz9Ouy';
const root = new URL('../', import.meta.url);
const linked = JSON.parse(readFileSync(new URL('.vercel/project.json', root), 'utf8'));
if (linked.projectId !== projectId || linked.orgId !== teamId) throw new Error('CREN_PROJECT_LINK_REQUIRED');
const apply = process.argv.includes('--apply');
if (apply && !process.argv.includes('--confirm=activate-reviewed-cren-workflows')) throw new Error('ACTIVATION_CONFIRMATION_REQUIRED');
function command(args, input) {
  try { return execFileSync('vercel', args, { cwd: root, input, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }); }
  catch { throw new Error('VERCEL_ACTIVATION_COMMAND_FAILED_OUTPUT_REDACTED'); }
}
const api = path => JSON.parse(command(['api', `${path}${path.includes('?') ? '&' : '?'}teamId=${teamId}`, '--raw']));
const production = api(`/v10/projects/${projectId}/env`).envs.filter(entry => entry.target?.includes('production'));
// The owner explicitly confirmed these destinations. Vercel redacts their current sensitive values,
// so pin them on apply instead of guessing what a hidden value contains.
const reviewTarget = { CREN_EDITOR_REVIEW_EMAIL: 'ceo@digiwealth.io', CREN_EDITOR_REVIEW_DOMAIN: 'review.columbusrealestatenews.com' };
const values = {};
for (const key of [...WORKFLOW_ENABLE_FLAGS, ...WORKFLOW_KEEP_OFF_FLAGS, ...WORKFLOW_REQUIRED_VALUES]) {
  const entries = production.filter(entry => entry.key === key);
  if (entries.length !== 1) throw new Error('WORKFLOW_ENVIRONMENT_MISSING_OR_AMBIGUOUS');
  // Secret presence is checked from metadata; never retrieve mail/database secrets for a flag-only change.
  // Actual usability is verified through authenticated post-deployment runtime probes.
  values[key] = reviewTarget[key] ?? (WORKFLOW_REQUIRED_VALUES.includes(key)
    ? 'configured-secret-runtime-check-required'
    : api(`/v1/projects/${projectId}/env/${entries[0].id}`).value);
}
const plan = planWorkflowActivation(values);
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', projectId, ...plan,
  pinnedOwnerDestinationKeys: Object.keys(reviewTarget),
  previouslyEnabled: WORKFLOW_ENABLE_FLAGS.filter(key => values[key] === 'true'), requiresDeployment: apply }));
if (apply) {
  for (const [key, value] of Object.entries(reviewTarget)) {
    command(['env','add',key,'production','--force','--yes','--sensitive'], value);
    console.log(JSON.stringify({ pinnedOwnerDestination: key, valueRedacted: true }));
  }
  for (const [key, value] of Object.entries(plan.set)) {
    if (values[key] !== value) command(['env','add',key,'production','--force','--yes','--no-sensitive'], value);
    console.log(JSON.stringify({ configured: key, enabled: true }));
  }
}
