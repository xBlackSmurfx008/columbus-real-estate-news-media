import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { agentOperationsSchema } from '../scripts/agent-operations-schema.mjs';
import { editorialEmailSchema } from '../scripts/editorial-email-schema.mjs';
import { cloudImportSchema } from '../scripts/cloud-draft-import.mjs';
import { ensureNewsroomRunTable } from '../scripts/newsroom-run-store.mjs';
import { enqueueAgentJob, claimAgentJob, completeAgentJob, failAgentJob, retryDelaySeconds } from '../src/agent/repositories/jobs.ts';
import { buildVerifiedCrmPayload, crmConfiguration, enqueueVerifiedIntakeCrm, processCrmOutbox, verifiedCrmReceipt } from '../lib/crm-sync.ts';
import { processScheduledOperationalReviews, getControlTowerSnapshot } from '../src/agent/workflows/control-tower.ts';

const verified = (overrides = {}) => ({ id: randomUUID(), kind: 'subscribe', pipeline: 'media', email: 'person@example.test',
  payload: { name: 'Reader' }, consent: { newsletter: true, version: '2026-09-22' }, status: 'VERIFIED', source_id: '1',
  verified_at: '2026-09-22T12:00:00Z', ...overrides });

test('CRM scope is derived from verified consent; newsletter never becomes a sales lead', () => {
  const payload = buildVerifiedCrmPayload(verified());
  assert.equal(payload.eventType, 'newsletter_subscriber');
  assert.equal(payload.lead, undefined);
  assert.equal(payload.metadata.pipeline, 'media');
  assert.throws(() => buildVerifiedCrmPayload(verified({ status: 'PENDING' })), /NOT_VERIFIED/);
  assert.throws(() => buildVerifiedCrmPayload(verified({ consent: { newsletter: false } })), /CONSENT_REQUIRED/);
  assert.throws(() => buildVerifiedCrmPayload(verified({ pipeline: 'acquisition' })), /CONSENT_REQUIRED/);
  assert.throws(() => buildVerifiedCrmPayload(verified({ kind: 'lead', pipeline: 'acquisition', consent: { inquiryResponse: true } })), /ACQUISITION_CONSENT_REQUIRED/);
  assert.equal(buildVerifiedCrmPayload(verified({ kind: 'lead', consent: { inquiryResponse: true },
    payload: { message: '', details: { location: 'Columbus', bedrooms: 3 } } })).lead.message, 'location: Columbus\nbedrooms: 3');
  assert.equal(buildVerifiedCrmPayload(verified({ kind: 'contact', consent: { inquiryResponse: true },
    payload: { sourceRoute: '/advertise', inquiryType: 'general' } })).lead.routeKey, 'development-desk');
});

test('CRM stays disabled without explicit enablement and accepts only the exact receiver URL', () => {
  assert.equal(crmConfiguration({ CRM_SYNC_SECRET: 'test' }).enabled, false);
  assert.equal(crmConfiguration({ CRM_SYNC_ENABLED: 'true', CRM_SYNC_SECRET: 'test' }).enabled, true);
  for (const url of ['http://crm.mradams.xyz/api/v1/inbound/cre-news', 'https://crm.mradams.xyz/api/v1/inbound/cre-news-evil',
    'https://evil.example/api/v1/inbound/cre-news', 'https://crm.mradams.xyz/api/v1/inbound/cre-news?redirect=x']) {
    assert.equal(crmConfiguration({ CRM_SYNC_ENABLED: 'true', CRM_SYNC_SECRET: 'test', CRM_SYNC_URL: url }).enabled, false);
  }
});

test('a success status is not a CRM receipt; matching event identity and contact receipt are required', () => {
  const payload = buildVerifiedCrmPayload(verified());
  assert.equal(verifiedCrmReceipt({ ok: true }, payload), null);
  assert.equal(verifiedCrmReceipt({ ok: true, externalId: 'wrong', contactId: 'c1' }, payload), null);
  assert.equal(verifiedCrmReceipt({ ok: true, externalId: payload.externalId, contactId: 'c1', dealId: 'sales' }, payload), null);
  assert.equal(verifiedCrmReceipt({ ok: true, externalId: payload.externalId, contactId: 'c1' }, payload)?.contactId, 'c1');
  assert.equal(verifiedCrmReceipt({ ok: true, externalId: payload.externalId, duplicate: true }, payload)?.duplicate, true);
  assert.equal(retryDelaySeconds(1), 30);
  assert.equal(retryDelaySeconds(20), 3600);
});

