import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeLimit, readIntakeJson, verifyChallenge, assertSameOrigin } from '../lib/intake-security.ts';
import { normalizeIntake, stagePublicIntake, promotionStatement } from '../lib/public-intake.ts';
import { saveSubscriberPreferences } from '../lib/subscriber-preferences.ts';

process.env.INTAKE_HASH_SECRET = 'fixture-only-not-a-production-secret-123456789';
process.env.INTAKE_PUBLIC_ORIGIN = 'https://example.test';
process.env.TURNSTILE_SECRET_KEY = 'fixture-secret';
process.env.TURNSTILE_EXPECTED_HOSTNAMES = 'example.test';

const request = body => new Request('https://example.test/api/contact',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.test'},body:JSON.stringify(body)});
const valid = { name:'Reader',email:'reader@example.test',consent:true,message:'A local question',turnstileToken:'fixture-token' };

test('bounded streaming JSON rejects malformed, arrays and multi-byte oversized input', async () => {
  await assert.rejects(readIntakeJson(request([])),/Invalid JSON/);
  await assert.rejects(readIntakeJson(request({message:'😀'.repeat(5000)})),/too large/);
  await assert.rejects(readIntakeJson(new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json'},body:'{'})),/Invalid JSON/);
});

test('persistent counters share database state between instances and do not store raw identifiers', async () => {
  const counts = new Map();
  const sql = {query:async (query,params) => { assert.match(query,/ON CONFLICT/); assert.ok(!params[0].includes('reader')); const hits=(counts.get(params[0])||0)+1; counts.set(params[0],hits); return [{hits}]; }};
  await consumeLimit(sql,'fixture','reader@example.test',2);
  await consumeLimit({...sql},'fixture','reader@example.test',2);
  await assert.rejects(consumeLimit({...sql},'fixture','reader@example.test',2),/Too many/);
});

test('challenge requires correct action and allowed hostname and fails closed on outage', async () => {
  for (const response of [{success:false},{success:true,hostname:'evil.test',action:'intake-contact'},{success:true,hostname:'example.test',action:'intake-member'}]) {
    await assert.rejects(verifyChallenge('token','intake-contact',async()=>Response.json(response)),/expired or invalid/);
  }
  await assert.rejects(verifyChallenge('','intake-contact'),/Complete/);
  await assert.rejects(verifyChallenge('token','intake-contact',async()=>{throw Error('network');}),/temporarily unavailable/);
  await verifyChallenge('token','intake-contact',async()=>Response.json({success:true,hostname:'example.test',action:'intake-contact'}));
});

test('cross-origin and absent-origin writes rejected', () => {
  assert.throws(()=>assertSameOrigin(new Request('https://example.test',{headers:{Origin:'https://evil.test'}})),/origin/);
  assert.throws(()=>assertSameOrigin(new Request('https://example.test')),/origin/);
});

test('advertiser company is real data and forged routing/test authority is discarded', () => {
  const row=normalizeIntake('contact',{...valid,company:'Real Company',source:'codex-smoke',pipeline:'acquisition',is_test:true,inquiry_type:'advertising'});
  assert.equal(row.pipeline,'media'); assert.equal(row.payload.company,'Real Company');
  assert.equal(row.payload.source,'website:contact'); assert.equal(row.payload.is_test,undefined);
  assert.equal(row.consent.acquisition,false); assert.ok(row.consent.copy.text);
});

test('acquisition requires named entity and distinct explicit permission; subscriber stays media', () => {
  delete process.env.CREN_ACQUISITION_INTAKE_ENABLED;
  delete process.env.CREN_ACQUISITION_ENTITY_NAME;
  assert.throws(()=>normalizeIntake('lead',{...valid,persona:'fsbo_seller'}),/not available/);
  process.env.CREN_ACQUISITION_ENTITY_NAME='CREN';
  const requested={...valid,persona:'fsbo_seller',acquisitionConsent:true,acquisitionEntity:'CREN'};
  assert.throws(()=>normalizeIntake('lead',requested),/not available/,'a confirmed business name does not activate the funnel');
  process.env.CREN_ACQUISITION_INTAKE_ENABLED='true';
  assert.throws(()=>normalizeIntake('lead',{...valid,persona:'fsbo_seller',acquisitionConsent:true}),/not available/);
  const seller=normalizeIntake('lead',requested);
  assert.equal(seller.pipeline,'acquisition'); assert.equal(seller.consent.newsletter,false);
  assert.match(seller.consent.acquisitionCopy,/CREN's property-acquisition service/);
  assert.match(seller.consent.acquisitionCopy,/separate from CREN's independent newsroom/);
  assert.equal(normalizeIntake('subscribe',{...valid,pipeline:'acquisition',acquisitionConsent:true}).pipeline,'media');
  assert.throws(()=>normalizeIntake('lead',{...valid,persona:'capital_partner'}),/not currently available/);
  delete process.env.CREN_ACQUISITION_INTAKE_ENABLED;
});

test('unverified intake writes isolated ledger and one confirmation, never a legacy lead or notification', async () => {
  const calls=[];let sends=0;let staged=false;
  const sql={query:async(query,params)=>{calls.push(query);if(query.includes('intake_rate_limits'))return [{hits:1}];if(query.startsWith('SELECT email'))return [];if(query.includes('INSERT INTO public_intake')){if(staged)return [];staged=true;return [{id:params[0]}];}return [];}};
  const deps={verifyChallenge:async()=>{},sendEmail:async()=>{sends++;return {ok:true,id:'fixture-receipt'};}};
  assert.equal((await stagePublicIntake(request(valid),'contact',sql,deps)).pendingVerification,true);
  await stagePublicIntake(request(valid),'contact',sql,deps);
  assert.equal(sends,1);
  assert.equal(calls.some(query=>/INSERT INTO (leads|contacts|subscribers|members|inquiry_queue)/.test(query)),false);
});

test('honeypot and suppressed subscriber cannot trigger confirmation messages', async () => {
  let sends=0;const deps={verifyChallenge:async()=>{},sendEmail:async()=>{sends++;return {ok:true,id:'bad'};}};
  const sql={query:async query=>query.includes('intake_rate_limits')?[{hits:1}]:[{email:valid.email}]};
  await stagePublicIntake(request({...valid,website_url:'spam'}),'contact',sql,deps);
  await stagePublicIntake(request(valid),'subscribe',sql,deps);
  assert.equal(sends,0);
});

test('preferences never use supplied identity or reactivate subscriptions', async () => {
  await assert.rejects(saveSubscriberPreferences({query:async()=>[]},undefined,{email:valid.email}),/Confirm/);
  const sql={query:async(query,params)=>{if(query.startsWith('SELECT email'))return [{email:'verified@example.test'}];assert.equal(params[0],'verified@example.test');assert.ok(!query.includes("status='active',"));assert.match(query,/subscriber_suppressions/);return [{id:1}];}};
  await saveSubscriberPreferences(sql,'a'.repeat(64),{email:'victim@example.test',area:'Downtown'});
});

test('promotion statement locks token, checks expiry and status, consumes once, and preserves suppression', () => {
  for (const kind of ['lead','contact','subscribe','member']) {
    const query=promotionStatement(kind);
    assert.match(query,/FOR UPDATE/);assert.match(query,/status='PENDING' AND expires_at>NOW/);
    assert.match(query,/source_id=created.id::text/);assert.match(query,/payload=p.payload-'passwordHash'/);
  }
  assert.match(promotionStatement('subscribe'),/subscriber_suppressions/);
  assert.match(promotionStatement('member'),/ON CONFLICT \(email\) DO NOTHING/);
});
