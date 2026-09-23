#!/usr/bin/env node
// Attended UI helper. Open the exact routine's Edit dialog first. Never reads or transfers credentials.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildCloudRoutineInstructions, routineInstructionHash } from './cloud-routine-instructions.mjs';

const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const targets = ['pid', 'window', 'tab'].map(name => arg(name));
if (targets.some(value => !/^\d+$/.test(value ?? ''))) throw new Error('EXACT_CHROME_TARGET_REQUIRED');
const routineKey = arg('routine');
const configurations = {
  newsroom: { id: 'trig_01K92dUMrzY5eMRQH7Pa6CUe', name: 'cre-news-newsroom', build: () => buildCloudRoutineInstructions({
    handoff: readFileSync(new URL('../prompts/CLOUD_ROUTINE_HANDOFF.md', import.meta.url), 'utf8'),
    writing: readFileSync(new URL('../prompts/ARTICLE_WRITING.md', import.meta.url), 'utf8'),
  }) },
  social: { id: 'trig_012CStw9Z125jkXwk4hTD4KZ', name: 'cre-news-social-listen',
    file: '../prompts/CLAUDE_SOCIAL_LISTENER.md', version: 'v2 leads-only' },
  weekly: { id: 'trig_016rhF74yLz6VhLQLvhJ3p35', name: 'cre-news-weekly-seo',
    file: '../prompts/CLAUDE_WEEKLY_SEO.md', version: 'v2 live-corpus' },
  monthly: { id: 'trig_014fQXTnGRGStYeFdeZXSvED', name: 'cre-news-monthly-review',
    file: '../prompts/CLAUDE_MONTHLY_REVIEW.md', version: 'v1 planning-only' },
};
const configuration = configurations[routineKey];
if (!configuration) throw new Error('KNOWN_ROUTINE_REQUIRED');
const apply = process.argv.includes('--apply');
if (apply && arg('confirm') !== `configure-${configuration.name}`) throw new Error('CONFIRMATION_REQUIRED');
const routineUrl = `https://claude.ai/code/routines/${configuration.id}`;
function browser(javascript) {
  // Native AppleScript preserves numeric Chrome window/tab IDs. JXA can resolve
  // another Chrome instance when headless test browsers are also running.
  const quoted = '"' + javascript.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"';
  const source = `tell application "Google Chrome"
    set targetWindow to window id ${targets[1]}
    set targetTab to tab id ${targets[2]} of targetWindow
    return execute targetTab javascript ${quoted}
  end tell`;
  try { return execFileSync('osascript', ['-'], { input: source, encoding: 'utf8', timeout: 15_000,
    stdio: ['pipe', 'pipe', 'pipe'] }).trim(); }
  catch { throw new Error('CREN_BROWSER_ACCESS_FAILED_OUTPUT_REDACTED'); }
}
const existing = JSON.parse(browser(`(()=>{if(location.href!==${JSON.stringify(routineUrl)})throw Error('WRONG_ROUTINE');
  const d=[...document.querySelectorAll('[role=dialog]')].find(x=>x.innerText.startsWith('Edit routine'));
  if(!d||d.querySelector('input[placeholder="Daily code review"]')?.value!==${JSON.stringify(configuration.name)})throw Error('WRONG_DIALOG');
  return JSON.stringify({instructions:d.querySelector('textarea').value});})()`));
if (!existing?.instructions?.includes(`[routine: ${configuration.name}`)) throw new Error('CREN_INSTRUCTION_IDENTITY_REQUIRED');
const updated = configuration.build ? configuration.build() : `[routine: ${configuration.name} ${configuration.version}]\n\n${readFileSync(new URL(configuration.file, import.meta.url), 'utf8').trim()}`;
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', routine: configuration.name,
  changed: updated !== existing.instructions, originalHash: routineInstructionHash(existing.instructions),
  expectedHash: routineInstructionHash(updated), scheduleChange: false, credentialsTransferred: 0 }));
if (apply && updated !== existing.instructions) {
  const result = browser(`(()=>{if(location.href!==${JSON.stringify(routineUrl)})throw Error('WRONG_ROUTINE');
    const d=[...document.querySelectorAll('[role=dialog]')].find(x=>x.innerText.startsWith('Edit routine'));
    const t=d?.querySelector('textarea');if(!t||t.value!==${JSON.stringify(existing.instructions)})throw Error('INSTRUCTIONS_CHANGED');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,${JSON.stringify(updated)});
    t.dispatchEvent(new Event('input',{bubbles:true}));t.dispatchEvent(new Event('change',{bubbles:true}));
    return JSON.stringify({filled:t.value===${JSON.stringify(updated)}});})()`);
  if (!JSON.parse(result).filled) throw new Error('ROUTINE_FILL_FAILED');
  browser(`(()=>{const d=[...document.querySelectorAll('[role=dialog]')].find(x=>x.innerText.startsWith('Edit routine'));
    const b=[...d.querySelectorAll('button')].find(x=>x.innerText.trim()==='Save');if(!b||b.disabled)throw Error('SAVE_UNAVAILABLE');
    b.click();return 'SAVE_REQUESTED';})()`);
  console.log(JSON.stringify({ savedRequested: true, requiresIndependentReadback: true }));
}