// Uses a fresh Unix-socket-only PostgreSQL cluster, never DATABASE_URL. Override
// CREN_TEST_POSTGRES_BIN for Linux/CI. No shared/home directory is removed.
const pgBin = process.env.CREN_TEST_POSTGRES_BIN ?? '/opt/homebrew/opt/postgresql@18/bin';
test('durable PostgreSQL queue/outbox: atomic dedupe, lease fencing, restart, receipts, retries and separation', {
  skip: !existsSync(join(pgBin, 'initdb')) ? 'Local PostgreSQL binaries unavailable; set CREN_TEST_POSTGRES_BIN for integration coverage.' : false,
}, async t => {
  const root = mkdtempSync(join(tmpdir(), 'cren-agent-db-'));
  const data = join(root, 'data');
  const run = (binary, args) => execFileSync(join(pgBin, binary), args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  run('initdb', ['-D', data, '-A', 'trust', '--no-locale', '-U', 'cren_test']);
  const start = () => run('pg_ctl', ['-D', data, '-l', join(root, 'postgres.log'), '-o', `-F -k ${root} -c listen_addresses='' -p 55433`, '-w', 'start']);
  const stop = () => run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
  start();
  t.after(() => { stop(); });
  const query = statement => run('psql', ['-h', root, '-p', '55433', '-U', 'cren_test', '-d', 'postgres', '-X', '-q', '--csv', '-v', 'ON_ERROR_STOP=1', '-c', statement]);
  function literal(value) {
    if (value == null) return 'NULL';
    if (Array.isArray(value)) return `ARRAY[${value.map(literal).join(',')}]`;
    if (typeof value === 'number') { assert.ok(Number.isFinite(value)); return String(value); }
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    return `'${String(value).replaceAll("'", "''")}'`;
  }
  function csv(text) {
    const rows = []; let row = [], value = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
      else if (c === ',' && !quoted) { row.push(value); value = ''; }
      else if (c === '\n' && !quoted) { row.push(value); rows.push(row); row = []; value = ''; }
      else value += c;
    }
    const header = rows.shift() ?? [];
    return rows.filter(row => row.length === header.length).map(row => Object.fromEntries(row.map((value, index) => {
      let parsed = value || null;
      if (value.startsWith('{') || value.startsWith('[')) parsed = JSON.parse(value);
      return [header[index], parsed];
    })));
  }
  const sql = async (strings, ...values) => {
    const statement = strings.reduce((result, part, index) => result + part + (index < values.length ? literal(values[index]) : ''), '');
    const { stdout } = await promisify(execFile)(join(pgBin, 'psql'), ['-h', root, '-p', '55433', '-U', 'cren_test', '-d', 'postgres', '-X', '-q', '--csv', '-v', 'ON_ERROR_STOP=1', '-c', statement]);
    return csv(stdout);
  };
  for (const statement of agentOperationsSchema) query(statement);
  query(`CREATE TABLE public_intake (id UUID PRIMARY KEY, kind TEXT, pipeline TEXT, email TEXT, payload JSONB,
    consent JSONB, status TEXT, source_id TEXT, verified_at TIMESTAMPTZ)`);
  query('CREATE TABLE subscriber_suppressions (email TEXT PRIMARY KEY)');
  query(`CREATE TABLE articles(id TEXT PRIMARY KEY,status TEXT,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE editorial_review_jobs(article_id TEXT PRIMARY KEY,status TEXT,updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE article_image_jobs(article_id TEXT PRIMARY KEY,status TEXT,started_at TIMESTAMPTZ,updated_at TIMESTAMPTZ DEFAULT NOW(),last_error_code TEXT)`);
  for (const statement of editorialEmailSchema) query(statement);
  for (const statement of cloudImportSchema) query(statement);
  await ensureNewsroomRunTable(sql);

  const input = { kind: 'test.restart', dedupeKey: 'restart-test', payload: { value: 1 }, maxAttempts: 2 };
  const original = await enqueueAgentJob(sql, input);
  assert.equal((await enqueueAgentJob(sql, input)).id, original.id);
  await assert.rejects(enqueueAgentJob(sql, { ...input, payload: { value: 2 } }), /PAYLOAD_CONFLICT/);
  const competing = await Promise.all([claimAgentJob(sql, { kinds: ['test.restart'] }), claimAgentJob(sql, { kinds: ['test.restart'] })]);
  assert.equal(competing.filter(Boolean).length, 1);
  const first = competing.find(Boolean);
  assert.equal(await claimAgentJob(sql, { kinds: ['test.restart'] }), null);
  await assert.rejects(completeAgentJob(sql, first.id, randomUUID(), {}), /LEASE_LOST/);
  await sql`UPDATE cren_agent_jobs SET lease_until = NOW() - INTERVAL '1 second' WHERE id = ${first.id}`;
  stop(); start();
  const recovered = await claimAgentJob(sql, { kinds: ['test.restart'] });
  assert.equal(recovered.id, first.id);
  assert.notEqual(recovered.lease_token, first.lease_token);
  await assert.rejects(completeAgentJob(sql, first.id, first.lease_token, {}), /LEASE_LOST/);
  await failAgentJob(sql, recovered.id, recovered.lease_token, 'CONTROLLED_FAILURE');
  assert.equal((await sql`SELECT status FROM cren_agent_jobs WHERE id = ${first.id}`)[0].status, 'DEAD_LETTER');
  assert.equal(await claimAgentJob(sql, { kinds: ['test.restart'] }), null);

  const addIntake = async row => sql`INSERT INTO public_intake VALUES (${row.id},${row.kind},${row.pipeline},${row.email},
    ${JSON.stringify(row.payload)}::jsonb,${JSON.stringify(row.consent)}::jsonb,${row.status},${row.source_id},${row.verified_at})`;
  const row = verified(); await addIntake(row);
  await enqueueVerifiedIntakeCrm(sql, { intakeId: row.id, pipeline: 'acquisition', email: 'attacker@example.test' });
  await enqueueVerifiedIntakeCrm(sql, { intakeId: row.id });
  assert.equal((await sql`SELECT COUNT(*) AS count FROM cren_crm_outbox`)[0].count, '1');
  const env = { CRM_SYNC_ENABLED: 'true', CRM_SYNC_SECRET: 'test-only' };
  let sends = 0;
  const fetcher = async (_url, options) => {
    sends++; const sent = JSON.parse(options.body);
    assert.equal(sent.contact.email, row.email); assert.equal(sent.metadata.pipeline, 'media');
    assert.equal(options.headers['Idempotency-Key'], `intake:${row.id}`);
    return Response.json({ ok: true, externalId: sent.externalId, contactId: 'c1' });
  };
  assert.equal((await processCrmOutbox(sql, { env, fetcher })).delivered, 1);
  assert.equal((await processCrmOutbox(sql, { env, fetcher })).delivered, 0);
  assert.equal(sends, 1);

  // A crash after the durable provider receipt but before job completion must not resend.
  const deliveredJob = (await sql`SELECT job_id FROM cren_crm_outbox WHERE intake_id = ${row.id}`)[0].job_id;
  await sql`UPDATE cren_agent_jobs SET status='RUNNING',lease_token=${randomUUID()},lease_until=NOW()-INTERVAL '1 second' WHERE id=${deliveredJob}`;
  await processCrmOutbox(sql, { env, fetcher });
  assert.equal(sends, 1);
  assert.equal((await sql`SELECT status FROM cren_agent_jobs WHERE id=${deliveredJob}`)[0].status, 'COMPLETED');

  const seller = verified({ kind: 'lead', pipeline: 'acquisition', consent: { inquiryResponse: true, acquisition: true } });
  await addIntake(seller); await enqueueVerifiedIntakeCrm(sql, { intakeId: seller.id });
  assert.equal((await processCrmOutbox(sql, { env, fetcher })).blocked, 1);
  assert.equal(sends, 1);

  const missingReceipt = verified(); await addIntake(missingReceipt);
  await enqueueVerifiedIntakeCrm(sql, { intakeId: missingReceipt.id });
  const result = await processCrmOutbox(sql, { env, fetcher: async () => Response.json({ ok: true }) });
  assert.equal(result.failed, 1);
  assert.equal((await sql`SELECT status FROM cren_crm_outbox WHERE intake_id = ${missingReceipt.id}`)[0].status, 'QUEUED');
  const failed = (await sql`SELECT j.status,j.last_error FROM cren_agent_jobs j JOIN cren_crm_outbox o ON o.job_id=j.id WHERE o.intake_id=${missingReceipt.id}`)[0];
  assert.equal(failed.status, 'RETRY'); assert.equal(failed.last_error, 'CRM_RECEIPT_INVALID');

  await sql`UPDATE cren_agent_jobs SET available_at=NOW() WHERE dedupe_key=${`intake:${missingReceipt.id}`}`;
  assert.equal((await processCrmOutbox(sql, { env, fetcher: async (_url, init) => Response.json({ ok: true, duplicate: true, externalId: JSON.parse(init.body).externalId }) })).delivered, 1);

  const revoked = verified(); await addIntake(revoked); await enqueueVerifiedIntakeCrm(sql, { intakeId: revoked.id });
  await sql`UPDATE public_intake SET consent='{"newsletter":false}'::jsonb WHERE id=${revoked.id}`;
  await processCrmOutbox(sql, { env, fetcher: async () => { assert.fail('Revoked consent must not send'); } });
  assert.equal((await sql`SELECT status FROM cren_agent_jobs WHERE dedupe_key=${`intake:${revoked.id}`}`)[0].status, 'DEAD_LETTER');

  const suppressed = verified({ email: 'suppressed@example.test' }); await addIntake(suppressed);
  await enqueueVerifiedIntakeCrm(sql, { intakeId: suppressed.id });
  await sql`INSERT INTO subscriber_suppressions VALUES (${suppressed.email})`;
  await processCrmOutbox(sql, { env, fetcher: async () => { assert.fail('Suppressed subscriber must not send'); } });
  assert.equal((await sql`SELECT last_error FROM cren_agent_jobs WHERE dedupe_key=${`intake:${suppressed.id}`}`)[0].last_error, 'NEWSLETTER_SUPPRESSED');

  const review = await enqueueAgentJob(sql, { kind: 'operations.scheduled_review', dedupeKey: 'weekly:2026-09-22', payload: { tasks: ['Prepare approved digest'], authority: 'REVIEW_ONLY' } });
  assert.equal((await getControlTowerSnapshot(sql)).newsroomHealth.ok, false);
  assert.equal((await processScheduledOperationalReviews(sql)).completed, 1);
  const report = (await sql`SELECT result FROM cren_agent_jobs WHERE id=${review.id}`)[0].result;
  assert.equal(report.reviewOnly, true); assert.equal(report.externalActionsTaken, false);
  assert.equal((await getControlTowerSnapshot(sql)).scheduledHeartbeatHealthy, false);
  assert.equal(report.newsroomHealth.ok, false);
  await sql`INSERT INTO cren_operations_heartbeats(id,trigger_kind,status,finished_at)
    VALUES (${randomUUID()},'scheduled','COMPLETED',NOW())`;
  await sql`INSERT INTO articles(id,status) VALUES ('image-held-fixture','draft')`;
  await sql`INSERT INTO article_image_jobs(article_id,status,last_error_code) VALUES ('image-held-fixture','BLOCKED','SOURCE_RIGHTS_REQUIRED')`;
  const oversight = await getControlTowerSnapshot(sql);
  assert.equal(oversight.scheduledHeartbeatHealthy, true);
  assert.equal(oversight.newsroomHealth.ok, false);
  assert.ok(oversight.newsroomHealth.reasons.includes('IMAGE_BLOCKED'));
});
