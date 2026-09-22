#!/usr/bin/env node
// Attended UI helper. Open CREN's Edit routine dialog first. No credential or account-data extraction.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {buildCloudRoutineInstructions,routineInstructionHash} from './cloud-routine-instructions.mjs';
const arg=name=>process.argv.find(value=>value.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const ids=['pid','window','tab'].map(name=>arg(name));
if(ids.some(value=>!/^\d+$/.test(value??'')))throw new Error('EXACT_CHROME_TARGET_REQUIRED');
const apply=process.argv.includes('--apply');
if(apply&&arg('confirm')!=='cren-cloud-routine')throw new Error('CONFIRMATION_REQUIRED');
const routine='https://claude.ai/code/routines/trig_01K92dUMrzY5eMRQH7Pa6CUe';
function browser(js){
  const source=`var t=Application(${ids[0]}).windows.byId(${ids[1]}).tabs.byId(${ids[2]}); t.execute({javascript:${JSON.stringify(js)}});`;
  try{return execFileSync('osascript',['-l','JavaScript','-'],{input:source,encoding:'utf8',timeout:15_000,stdio:['pipe','pipe','pipe']}).trim();}
  catch{throw new Error('CREN_BROWSER_ACCESS_FAILED_OUTPUT_REDACTED');}
}
const existing=JSON.parse(browser(`(()=>{if(location.href!==${JSON.stringify(routine)})throw Error('WRONG_ROUTINE');
  const d=[...document.querySelectorAll('[role=dialog]')].find(x=>x.innerText.startsWith('Edit routine'));
  if(!d||d.querySelector('input[placeholder="Daily code review"]')?.value!=='cre-news-newsroom')throw Error('WRONG_DIALOG');
  return JSON.stringify({instructions:d.querySelector('textarea').value});})()`));
if(!existing?.instructions?.includes('[routine: cre-news-newsroom'))throw new Error('CREN_INSTRUCTION_IDENTITY_REQUIRED');
const handoff=readFileSync(new URL('../prompts/CLOUD_ROUTINE_HANDOFF.md',import.meta.url),'utf8');
const writing=readFileSync(new URL('../prompts/ARTICLE_WRITING.md',import.meta.url),'utf8');
const updated=buildCloudRoutineInstructions({handoff,writing});
console.log(JSON.stringify({mode:apply?'apply':'dry-run',routine:'cre-news-newsroom',changed:updated!==existing.instructions,
  originalHash:routineInstructionHash(existing.instructions),expectedHash:routineInstructionHash(updated),scheduleChange:false,credentialsTransferred:0}));
if(apply&&updated!==existing.instructions){
  const result=browser(`(()=>{if(location.href!==${JSON.stringify(routine)})throw Error('WRONG_ROUTINE');
    const d=[...document.querySelectorAll('[role=dialog]')].find(x=>x.innerText.startsWith('Edit routine'));
    const t=d?.querySelector('textarea');if(!t||t.value!==${JSON.stringify(existing.instructions)})throw Error('INSTRUCTIONS_CHANGED');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,${JSON.stringify(updated)});
    t.dispatchEvent(new Event('input',{bubbles:true}));t.dispatchEvent(new Event('change',{bubbles:true}));
    return JSON.stringify({filled:t.value===${JSON.stringify(updated)}});})()`);
  if(!JSON.parse(result).filled)throw new Error('ROUTINE_FILL_FAILED');
  browser(`(()=>{const d=[...document.querySelectorAll('[role=dialog]')].find(x=>x.innerText.startsWith('Edit routine'));
    const b=[...d.querySelectorAll('button')].find(x=>x.innerText.trim()==='Save');if(!b||b.disabled)throw Error('SAVE_UNAVAILABLE');b.click();return 'SAVE_REQUESTED';})()`);
  console.log(JSON.stringify({savedRequested:true,requiresIndependentReadback:true}));
}
