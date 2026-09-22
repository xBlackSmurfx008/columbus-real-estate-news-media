import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { statements } from '../scripts/migrate-intake-security.mjs';
import { promotionStatement, tokenHash } from '../lib/public-intake.ts';
import { saveSubscriberPreferences, suppressSubscriber, createPreferenceSession } from '../lib/subscriber-preferences.ts';

// Explicit opt-in; NEVER uses DATABASE_URL or any existing database/server.
// CREN_TEST_PG_BIN=/opt/homebrew/opt/postgresql@18/bin node --experimental-strip-types --test tests/intake-postgres.test.mjs
test('real isolated PostgreSQL: confirmation replay, suppression, preference ownership and member opt-in', {skip:!process.env.CREN_TEST_PG_BIN}, async () => {
  const bin=process.env.CREN_TEST_PG_BIN;
  const dir=mkdtempSync(join(tmpdir(),'cren-intake-test-'));
  const socket=createServer(); await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
  const port=socket.address().port; await new Promise(resolve=>socket.close(resolve));
  const args=['-X','-h','127.0.0.1','-p',String(port),'-U','cren_fixture','-d','postgres','-v','ON_ERROR_STOP=1','-q','-t','-A'];
  const command=(query)=>execFileSync(join(bin,'psql'),[...args,'-c',query],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const literal=value=>value===null?'NULL':`'${String(value).replaceAll("'","''")}'`;
  // psql emits each RETURNING row as JSON through COPY of a top-level SELECT wrapper.
  // Promotion is a data-changing WITH statement, so use psql CSV and a small quoted-cell decoder instead.
  const csv=(value)=>{
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<value.length;i++){const char=value[i];if(char==='"'){if(quoted&&value[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
      else if(char===','&&!quoted){row.push(cell);cell='';}else if(char==='\n'&&!quoted){row.push(cell);rows.push(row);row=[];cell='';}else cell+=char;}
    if(cell||row.length){row.push(cell);rows.push(row);}const [headers,...data]=rows;return data.map(row=>Object.fromEntries(headers.map((key,index)=>[key,row[index]])));
  };
  const sql={query:async(query,params=[])=>{
    const expanded=query.replace(/\$(\d+)/g,(_,n)=>literal(params[Number(n)-1]));
    const output=execFileSync(join(bin,'psql'),[...args.filter(x=>x!=='-t'&&x!=='-A'),'--csv','-c',expanded],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    return output?csv(output):[];
  }};
  let started=false;
  try {
    execFileSync(join(bin,'initdb'),['-D',dir,'-U','cren_fixture','-A','trust','--no-locale'],{stdio:'pipe'});
    execFileSync(join(bin,'pg_ctl'),['-D',dir,'-l',join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port} -k ${dir}`,'-w','start'],{stdio:'pipe'});started=true;
    command(`CREATE TABLE subscribers(id SERIAL PRIMARY KEY,email TEXT UNIQUE,area TEXT,topic TEXT,source TEXT,status TEXT,updated_at TIMESTAMPTZ,is_test BOOLEAN);
      CREATE TABLE contacts(id SERIAL PRIMARY KEY,name TEXT,email TEXT,message TEXT,source TEXT,status TEXT,is_test BOOLEAN);
      CREATE TABLE leads(id SERIAL PRIMARY KEY,persona TEXT,name TEXT,email TEXT,phone TEXT,area TEXT,details JSONB,source TEXT,status TEXT,consent BOOLEAN,is_test BOOLEAN);
      CREATE TABLE members(id SERIAL PRIMARY KEY,email TEXT UNIQUE,name TEXT,interests TEXT,password_hash TEXT,tier TEXT,status TEXT,is_test BOOLEAN);`);
    for(const statement of statements)command(statement);
    const pending=async(kind,email,payload={},consent={})=>{
      const token=randomUUID();const id=randomUUID();
      await sql.query(`INSERT INTO public_intake(id,kind,pipeline,email,payload,consent,dedupe_key,token_hash,expires_at)
        VALUES($1,$2,'media',$3,$4::jsonb,$5::jsonb,$1,$6,NOW()+interval '30 minutes')`,[id,kind,email,JSON.stringify(payload),JSON.stringify(consent),tokenHash(token)]);
      return tokenHash(token);
    };
    const hash=await pending('contact','reader@example.test',{name:'Reader',message:'Useful tip'});
    const [first]=await sql.query(promotionStatement('contact'),[hash,'contact']);
    assert.equal(first.status,'VERIFIED');assert.ok(first.source_id);
    assert.equal((await sql.query(promotionStatement('contact'),[hash,'contact'])).length,0);
    assert.equal(command('SELECT count(*) FROM contacts'),'1');
    const concurrent=await pending('contact','concurrent@example.test',{name:'Concurrent',message:'One inquiry'});
    const claim=promotionStatement('contact').replace(/\$1/g,literal(concurrent)).replace(/\$2/g,literal('contact'));
    await Promise.all([0,1,2,3].map(()=>promisify(execFile)(join(bin,'psql'),[...args,'-c',claim])));
    assert.equal(command("SELECT count(*) FROM contacts WHERE email='concurrent@example.test'"),'1');
    const subscriber=await pending('subscribe','subscriber@example.test',{area:'Dublin'},{newsletter:true});
    await sql.query(promotionStatement('subscribe'),[subscriber,'subscribe']);
    const cookie=await createPreferenceSession(sql,'subscriber@example.test');
    await saveSubscriberPreferences(sql,cookie,{email:'victim@example.test',area:'Gahanna'});
    assert.equal(command("SELECT area FROM subscribers WHERE email='subscriber@example.test'"),'Gahanna');
    await suppressSubscriber(sql,cookie);
    const resubscribe=await pending('subscribe','subscriber@example.test',{}, {newsletter:true});
    const [blocked]=await sql.query(promotionStatement('subscribe'),[resubscribe,'subscribe']);
    assert.equal(blocked.status,'QUARANTINED');
    assert.equal(command("SELECT status FROM subscribers WHERE email='subscriber@example.test'"),'unsubscribed');
    await assert.rejects(saveSubscriberPreferences(sql,cookie,{area:'Dublin'}),/inactive/);
    const access=await pending('preferences','subscriber@example.test');
    assert.equal((await sql.query(promotionStatement('preferences'),[access,'preferences']))[0].status,'VERIFIED');
    const member=await pending('member','member@example.test',{name:'Member',passwordHash:'fixture-hash',interests:'Events'},{newsletter:true});
    await sql.query(promotionStatement('member'),[member,'member']);
    assert.equal(command("SELECT count(*) FROM subscribers WHERE email='member@example.test'"),'1');
    assert.equal(command("SELECT payload ? 'passwordHash' FROM public_intake WHERE kind='member'"),'f');
    const duplicate=await pending('member','member@example.test',{name:'Attacker',passwordHash:'changed'},{newsletter:true});
    assert.equal((await sql.query(promotionStatement('member'),[duplicate,'member']))[0].status,'QUARANTINED');
    assert.equal(command("SELECT password_hash FROM members WHERE email='member@example.test'"),'fixture-hash');
    command("INSERT INTO subscribers(email,status) VALUES('Mixed@Example.test','active')");
    const mixed=await pending('subscribe','mixed@example.test',{}, {newsletter:true});
    assert.equal((await sql.query(promotionStatement('subscribe'),[mixed,'subscribe']))[0].status,'VERIFIED');
    assert.equal(command("SELECT count(*) FROM subscribers WHERE lower(email)='mixed@example.test'"),'1');
  } finally {
    if(started)execFileSync(join(bin,'pg_ctl'),['-D',dir,'-m','immediate','-w','stop'],{stdio:'pipe'});
    // Only this test's newly-created, unique temporary cluster is removed.
    rmSync(dir,{recursive:true,force:true});
  }
});
