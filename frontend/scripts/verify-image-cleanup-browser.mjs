#!/usr/bin/env node
// Read-only desktop/mobile visual verification. No form submissions or login.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { chromium } from '@playwright/test';
const arg = name => { const i=process.argv.indexOf(`--${name}`); return i<0?null:process.argv[i+1]; };
if(!arg('plan')||!arg('manifest')||!arg('output')) throw new Error('--plan FILE --manifest FILE --output NEW_DIRECTORY');
const plan=JSON.parse(await readFile(resolve(arg('plan')),'utf8'));
const manifest=JSON.parse(await readFile(resolve(arg('manifest')),'utf8'));
const out=resolve(arg('output')); await mkdir(dirname(out),{recursive:true}); await mkdir(out);
const origin='https://columbusrealestatenews.com';
const italian=manifest.images.flatMap(i=>i.usages).find(u=>u.kind==='article'&&u.id.includes('italian-village-state-library'));
const lead=manifest.images.flatMap(i=>i.usages).find(u=>u.kind==='article'&&u.id.includes('first-500m-bond'));
const paths=['/','/blog','/areas','/areas/italian-village','/topics/development',lead.path,italian.path];
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
  console.log('Checking public image metadata');
  const data=await (await fetch(origin+'/api/public',{signal:AbortSignal.timeout(30000)})).json();
  for(const p of plan) {
    const a=data.articles.find(a=>a.id===p.article_id);
    if(!a||a.image_alt!==p.image_alt||a.image_caption!==p.image_caption) throw new Error('PUBLIC_METADATA_MISMATCH:'+p.article_id);
  }
  for(const [size,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:375,height:812}]]) {
    const page=await browser.newPage({viewport});
    for(let i=0;i<paths.length;i++) {
      console.log(`Checking ${size} ${paths[i]}`);
      // Third-party/background requests need not become idle for a rendered
      // article to be ready. Require the main content and every actual image.
      const path=paths[i];const response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:60000});
      if(response.status()!==200) throw new Error('PAGE_STATUS:'+path);
      await page.locator('main').waitFor({state:'visible'});
      await page.evaluate(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,5000))]);});
      for(const img of await page.locator('main img').all()) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate(el=>Promise.race([el.decode().catch(()=>{}),new Promise(r=>setTimeout(r,5000))]));
      }
      const check=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        images:[...document.querySelectorAll('main img')].map(el=>({alt:el.alt,loaded:el.complete&&el.naturalWidth>0,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})),
        aiLabels:document.querySelector('main')?.innerText.match(/AI illustration/g)?.length??0,
        archiveLabels:document.querySelector('main')?.innerText.match(/Archival photo/g)?.length??0,
        caption:document.querySelector('figcaption')?.innerText??null,
        captionLinks:[...document.querySelectorAll('figcaption a')].map(a=>a.href),
      }));
      if(check.overflow||check.images.some(im=>!im.loaded||!im.alt)) throw new Error('IMAGE_LAYOUT_FAILURE:'+size+':'+path);
      if(path===lead.path||path===italian.path) {
        if(!check.caption?.startsWith('Archival context:')||check.captionLinks.length<2) throw new Error('ARCHIVAL_CREDIT_LINK_FAILURE:'+path);
      }
      if(path==='/'||path==='/blog') {
        if(!check.aiLabels||!check.archiveLabels) throw new Error('MISSING_CARD_DISCLOSURE:'+path);
      }
      await page.evaluate(()=>scrollTo(0,0));
      const file=`${size}-${String(i).padStart(2,'0')}.png`;
      await page.screenshot({path:join(out,file),fullPage:true});
      if(path==='/') await page.screenshot({path:join(out,`${size}-home-top.png`),fullPage:false});
      results.push({size,path,status:response.status(),screenshot:file,...check});
    }
    await page.close();
  }
} finally {await browser.close();}
await writeFile(join(out,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),publicMetadataMatches:plan.length,results},null,2),{flag:'wx'});
console.log(JSON.stringify({ok:true,publicMetadataMatches:plan.length,pageViewportChecks:results.length,output:out},null,2));
