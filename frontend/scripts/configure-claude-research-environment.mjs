#!/usr/bin/env node
// Attended Chrome UI: assign an existing, secret-free CREN environment only.
import { execFileSync } from 'node:child_process';
const arg = n => process.argv.find(x => x.startsWith(`--${n}=`))?.slice(n.length + 3);
const windowId = arg('window'), tabId = arg('tab');
if (![windowId, tabId].every(x => /^\d+$/.test(x ?? ''))) throw Error('EXACT_BROWSER_TARGET_REQUIRED');
const targets = {
  newsroom: ['trig_01K92dUMrzY5eMRQH7Pa6CUe', 'cre-news-newsroom'],
  social: ['trig_012CStw9Z125jkXwk4hTD4KZ', 'cre-news-social-listen'],
  weekly: ['trig_016rhF74yLz6VhLQLvhJ3p35', 'cre-news-weekly-seo'],
  monthly: ['trig_014fQXTnGRGStYeFdeZXSvED', 'cre-news-monthly-review'],
};
const target = targets[arg('routine')];
if (!target) throw Error('KNOWN_ROUTINE_REQUIRED');
const apply = process.argv.includes('--apply');
if (apply && arg('confirm') !== `environment-${target[1]}`) throw Error('CONFIRMATION_REQUIRED');
function js(code) {
  const quoted = JSON.stringify(code);
  try { return execFileSync('osascript', ['-'], { input: `tell application "Google Chrome"\nreturn execute tab id ${tabId} of window id ${windowId} javascript ${quoted}\nend tell`, encoding: 'utf8', timeout: 15000 }).trim(); }
  catch { throw Error('BROWSER_OPERATION_FAILED'); }
}
async function until(code) {
  for (let i = 0; i < 30; i++) {
    const result = js(code);
    if (result && result !== 'false' && result !== 'null') return result;
    await new Promise(r => setTimeout(r, 500));
  }
  throw Error('UI_TIMEOUT');
}
const url = `https://claude.ai/code/routines/${target[0]}`;
async function open() {
  js(`location.href=${JSON.stringify(url)}; 'navigating'`);
  await until(`location.href===${JSON.stringify(url)} && !!document.querySelector('button[aria-label="Edit instructions"]')`);
  js(`document.querySelector('button[aria-label="Edit instructions"]').click(); 'opened'`);
  await until(`!!document.querySelector('input[placeholder="Daily code review"]')`);
  if (js(`document.querySelector('input[placeholder="Daily code review"]').value`) !== target[1]) throw Error('WRONG_ROUTINE');
}
await open();
const selector = 'button[aria-label="Cloud environment"]';
const before = js(`document.querySelector(${JSON.stringify(selector)}).innerText`);
if (apply && !before.includes('CREN public research')) {
  js(`document.querySelector(${JSON.stringify(selector)}).click(); 'opened'`);
  await until(`!![...document.querySelectorAll('[role=option]')].find(e=>e.innerText.includes('CREN public research'))`);
  js(`[...document.querySelectorAll('[role=option]')].find(e=>e.innerText.includes('CREN public research')).click(); 'selected'`);
  js(`(()=>{const d=[...document.querySelectorAll('[role=dialog]')].find(e=>e.querySelector('input[placeholder="Daily code review"]'));if(!d.querySelector(${JSON.stringify(selector)}).innerText.includes('CREN public research'))throw Error('ENVIRONMENT_NOT_SELECTED');[...d.querySelectorAll('button')].find(b=>b.innerText==='Save').click();return 'saved'})()`);
  await until(`!document.querySelector('input[placeholder="Daily code review"]')`);
  await open();
}
const after = js(`document.querySelector(${JSON.stringify(selector)}).innerText`);
console.log(JSON.stringify({ routine: target[1], mode: apply ? 'apply' : 'read-only', before, after, verified: after.includes('CREN public research'), instructionsChanged: false, scheduleChanged: false, credentialsTransferred: 0 }));
js(`(()=>{const d=[...document.querySelectorAll('[role=dialog]')].find(e=>e.querySelector('input[placeholder="Daily code review"]'));[...d.querySelectorAll('button')].find(b=>b.innerText==='Cancel').click();return 'closed'})()`);
