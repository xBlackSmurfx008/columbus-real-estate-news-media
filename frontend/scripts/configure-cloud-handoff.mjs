#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { WORKFLOW_KEEP_OFF_FLAGS } from './workflow-activation-policy.mjs';
const projectId='prj_DNobqWei6zEnYnlxMGbrSTPcx2VR',teamId='team_bofjJO20r16HH2HjhvOz9Ouy';
const root=new URL('../',import.meta.url);
const link=JSON.parse(readFileSync(new URL('.vercel/project.json',root),'utf8'));
if(link.projectId!==projectId||link.orgId!==teamId) throw new Error('CREN_PROJECT_LINK_REQUIRED');
const apply=process.argv.includes('--apply');
if(apply&&!process.argv.includes('--confirm=cren-cloud-handoff')) throw new Error('CONFIRMATION_REQUIRED');
function command(args,input) {
  try{return execFileSync('vercel',args,{cwd:root,input,encoding:'utf8',stdio:['pipe','pipe','pipe']});}
  catch{throw new Error('VERCEL_CONFIG_FAILED_OUTPUT_REDACTED');}
}
const api=path=>JSON.parse(command(['api',`${path}?teamId=${teamId}`,'--raw']));
const production=api(`/v10/projects/${projectId}/env`).envs.filter(row=>row.target?.includes('production'));
for(const key of [...WORKFLOW_KEEP_OFF_FLAGS,'CREN_EDITORIAL_PROOFS_ENABLED','CREN_CLOUD_IMAGES_ENABLED']) {
  const rows=production.filter(row=>row.key===key);
  if(rows.length!==1) throw new Error('WORKFLOW_CONFIGURATION_INCOMPLETE');
  const expected=WORKFLOW_KEEP_OFF_FLAGS.includes(key)?'false':'true';
  if(api(`/v1/projects/${projectId}/env/${rows[0].id}`).value!==expected) throw new Error('PROTECTED_WORKFLOW_FLAG_MISMATCH');
}
for(const key of ['DATABASE_URL','CRON_SECRET','BLOB_READ_WRITE_TOKEN']) {
  if(production.filter(row=>row.key===key).length!==1) throw new Error('CLOUD_SECRET_CONFIGURATION_MISSING');
}
const set={CREN_CLOUD_IMPORT_ENABLED:'true',CREN_CLOUD_AI_IMAGES_ENABLED:'false'};
const current={};
for(const key of Object.keys(set)) {
  const rows=production.filter(row=>row.key===key);
  if(rows.length>1)throw new Error('AMBIGUOUS_CLOUD_CONFIGURATION');
  const value=rows.length?api(`/v1/projects/${projectId}/env/${rows[0].id}`).value:null;
  if(value!==null&&!['true','false'].includes(value))throw new Error('INVALID_CLOUD_FLAG');
  current[key]=value;
}
console.log(JSON.stringify({mode:apply?'apply':'dry-run',projectId,set,current,
  configurationMatches:Object.keys(set).every(key=>set[key]===current[key]),credentialsTransferred:0,requiresDeployment:apply}));
if(apply)for(const [key,value]of Object.entries(set)) {
  command(['env','add',key,'production','--force','--yes','--no-sensitive'],value);
  console.log(JSON.stringify({configured:key,enabled:value==='true'}));
}
