#!/usr/bin/env node
// Private, attended dashboard-to-Vercel transfer. No credentials are printed or written locally.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const arg = (name) => [...args].find(value => value.startsWith(`${name}=`))?.split('=')[1];
const windowId = arg('--window');
const tabId = arg('--tab');
if (!/^\d+$/.test(windowId ?? '') || !/^\d+$/.test(tabId ?? '')) throw new Error('EXPLICIT_BROWSER_TAB_REQUIRED');
if (apply && !args.has('--confirm=cren-turnstile-production')) throw new Error('EXPLICIT_CONFIRMATION_REQUIRED');
const root = new URL('../', import.meta.url);
const link = JSON.parse(readFileSync(new URL('.vercel/project.json', root), 'utf8'));
const projectId = 'prj_DNobqWei6zEnYnlxMGbrSTPcx2VR';
const teamId = 'team_bofjJO20r16HH2HjhvOz9Ouy';
if (link.projectId !== projectId || link.orgId !== teamId) throw new Error('CREN_PROJECT_LINK_REQUIRED');
function run(command, parameters, input) {
  try { return execFileSync(command, parameters, { cwd: root, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }); }
  catch { throw new Error(`${command.toUpperCase()}_FAILED_OUTPUT_REDACTED`); }
}
const metadata = JSON.parse(run('vercel', ['api', `/v9/projects/${projectId}/env?teamId=${teamId}`, '--raw']));
const existing = new Set(metadata.envs.filter(e => e.target?.includes('production')).map(e => e.key));
const keys = ['TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'];
// Refuse to overwrite an existing widget's credentials; partial transfers require explicit review.
if (apply && keys.some(key => existing.has(key))) throw new Error('EXISTING_TURNSTILE_CONFIGURATION_REQUIRES_REVIEW');
const expression = `(()=>{
  if(location.origin!=='https://dash.cloudflare.com'||!location.pathname.startsWith('/cbdb53d41c421f82549946d71e72eb8e/turnstile/')) throw new Error('WRONG_DASHBOARD');
  const site=document.querySelector('input[name="site_key"]')?.value;
  const secret=document.querySelector('input[name="secret"]')?.value;
  if(!site||!secret) throw new Error('WIDGET_KEYS_NOT_VISIBLE');
  return JSON.stringify(${apply ? '{site,secret}' : '{sitePresent:!!site,secretPresent:!!secret}'});
})()`;
const apple = `tell application "Google Chrome"\n tell tab id ${tabId} of window id ${windowId}\n execute javascript ${JSON.stringify(expression)}\n end tell\nend tell`;
let captured;
try { captured = JSON.parse(run('osascript', ['-e', apple])); }
catch { throw new Error('DASHBOARD_KEY_CAPTURE_FAILED_OUTPUT_REDACTED'); }
if (!apply) {
  console.log(JSON.stringify({ mode: 'dry-run', projectId, ...captured, existingKeys: keys.filter(key => existing.has(key)), writes: false }));
} else {
  if (![captured.site, captured.secret].every(value => /^[A-Za-z0-9_-]{20,100}$/.test(value))) throw new Error('UNEXPECTED_KEY_FORMAT');
  if (/^[123]x0/.test(captured.site) || /^[123]x0/.test(captured.secret)) throw new Error('PRODUCTION_TEST_KEYS_FORBIDDEN');
  run('vercel', ['env', 'add', 'TURNSTILE_SECRET_KEY', 'production', '--sensitive', '--yes'], captured.secret);
  run('vercel', ['env', 'add', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'production', '--no-sensitive', '--yes'], captured.site);
  captured.secret = undefined;
  const after = JSON.parse(run('vercel', ['api', `/v9/projects/${projectId}/env?teamId=${teamId}`, '--raw']));
  const verified = after.envs.filter(e => keys.includes(e.key) && e.target?.includes('production'));
  if (verified.length !== 2 || !verified.some(e => e.key === 'TURNSTILE_SECRET_KEY' && e.type === 'sensitive')) throw new Error('CONFIGURATION_VERIFICATION_FAILED');
  console.log(JSON.stringify({ configured: verified.map(e => ({ key: e.key, type: e.type, target: e.target })), secretPrinted: false, deployed: false }));
}
