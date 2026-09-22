import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { editorialEmailSchema } from '../scripts/editorial-email-schema.mjs';
import { classifyEditorialReply, editorialCandidateHash, sendEditorialReviewEmail, type EditorialCandidate, type EditorialSql } from '../lib/editorial-email-review.ts';
import { recordEditorialReply, applyEditorialReply, confirmMisclassifiedEditorialApproval } from '../lib/editorial-email-events.ts';
import { runEditorialCorrection, createEditorialRevisionAdapter, sweepEditorialProofs } from '../lib/editorial-correction-worker.ts';
import { publishEditorialCandidate } from '../lib/editorial-publication.ts';
import { publishVerifiedEditorialEmail } from '../lib/editorial-email-publication.ts';
import { stageReviewedImage } from '../scripts/stage-reviewed-image.mjs';
import { syncImageFingerprints } from '../scripts/sync-image-fingerprints.mjs';
import { loadNewsroomHealth } from '../scripts/newsroom-health-store.mjs';
// @ts-expect-error This local JavaScript maintenance helper has no TypeScript declaration.
import { assertLiveImageCleanupPreflight, commitLiveImageCleanup, verifyLiveImageCleanup } from '../scripts/live-image-cleanup-store.mjs';
import { IMAGE_POLICY_VERSION } from '../scripts/editorial-image-policy.mjs';
import { cloudImportSchema, prepareCloudDraft, runCloudImport, stageCloudDraft, type CloudDraftArtifact } from '../scripts/cloud-draft-import.mjs';
import { claimCloudImage, recordCloudImageHold } from '../scripts/cloud-image-jobs.mjs';
// @ts-expect-error This existing JavaScript schema helper has no TypeScript declaration.
import { ensureNewsroomRunTable } from '../scripts/newsroom-run-store.mjs';

const database = process.env.CREN_TEST_DATABASE_URL;
const exec = promisify(execFile);
// Explicit local-only guard: never inherit DATABASE_URL or point tests at a real site.
if (database) {
  const target = new URL(database);
  if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !target.pathname.startsWith('/cren_editorial_test')) throw new Error('ISOLATED_LOCAL_TEST_DATABASE_REQUIRED');
}
function parseCsv(value: string) {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '"') { if (quoted && value[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if (c === '\n' && !quoted) { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  const headers = rows.shift() ?? [];
  return rows.map((cells) => Object.fromEntries(headers.map((key, i) => {
    const item = cells[i] ?? '';
    let parsed: unknown = item;
    if (item.startsWith('{') || item.startsWith('[')) { try { parsed = JSON.parse(item); } catch { /* literal */ } }
    return [key, parsed];
  })));
}
async function query(statement: string) {
  const { stdout } = await exec('psql', [database!, '-X', '-q', '--csv', '-v', 'ON_ERROR_STOP=1', '-c', statement], { maxBuffer: 5_000_000 });
  return parseCsv(stdout);
}
function renderSql(strings: TemplateStringsArray, values: unknown[]) {
  return strings.reduce((result, item, i) => result + item + (i < values.length
    ? values[i] == null ? 'NULL' : `'${String(values[i] instanceof Date ? values[i].toISOString() : values[i]).replaceAll("'", "''")}'` : ''), '');
}
const sql: EditorialSql = async (strings, ...values) => query(renderSql(strings, values));

test('PostgreSQL editorial lifecycle, replay, concurrency and publication gates', { skip: !database }, async (t) => {
  await query(`CREATE TABLE IF NOT EXISTS articles(id TEXT PRIMARY KEY, status TEXT DEFAULT 'draft', title TEXT, excerpt TEXT, body TEXT,
    author TEXT, date TEXT, category TEXT, read_time TEXT, area_slug TEXT, topic_slug TEXT, tags JSONB, image_url TEXT,
    image_alt TEXT, image_caption TEXT, meta_description TEXT, fact_checked_at TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS editorial_review_jobs(article_id TEXT PRIMARY KEY REFERENCES articles(id), status TEXT, submission JSONB,
      machine_report JSONB, machine_score INTEGER, machine_possible INTEGER, human_score INTEGER, human_scores JSONB,
      human_decision TEXT, reviewer TEXT, reviewed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS article_image_jobs(article_id TEXT PRIMARY KEY, status TEXT, model TEXT, source_sha256 TEXT,
      image_url TEXT, completed_at TIMESTAMPTZ, last_error_code TEXT, updated_at TIMESTAMPTZ DEFAULT NOW(),
      cloud_lease_token UUID, prompt TEXT, attempts INTEGER NOT NULL DEFAULT 0, started_at TIMESTAMPTZ);
    CREATE TABLE IF NOT EXISTS article_image_fingerprints(article_id TEXT PRIMARY KEY, image_url TEXT, sha256 TEXT UNIQUE, perceptual_hash TEXT, verified_at TIMESTAMPTZ);`);
  for (const statement of editorialEmailSchema) await query(statement);
  await query('TRUNCATE articles, editorial_review_jobs, editorial_email_reviews, editorial_email_events, editorial_email_event_actions, editorial_correction_jobs, article_image_jobs, article_image_fingerprints CASCADE');
  const fixture = JSON.parse(await readFile(new URL('../content/articles/2026-09-16-columbus-east-side-permanently-affordable-condos-community-land-trust.json', import.meta.url), 'utf8'));
  let candidate: EditorialCandidate = { ...fixture, id: 'editorial-local-fixture', image_url: 'https://fixture.public.blob.vercel-storage.com/hero.webp', image_sha256: 'a'.repeat(64), image_caption: 'Test illustration.' };
  await sql`INSERT INTO articles(id, title, excerpt, body) VALUES (${candidate.id}, ${candidate.title}, ${candidate.excerpt}, ${candidate.body})`;
  await sql`INSERT INTO editorial_review_jobs(article_id, status, submission) VALUES (${candidate.id}, 'READY_FOR_REVIEW', ${JSON.stringify(candidate)}::jsonb)`;
  process.env.CREN_EDITOR_REVIEW_EMAIL = 'owner@example.test';
  process.env.CREN_EDITOR_REVIEW_DOMAIN = 'review.example.test';
  const load = async () => structuredClone(candidate);
  const receipts: string[] = [];
  const send = async (_message: unknown, key: string) => { receipts.push(key); return { ok: true, id: `provider-${key}` }; };
  let token = '';
  await t.test('nonexistent article filter returns no proofs and never invokes delivery', async () => {
    // A real ready draft exists, so an ignored filter would try to send it.
    let deliveryCalls = 0;
    const proofs = await sweepEditorialProofs(sql, {
      send: true, articleId: 'nonexistent-editorial-proof-article',
      deliver: async () => { deliveryCalls++; throw new Error('FILTER_MUST_PREVENT_DELIVERY'); },
    });
    assert.deepEqual(proofs, []);
    assert.equal(deliveryCalls, 0);
    assert.equal((await sql`SELECT * FROM editorial_email_reviews`).length, 0);
  });
  await t.test('concurrent proof reservations share one version and provider idempotency key', async () => {
    const results = await Promise.allSettled([sendEditorialReviewEmail(sql, candidate.id, { load, send }), sendEditorialReviewEmail(sql, candidate.id, { load, send })]);
    assert.ok(results.some((r) => r.status === 'fulfilled'));
    const proofs = await sql`SELECT * FROM editorial_email_reviews`;
    assert.equal(proofs.length, 1); token = String(proofs[0].review_token);
    assert.equal(new Set(receipts).size, 1);
    assert.deepEqual(proofs[0].proposed_human_scores, {});
  });
  const receive = (emailId: string, text: string, time: string) => recordEditorialReply(sql, {
    token, emailId, webhookId: `svix-${emailId}`, from: 'owner@example.test', text, receivedAt: time,
  });
  await t.test('spoofed unexpected sender cannot create an event; expected sender does not autoapprove', async () => {
    await recordEditorialReply(sql, { token, emailId: 'spoof', webhookId: 'svix-spoof', from: 'attacker@example.test', text: 'APPROVE', receivedAt: '2026-09-22T10:00:00Z' });
    assert.equal((await sql`SELECT * FROM editorial_email_events WHERE email_id = 'spoof'`).length, 0);
    await receive('approve-v1', 'APPROVE', '2026-09-22T10:00:00Z');
    assert.equal((await sql`SELECT status FROM editorial_email_reviews`)[0].status, 'AWAITING_REPLY');
    await assert.rejects(applyEditorialReply(sql, 'approve-v1', 'owner@example.test', false, load), /AUTHENTICATED/);
    assert.equal((await applyEditorialReply(sql, 'approve-v1', 'owner@example.test', true, load)).accepted, true);
  });
  await t.test('late edits revoke approval and replay creates only one durable job', async () => {
    const crashAfterReceipt: EditorialSql = async (strings, ...values) => {
      if (strings.join('').includes('SELECT * FROM editorial_email_events WHERE email_id')) throw new Error('SIMULATED_WORKER_CRASH');
      return sql(strings, ...values);
    };
    await assert.rejects(recordEditorialReply(crashAfterReceipt, {
      token, emailId: 'edit-v1', webhookId: 'svix-edit-v1', from: 'owner@example.test',
      text: 'Use the revised headline.', receivedAt: '2026-09-22T10:01:00Z',
    }), /SIMULATED_WORKER_CRASH/);
    assert.equal((await sql`SELECT status FROM editorial_email_reviews`)[0].status, 'CHANGES_REQUESTED');
    assert.equal((await sql`SELECT * FROM editorial_correction_jobs`).length, 0);
    const events = await Promise.all([receive('edit-v1', 'Use the revised headline.', '2026-09-22T10:01:00Z'), receive('edit-v1', 'Use the revised headline.', '2026-09-22T10:01:00Z')]);
    assert.ok(events.some((r) => r.accepted));
    assert.equal((await sql`SELECT status FROM editorial_email_reviews`)[0].status, 'CHANGES_REQUESTED');
    assert.equal((await sql`SELECT * FROM editorial_correction_jobs`).length, 1);
    await receive('approve-after-edit', 'APPROVE', '2026-09-22T10:02:00Z');
    assert.equal((await applyEditorialReply(sql, 'approve-after-edit', 'owner@example.test', true, load)).accepted, false);
    await receive('out-of-order', 'APPROVE', '2026-09-22T09:59:00Z');
    assert.equal((await applyEditorialReply(sql, 'out-of-order', 'owner@example.test', true, load)).accepted, false);
    await receive('older-edit-delivered-late', 'Keep the byline unchanged.', '2026-09-22T10:00:30Z');
    assert.equal((await sql`SELECT * FROM editorial_email_event_actions WHERE email_id = 'older-edit-delivered-late'`).length, 1);
    assert.equal((await sql`SELECT * FROM editorial_correction_jobs`).length, 2);
  });
  await t.test('nonexistent job filter leaves all queued jobs and attempts untouched', async () => {
    const before = await sql`SELECT id, status, attempts, lease_token, lease_until, updated_at FROM editorial_correction_jobs ORDER BY id`;
    assert.equal(before.length, 2);
    assert.ok(before.every((job) => job.status === 'QUEUED' && Number(job.attempts) === 0));
    let revisionCalls = 0;
    let loadCalls = 0;
    const result = await runEditorialCorrection(sql, {
      jobId: '999999999',
      revise: async () => { revisionCalls++; throw new Error('FILTER_MUST_PREVENT_REVISION'); },
      load: async () => { loadCalls++; throw new Error('FILTER_MUST_PREVENT_LOADING'); },
    });
    assert.deepEqual(result, { processed: false });
    assert.equal(revisionCalls, 0);
    assert.equal(loadCalls, 0);
    assert.deepEqual(await sql`SELECT id, status, attempts, lease_token, lease_until, updated_at FROM editorial_correction_jobs ORDER BY id`, before);
  });
  await t.test('real provider adapter contract produces a gated revision, diff and durable proof handoff', async () => {
    const revised = { ...candidate, title: 'Columbus Breaks Ground on Affordable East Side Condos' };
    const revise = createEditorialRevisionAdapter({ apiKey: 'local-test-key', model: 'fixture/model', fetchImpl: async (_url, init) => {
      assert.equal(JSON.parse(String(init?.body)).messages.length, 2);
      return Response.json({ choices: [{ message: { content: JSON.stringify({ status: 'REVISED', candidate: revised, explanation: 'Headline edit only.' }) } }] });
    } });
    const stale = await runEditorialCorrection(sql, { revise, load });
    assert.equal(stale.status, 'STALE');
    const result = await runEditorialCorrection(sql, { revise, load });
    assert.equal(result.status, 'READY_FOR_PROOF', JSON.stringify(result));
    const [job] = await sql`SELECT * FROM editorial_correction_jobs ORDER BY id DESC LIMIT 1`;
    assert.ok(Array.isArray(job.diff));
    candidate = job.result as EditorialCandidate;
    const before = receipts.length;
    await sweepEditorialProofs(sql, { send: false });
    assert.equal(receipts.length, before);
    const proof = await sweepEditorialProofs(sql, { send: true, deliver: (db, id) => sendEditorialReviewEmail(db, id, { load, send }) });
    assert.equal(proof[0].acceptedByProvider, true);
    assert.equal((await sql`SELECT status FROM editorial_correction_jobs ORDER BY id DESC LIMIT 1`)[0].status, 'COMPLETED');
    assert.equal((await sql`SELECT status FROM editorial_email_reviews WHERE version = 1`)[0].status, 'SUPERSEDED');
  });
  await t.test('superseded replies and changed evidence cannot approve publication', async () => {
    await receive('old-proof-reply', 'APPROVE', '2026-09-22T10:04:00Z');
    assert.equal((await applyEditorialReply(sql, 'old-proof-reply', 'owner@example.test', true, load)).accepted, false);
    token = String((await sql`SELECT review_token FROM editorial_email_reviews WHERE version = 2`)[0].review_token);
    await receive('approve-v2', 'APPROVE', '2026-09-22T10:05:00Z');
    const modified = async () => ({ ...candidate, claim_ledger: [] });
    assert.equal((await applyEditorialReply(sql, 'approve-v2', 'owner@example.test', true, modified)).accepted, false);
    assert.equal((await applyEditorialReply(sql, 'approve-v2', 'owner@example.test', true, async () => ({ ...candidate, image_sha256: 'changed-bytes' }))).accepted, false);
    assert.equal((await applyEditorialReply(sql, 'approve-v2', 'owner@example.test', true, load)).accepted, true);
  });
  await t.test('atomic publication rejects changed staged evidence then commits all exact gates together', async () => {
    await sql`UPDATE articles SET updated_at = '2026-09-21T20:59:12.461257Z'::timestamptz WHERE id = ${candidate.id}`;
    const [article] = await sql`SELECT updated_at::text AS updated_at FROM articles WHERE id = ${candidate.id}`;
    const input = { id: candidate.id, version: 2, hash: editorialCandidateHash(candidate), updatedAt: article.updated_at,
      stagedSubmission: candidate, candidate, reviewer: 'Independent test reviewer', humanScores: { B1: 2, B2: 1, B3: 1, B4: 2, B5: 2, B6: 2, B7: 2, B8: 2, B9: 2, B10: 2 }, humanTotal: 18,
      machineReport: { score: 18, possible: 18 }, image: { sha256: String(candidate.image_sha256), perceptualHash: '1'.repeat(16) } };
    await assert.rejects(publishEditorialCandidate(sql, { ...input, humanScores: {} }), /ASSESSMENT_REQUIRED/);
    assert.equal((await publishEditorialCandidate(sql, { ...input, updatedAt: new Date(String(article.updated_at)) })).length, 0);
    assert.equal((await publishEditorialCandidate(sql, { ...input, stagedSubmission: { changed: true } })).length, 0);
    const published = await publishEditorialCandidate(sql, input);
    assert.equal(published.length, 1);
    assert.equal(published[0].status, 'live');
    assert.equal((await sql`SELECT status FROM editorial_email_reviews WHERE version = 2`)[0].status, 'PUBLISHED');
    assert.equal((await sql`SELECT status FROM editorial_review_jobs`)[0].status, 'APPROVED');
    assert.equal((await publishEditorialCandidate(sql, input)).length, 0);
  });
  await t.test('exhausted crashed lease becomes BLOCKED instead of RUNNING forever', async () => {
    await sql`UPDATE editorial_correction_jobs SET status = 'RUNNING', attempts = 3, lease_until = NOW() - INTERVAL '1 hour'`;
    const result = await runEditorialCorrection(sql, { revise: async () => { throw new Error('MUST_NOT_CALL'); }, load });
    assert.equal(result.processed, false);
    const [job] = await sql`SELECT status, error_code FROM editorial_correction_jobs`;
    assert.equal(job.status, 'BLOCKED'); assert.equal(job.error_code, 'ATTEMPTS_EXHAUSTED');
  });
  await t.test('reply received during ambiguous SENDING is applied, never stranded', async () => {
    const id = 'sending-receipt-crash';
    const draft = { ...candidate, id };
    await sql`INSERT INTO articles(id) VALUES (${id})`;
    await sql`INSERT INTO editorial_email_reviews(article_id, version, review_token, status, recipient_email, reply_address, candidate_hash, candidate, proposed_human_scores)
      VALUES (${id}, 1, ${'c'.repeat(36)}, 'SENDING', 'owner@example.test', 'fixture@example.test', ${editorialCandidateHash(draft)}, ${JSON.stringify(draft)}::jsonb, '{}'::jsonb)`;
    const result = await recordEditorialReply(sql, { token: 'c'.repeat(36), emailId: 'sending-edit', webhookId: 'svix-sending-edit',
      from: 'owner@example.test', text: 'Please fix the headline.', receivedAt: '2026-09-22T12:00:00Z' });
    assert.equal(result.accepted, true);
    assert.equal((await sql`SELECT status FROM editorial_email_reviews WHERE article_id = ${id}`)[0].status, 'CHANGES_REQUESTED');
    assert.equal((await sql`SELECT status FROM editorial_correction_jobs WHERE article_id = ${id}`)[0].status, 'QUEUED');
  });
  await t.test('late correction after staged revision blocks the sweep rather than silently omitting it', async () => {
    const id = 'late-edit-after-staging';
    const base = { ...candidate, id };
    await sql`INSERT INTO articles(id) VALUES (${id})`;
    await sql`INSERT INTO editorial_review_jobs(article_id, status, submission) VALUES (${id}, 'READY_FOR_REVIEW', ${JSON.stringify(base)}::jsonb)`;
    await sql`INSERT INTO editorial_email_reviews(article_id, version, review_token, status, recipient_email, reply_address, candidate_hash, candidate, proposed_human_scores)
      VALUES (${id}, 1, ${'d'.repeat(36)}, 'AWAITING_REPLY', 'owner@example.test', 'fixture@example.test', ${editorialCandidateHash(base)}, ${JSON.stringify(base)}::jsonb, '{}'::jsonb)`;
    await recordEditorialReply(sql, { token: 'd'.repeat(36), emailId: 'late-edit', webhookId: 'svix-late-edit',
      from: 'owner@example.test', text: 'Another edit after staging.', receivedAt: '2026-09-22T12:01:00Z' });
    // Only claim this scenario; the earlier ambiguous-send scenario remains queued.
    await sql`UPDATE editorial_correction_jobs SET status = 'STALE' WHERE article_id <> ${id} AND status = 'QUEUED'`;
    const result = await runEditorialCorrection(sql, { load: async () => ({ ...base, title: 'A previously staged revised headline' }),
      revise: async () => { throw new Error('MUST_NOT_CALL_PROVIDER'); } });
    assert.equal(result.status, 'BLOCKED'); assert.equal(result.error, 'DRAFT_CHANGED_REQUIRES_REBASE');
    const proofs = await sweepEditorialProofs(sql, { send: false });
    assert.equal(proofs.some((proof) => proof.articleId === id), false);
  });
  await t.test('microsecond draft timestamp survives production-like Date decoding during correction CAS', async () => {
    const id = 'microsecond-editorial-worker';
    const base = { ...candidate, id };
    const timestamp = '2026-09-21T20:59:12.461257Z';
    await sql`INSERT INTO articles(id, title, excerpt, body, updated_at)
      VALUES (${id}, ${base.title}, ${base.excerpt}, ${base.body}, ${timestamp}::timestamptz)`;
    await sql`INSERT INTO editorial_review_jobs(article_id, status, submission)
      VALUES (${id}, 'READY_FOR_REVIEW', ${JSON.stringify(base)}::jsonb)`;
    await sql`INSERT INTO editorial_email_reviews(article_id, version, review_token, status, recipient_email, reply_address, candidate_hash, candidate, proposed_human_scores)
      VALUES (${id}, 1, ${'e'.repeat(36)}, 'AWAITING_REPLY', 'owner@example.test', 'fixture@example.test', ${editorialCandidateHash(base)}, ${JSON.stringify(base)}::jsonb, '{}'::jsonb)`;
    await recordEditorialReply(sql, { token: 'e'.repeat(36), emailId: 'microsecond-edit', webhookId: 'svix-microsecond-edit',
      from: 'owner@example.test', text: 'Revise the headline.', receivedAt: '2026-09-22T13:00:00Z' });
    const [job] = await sql`SELECT id FROM editorial_correction_jobs WHERE article_id = ${id}`;
    // Reproduce the production mismatch independently: Date truncates .461257 to .461.
    assert.equal((await sql`SELECT id FROM articles WHERE id = ${id} AND updated_at = ${new Date(timestamp)}`).length, 0);
    assert.equal((await sql`SELECT id FROM articles WHERE id = ${id} AND updated_at = ${timestamp}`).length, 1);
    const observedTypes: string[] = [];
    const productionLikeSql: EditorialSql = async (strings, ...values) => {
      const statement = renderSql(strings, values);
      const rows = await query(statement);
      if (/^\s*SELECT\b/i.test(statement) && /\bAS article_updated_at\b/i.test(statement) && rows.length) {
        // Ask PostgreSQL for the actual selected type instead of assuming the
        // implementation casts. Neon decodes timestamptz, but not text, to Date.
        const [description] = await query(`SELECT pg_typeof(article_updated_at)::text AS selected_type FROM (${statement}) AS source`);
        observedTypes.push(String(description.selected_type));
        if (description.selected_type === 'timestamp with time zone') {
          return rows.map((row) => ({ ...row, article_updated_at: new Date(String(row.article_updated_at)) }));
        }
      }
      return rows;
    };
    const revised = { ...base, title: 'Columbus Starts Construction on Affordable East Side Condos' };
    const result = await runEditorialCorrection(productionLikeSql, {
      jobId: String(job.id), load: async () => structuredClone(base),
      revise: async () => ({ status: 'REVISED', candidate: revised, explanation: 'Headline edit.' }),
    });
    assert.equal(result.status, 'READY_FOR_PROOF', JSON.stringify(result));
    assert.deepEqual(observedTypes, ['text']);
    assert.equal((await sql`SELECT title FROM articles WHERE id = ${id}`)[0].title, revised.title);
    assert.equal((await sql`SELECT status FROM editorial_correction_jobs WHERE id = ${job.id}`)[0].status, 'READY_FOR_PROOF');
  });

  // These represent historical receipts from the old parser. Do not call the
  // current receipt function: it correctly recognizes this contact-only footer.
  let recoverySequence = 0;
  const recoveryReply = 'APPROVE\n\nBest,\nAlex Example\nCEO\nowner@example.test';
  async function seedMisclassifiedReply(options: { reply?: string; recipient?: string } = {}) {
    recoverySequence++;
    const id = `legacy-approval-recovery-${recoverySequence}`;
    const emailId = `legacy-approval-email-${recoverySequence}`;
    const recoveryCandidate: EditorialCandidate = { ...candidate, id,
      image_url: `https://fixture.public.blob.vercel-storage.com/${id}.webp`,
      image_sha256: createHash('sha256').update(`pixels:${id}`).digest('hex') };
    const hash = editorialCandidateHash(recoveryCandidate);
    const reply = options.reply ?? recoveryReply;
    const reviewToken = `recovery-token-${recoverySequence}`;
    await sql`INSERT INTO articles(id, title, excerpt, body)
      VALUES (${id}, ${recoveryCandidate.title}, ${recoveryCandidate.excerpt}, ${recoveryCandidate.body})`;
    await sql`INSERT INTO editorial_review_jobs(article_id, status, submission)
      VALUES (${id}, 'READY_FOR_REVIEW', ${JSON.stringify(recoveryCandidate)}::jsonb)`;
    await sql`INSERT INTO editorial_email_reviews(article_id, version, review_token, status, recipient_email, reply_address, candidate_hash, candidate, proposed_human_scores)
      VALUES (${id}, 1, ${reviewToken}, 'CHANGES_REQUESTED', ${options.recipient ?? 'owner@example.test'},
        'fixture@example.test', ${hash}, ${JSON.stringify(recoveryCandidate)}::jsonb, '{}'::jsonb)`;
    await sql`INSERT INTO editorial_email_events(email_id, webhook_id, article_id, version, sender, reply_text, decision, received_at)
      VALUES (${emailId}, ${`svix-${emailId}`}, ${id}, 1, 'owner@example.test', ${reply}, 'CHANGES_REQUESTED', '2026-09-22T15:00:00Z')`;
    await sql`INSERT INTO editorial_email_event_actions(email_id, action, actor)
      VALUES (${emailId}, 'CHANGES_REQUESTED', 'untrusted-email-draft-only')`;
    await sql`INSERT INTO editorial_correction_jobs(email_id, article_id, version, base_hash)
      VALUES (${emailId}, ${id}, 1, ${hash})`;
    return { id, emailId, hash, candidate: recoveryCandidate, load: async () => structuredClone(recoveryCandidate) };
  }
  async function assertRecoveryUnchanged(fixture: Awaited<ReturnType<typeof seedMisclassifiedReply>>) {
    assert.equal((await sql`SELECT status FROM editorial_email_reviews WHERE article_id = ${fixture.id}`)[0].status, 'CHANGES_REQUESTED');
    assert.equal((await sql`SELECT * FROM editorial_email_owner_confirmations WHERE email_id = ${fixture.emailId}`).length, 0);
    assert.equal((await sql`SELECT decision FROM editorial_email_events WHERE email_id = ${fixture.emailId}`)[0].decision, 'CHANGES_REQUESTED');
    assert.equal((await sql`SELECT action FROM editorial_email_event_actions WHERE email_id = ${fixture.emailId}`)[0].action, 'CHANGES_REQUESTED');
  }
  function recoveryPublicationInput(fixture: Awaited<ReturnType<typeof seedMisclassifiedReply>>, updatedAt: unknown) {
    return { id: fixture.id, version: 1, hash: fixture.hash, updatedAt, stagedSubmission: fixture.candidate, candidate: fixture.candidate,
      reviewer: 'Independent recovery test reviewer', humanScores: { B1: 2, B2: 1, B3: 1, B4: 2, B5: 2, B6: 2, B7: 2, B8: 2, B9: 2, B10: 2 }, humanTotal: 18,
      machineReport: { score: 18, possible: 18 }, image: { sha256: String(fixture.candidate.image_sha256), perceptualHash: '2'.repeat(16) } };
  }
  await t.test('misclassified approval recovery requires authenticated matching owner and an actual approval reply', async () => {
    assert.equal(classifyEditorialReply(recoveryReply).decision, 'APPROVED');
    const fixture = await seedMisclassifiedReply();
    await assert.rejects(confirmMisclassifiedEditorialApproval(sql, fixture.emailId, 'owner@example.test', false, fixture.load), /AUTHENTICATED/);
    await assert.rejects(confirmMisclassifiedEditorialApproval(sql, fixture.emailId, 'attacker@example.test', true, fixture.load), /AUTHENTICATED/);
    await assertRecoveryUnchanged(fixture);
    const realEdit = await seedMisclassifiedReply({ reply: 'APPROVE, but replace the headline first.' });
    try {
      const result = await confirmMisclassifiedEditorialApproval(sql, realEdit.emailId, 'owner@example.test', true, realEdit.load);
      assert.equal(result.accepted, false);
    } catch (error) {
      assert.ok(error instanceof Error && /APPROVAL|RECLASSIF|DECISION/.test(error.message), String(error));
    }
    await assertRecoveryUnchanged(realEdit);
  });
  await t.test('misclassified approval recovery rejects started, already-result-bearing and wrong-base correction jobs', async () => {
    for (const condition of ['started', 'attempted', 'result', 'base-hash', 'lease-token']) {
      const fixture = await seedMisclassifiedReply();
      if (condition === 'started') await sql`UPDATE editorial_correction_jobs SET status = 'RUNNING', attempts = 1 WHERE email_id = ${fixture.emailId}`;
      if (condition === 'attempted') await sql`UPDATE editorial_correction_jobs SET attempts = 1 WHERE email_id = ${fixture.emailId}`;
      if (condition === 'result') await sql`UPDATE editorial_correction_jobs SET result = '{}'::jsonb WHERE email_id = ${fixture.emailId}`;
      if (condition === 'base-hash') await sql`UPDATE editorial_correction_jobs SET base_hash = 'changed' WHERE email_id = ${fixture.emailId}`;
      if (condition === 'lease-token') await sql`UPDATE editorial_correction_jobs SET lease_token = 'existing-worker-lease' WHERE email_id = ${fixture.emailId}`;
      const before = await sql`SELECT * FROM editorial_correction_jobs WHERE email_id = ${fixture.emailId}`;
      const result = await confirmMisclassifiedEditorialApproval(sql, fixture.emailId, 'owner@example.test', true, fixture.load);
      assert.equal(result.accepted, false, condition);
      await assertRecoveryUnchanged(fixture);
      assert.deepEqual(await sql`SELECT * FROM editorial_correction_jobs WHERE email_id = ${fixture.emailId}`, before);
    }
  });
  await t.test('misclassified approval recovery rejects later events, additional older edits and superseded proofs', async () => {
    for (const condition of ['later-edit', 'later-approval', 'older-edit', 'new-version']) {
      const fixture = await seedMisclassifiedReply();
      if (condition === 'new-version') {
        await sql`INSERT INTO editorial_email_reviews(article_id, version, review_token, status, recipient_email, reply_address, candidate_hash, candidate)
          VALUES (${fixture.id}, 2, ${`next-${fixture.id}`}, 'AWAITING_REPLY', 'owner@example.test', 'fixture@example.test', ${fixture.hash}, ${JSON.stringify(fixture.candidate)}::jsonb)`;
      } else {
        await sql`INSERT INTO editorial_email_events(email_id, webhook_id, article_id, version, sender, reply_text, decision, received_at)
          VALUES (${`extra-${fixture.emailId}`}, ${`svix-extra-${fixture.emailId}`}, ${fixture.id}, 1, 'owner@example.test',
            ${condition === 'later-approval' ? 'APPROVE' : 'Change this sentence.'}, ${condition === 'later-approval' ? 'APPROVED' : 'CHANGES_REQUESTED'},
            ${condition === 'older-edit' ? '2026-09-22T14:59:00Z' : '2026-09-22T15:01:00Z'}::timestamptz)`;
      }
      const result = await confirmMisclassifiedEditorialApproval(sql, fixture.emailId, 'owner@example.test', true, fixture.load);
      assert.equal(result.accepted, false, condition);
      assert.equal((await sql`SELECT * FROM editorial_email_owner_confirmations WHERE email_id = ${fixture.emailId}`).length, 0);
      assert.equal((await sql`SELECT status FROM editorial_correction_jobs WHERE email_id = ${fixture.emailId}`)[0].status, 'QUEUED');
    }
  });
  await t.test('misclassified approval recovery rejects changed artifact and mismatched proof recipient', async () => {
    const fixture = await seedMisclassifiedReply();
    const result = await confirmMisclassifiedEditorialApproval(sql, fixture.emailId, 'owner@example.test', true,
      async () => ({ ...fixture.candidate, image_sha256: 'f'.repeat(64) }));
    assert.equal(result.accepted, false);
    await assertRecoveryUnchanged(fixture);
    const wrongRecipient = await seedMisclassifiedReply({ recipient: 'different-owner@example.test' });
    assert.equal((await confirmMisclassifiedEditorialApproval(sql, wrongRecipient.emailId, 'owner@example.test', true, wrongRecipient.load)).accepted, false);
    await assertRecoveryUnchanged(wrongRecipient);
  });
  await t.test('owner recovery rejects a draft edit during asynchronous candidate loading without retiring its job', async () => {
    const fixture = await seedMisclassifiedReply();
    const jobs = await sql`SELECT * FROM editorial_correction_jobs WHERE email_id = ${fixture.emailId}`;
    let loadCalls = 0;
    const result = await confirmMisclassifiedEditorialApproval(sql, fixture.emailId, 'owner@example.test', true, async () => {
      loadCalls++;
      // Return the old exact proof after a concurrent write, reproducing the
      // window between hash loading/image retrieval and the approval commit.
      await sql`UPDATE articles SET body = 'A newer unreviewed body.', updated_at = updated_at + INTERVAL '1 microsecond'
        WHERE id = ${fixture.id}`;
      return structuredClone(fixture.candidate);
    });
    assert.equal(loadCalls, 1); assert.equal(result.accepted, false);
    await assertRecoveryUnchanged(fixture);
    assert.deepEqual(await sql`SELECT * FROM editorial_correction_jobs WHERE email_id = ${fixture.emailId}`, jobs);
    assert.equal((await sql`SELECT body FROM articles WHERE id = ${fixture.id}`)[0].body, 'A newer unreviewed body.');
  });
  await t.test('owner recovery rejects a staged-evidence change during loading even when article timestamp is unchanged', async () => {
    const fixture = await seedMisclassifiedReply();
    const jobs = await sql`SELECT * FROM editorial_correction_jobs WHERE email_id = ${fixture.emailId}`;
    const [before] = await sql`SELECT updated_at::text AS updated_at FROM articles WHERE id = ${fixture.id}`;
    const changedSubmission = { ...fixture.candidate, claim_ledger: [] };
    const result = await confirmMisclassifiedEditorialApproval(sql, fixture.emailId, 'owner@example.test', true, async () => {
      await sql`UPDATE editorial_review_jobs SET submission = ${JSON.stringify(changedSubmission)}::jsonb WHERE article_id = ${fixture.id}`;
      return structuredClone(fixture.candidate);
    });
    assert.equal(result.accepted, false);
    await assertRecoveryUnchanged(fixture);
    assert.deepEqual(await sql`SELECT * FROM editorial_correction_jobs WHERE email_id = ${fixture.emailId}`, jobs);
    assert.equal((await sql`SELECT updated_at::text AS updated_at FROM articles WHERE id = ${fixture.id}`)[0].updated_at, before.updated_at);
    assert.deepEqual((await sql`SELECT submission FROM editorial_review_jobs WHERE article_id = ${fixture.id}`)[0].submission, changedSubmission);
  });
  await t.test('owner recovery retains PostgreSQL microsecond timestamp identity under production-like Date decoding', async () => {
    const fixture = await seedMisclassifiedReply();
    const timestamp = '2026-09-21T20:59:12.461257Z';
    await sql`UPDATE articles SET updated_at = ${timestamp}::timestamptz WHERE id = ${fixture.id}`;
    const selectedTypes: string[] = [];
    const productionLikeSql: EditorialSql = async (strings, ...values) => {
      const statement = renderSql(strings, values);
      const rows = await query(statement);
      if (/^\s*SELECT\b/i.test(statement) && /\bAS article_updated_at\b/i.test(statement) && rows.length) {
        const [description] = await query(`SELECT pg_typeof(article_updated_at)::text AS selected_type FROM (${statement}) AS source`);
        selectedTypes.push(String(description.selected_type));
        if (description.selected_type === 'timestamp with time zone') {
          return rows.map((row) => ({ ...row, article_updated_at: new Date(String(row.article_updated_at)) }));
        }
      }
      return rows;
    };
    assert.equal((await sql`SELECT id FROM articles WHERE id = ${fixture.id} AND updated_at = ${new Date(timestamp)}`).length, 0);
    const result = await confirmMisclassifiedEditorialApproval(productionLikeSql, fixture.emailId, 'owner@example.test', true, fixture.load);
    assert.equal(result.accepted, true);
    assert.deepEqual(selectedTypes, ['text']);
    const [job] = await sql`SELECT status, attempts FROM editorial_correction_jobs WHERE email_id = ${fixture.emailId}`;
    assert.equal(job.status, 'STALE'); assert.equal(Number(job.attempts), 0);
  });
  await t.test('misclassified approval recovery requires the original edit action and changes-requested proof state', async () => {
    const noAction = await seedMisclassifiedReply();
    await sql`DELETE FROM editorial_email_event_actions WHERE email_id = ${noAction.emailId}`;
    assert.equal((await confirmMisclassifiedEditorialApproval(sql, noAction.emailId, 'owner@example.test', true, noAction.load)).accepted, false);
    assert.equal((await sql`SELECT * FROM editorial_email_owner_confirmations WHERE email_id = ${noAction.emailId}`).length, 0);
    const wrongState = await seedMisclassifiedReply();
    await sql`UPDATE editorial_email_reviews SET status = 'AWAITING_REPLY' WHERE article_id = ${wrongState.id}`;
    assert.equal((await confirmMisclassifiedEditorialApproval(sql, wrongState.emailId, 'owner@example.test', true, wrongState.load)).accepted, false);
    assert.equal((await sql`SELECT * FROM editorial_email_owner_confirmations WHERE email_id = ${wrongState.emailId}`).length, 0);
  });
  await t.test('owner-confirmed recovery preserves immutable audit, stops only its unstarted job, and replay cannot reapprove', async () => {
    const fixture = await seedMisclassifiedReply();
    const originalEvents = await sql`SELECT * FROM editorial_email_events WHERE email_id = ${fixture.emailId}`;
    const originalActions = await sql`SELECT * FROM editorial_email_event_actions WHERE email_id = ${fixture.emailId}`;
    const unrelatedJobs = await sql`SELECT * FROM editorial_correction_jobs WHERE email_id <> ${fixture.emailId} ORDER BY id`;
    const result = await confirmMisclassifiedEditorialApproval(sql, fixture.emailId, 'owner@example.test', true, fixture.load);
    assert.equal(result.accepted, true);
    const [proof] = await sql`SELECT * FROM editorial_email_reviews WHERE article_id = ${fixture.id}`;
    assert.equal(proof.status, 'APPROVED'); assert.equal(proof.reviewer, 'owner@example.test');
    assert.deepEqual(await sql`SELECT * FROM editorial_email_events WHERE email_id = ${fixture.emailId}`, originalEvents);
    assert.deepEqual(await sql`SELECT * FROM editorial_email_event_actions WHERE email_id = ${fixture.emailId}`, originalActions);
    assert.deepEqual(await sql`SELECT * FROM editorial_correction_jobs WHERE email_id <> ${fixture.emailId} ORDER BY id`, unrelatedJobs);
    const [job] = await sql`SELECT * FROM editorial_correction_jobs WHERE email_id = ${fixture.emailId}`;
    assert.equal(job.status, 'STALE'); assert.equal(Number(job.attempts), 0); assert.equal(job.result, '');
    assert.equal(job.error_code, 'OWNER_CONFIRMED_APPROVAL_RECLASSIFICATION');
    const [confirmation] = await sql`SELECT * FROM editorial_email_owner_confirmations WHERE email_id = ${fixture.emailId}`;
    assert.equal(confirmation.article_id, fixture.id); assert.equal(Number(confirmation.version), 1);
    assert.equal(confirmation.candidate_hash, fixture.hash); assert.equal(confirmation.actor, 'owner@example.test');
    assert.ok(confirmation.reason); assert.ok(confirmation.created_at);
    const replay = await confirmMisclassifiedEditorialApproval(sql, fixture.emailId, 'owner@example.test', true, fixture.load);
    assert.equal(replay.accepted, false);
    assert.deepEqual(await sql`SELECT * FROM editorial_email_owner_confirmations WHERE email_id = ${fixture.emailId}`, [confirmation]);
  });
  await t.test('publication accepts exact owner-confirmed recovery but rejects reviewer/hash mismatch and unrelated edits', async () => {
    const fixture = await seedMisclassifiedReply();
    await confirmMisclassifiedEditorialApproval(sql, fixture.emailId, 'owner@example.test', true, fixture.load);
    const [article] = await sql`SELECT updated_at::text AS updated_at FROM articles WHERE id = ${fixture.id}`;
    const input = recoveryPublicationInput(fixture, article.updated_at);
    await sql`UPDATE editorial_email_owner_confirmations SET candidate_hash = 'wrong-proof-hash' WHERE email_id = ${fixture.emailId}`;
    assert.equal((await publishEditorialCandidate(sql, input)).length, 0);
    await sql`UPDATE editorial_email_owner_confirmations SET candidate_hash = ${fixture.hash}, actor = 'different-owner@example.test' WHERE email_id = ${fixture.emailId}`;
    assert.equal((await publishEditorialCandidate(sql, input)).length, 0);
    await sql`UPDATE editorial_email_owner_confirmations SET actor = 'owner@example.test' WHERE email_id = ${fixture.emailId}`;
    assert.equal((await publishEditorialCandidate(sql, input)).length, 1);
    assert.equal((await sql`SELECT status FROM articles WHERE id = ${fixture.id}`)[0].status, 'live');
    const additional = await seedMisclassifiedReply();
    await confirmMisclassifiedEditorialApproval(sql, additional.emailId, 'owner@example.test', true, additional.load);
    // Seed a distinct historical correction directly while keeping proof APPROVED
    // to test the publication guard itself, not receipt-time status revocation.
    await sql`INSERT INTO editorial_email_events(email_id, webhook_id, article_id, version, sender, reply_text, decision, received_at)
      VALUES (${`real-edit-${additional.emailId}`}, ${`svix-real-edit-${additional.emailId}`}, ${additional.id}, 1, 'owner@example.test',
        'Please correct the unit count.', 'CHANGES_REQUESTED', '2026-09-22T15:02:00Z')`;
    const [unpublished] = await sql`SELECT updated_at::text AS updated_at FROM articles WHERE id = ${additional.id}`;
    assert.equal((await publishEditorialCandidate(sql, recoveryPublicationInput(additional, unpublished.updated_at))).length, 0);
    assert.equal((await sql`SELECT status FROM articles WHERE id = ${additional.id}`)[0].status, 'draft');
  });
  await t.test('concurrent owner recovery appends one confirmation and never claims the correction job', async () => {
    const fixture = await seedMisclassifiedReply();
    const results = await Promise.all([
      confirmMisclassifiedEditorialApproval(sql, fixture.emailId, 'owner@example.test', true, fixture.load),
      confirmMisclassifiedEditorialApproval(sql, fixture.emailId, 'owner@example.test', true, fixture.load),
    ]);
    assert.equal(results.filter((result) => result.accepted).length, 1);
    assert.equal((await sql`SELECT * FROM editorial_email_owner_confirmations WHERE email_id = ${fixture.emailId}`).length, 1);
    const [job] = await sql`SELECT status, attempts, lease_token FROM editorial_correction_jobs WHERE email_id = ${fixture.emailId}`;
    assert.equal(job.status, 'STALE'); assert.equal(Number(job.attempts), 0); assert.equal(job.lease_token, '');
  });
  await t.test('proof timestamp CAS rejects a same-status correction committed while recovery waits on the proof lock', async () => {
    const fixture = await seedMisclassifiedReply();
    const originalJob = await sql`SELECT * FROM editorial_correction_jobs WHERE email_id = ${fixture.emailId}`;
    const holder = spawn('psql', [database!, '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = ''; let errors = ''; let closed = false;
    holder.stdout.on('data', (chunk) => { output += String(chunk); });
    holder.stderr.on('data', (chunk) => { errors += String(chunk); });
    holder.on('error', (error) => { errors += error.message; });
    const finished = new Promise<void>((resolve) => holder.on('close', () => { closed = true; resolve(); }));
    async function waitFor(label: string, predicate: () => Promise<boolean> | boolean) {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if (await predicate()) return;
        if (closed || errors) throw new Error(`${label}: holder stopped: ${errors}`);
        await delay(25);
      }
      throw new Error(`${label}: bounded synchronization deadline exceeded`);
    }
    let recovery: ReturnType<typeof confirmMisclassifiedEditorialApproval> | undefined;
    try {
      holder.stdin.write(`SET idle_in_transaction_session_timeout = '10s'; BEGIN;
        SELECT article_id FROM editorial_email_reviews WHERE article_id = '${fixture.id}' AND version = 1 FOR UPDATE;
        SELECT 'PROOF_LOCK_HELD';\n`);
      await waitFor('proof lock acquisition', () => output.includes('PROOF_LOCK_HELD'));
      const waitingSql: EditorialSql = async (strings, ...values) => {
        const statement = renderSql(strings, values);
        if (/^\s*WITH proof AS MATERIALIZED/i.test(statement)) {
          return query(`SET application_name = 'cren_owner_recovery_phantom'; SET statement_timeout = '10s'; ${statement}`);
        }
        return query(statement);
      };
      recovery = confirmMisclassifiedEditorialApproval(waitingSql, fixture.emailId, 'owner@example.test', true, fixture.load);
      // The rejection handler prevents an unhandled promise if synchronization
      // itself fails. The awaited original promise still surfaces that failure.
      void recovery.catch(() => {});
      await waitFor('recovery waiting on proof lock', async () => {
        const [waiting] = await query(`SELECT count(*) AS count FROM pg_stat_activity
          WHERE application_name = 'cren_owner_recovery_phantom' AND state = 'active' AND wait_event_type = 'Lock'`);
        return Number(waiting.count) === 1;
      });
      // Recovery's SQL snapshot already exists. This second receipt is invisible
      // to that snapshot after the lock wait, and status stays CHANGES_REQUESTED.
      // The updated_at CAS must therefore catch the newly locked proof version.
      holder.stdin.write(`INSERT INTO editorial_email_events(email_id, webhook_id, article_id, version, sender, reply_text, decision, received_at)
        VALUES ('lock-wait-${fixture.emailId}', 'svix-lock-wait-${fixture.emailId}', '${fixture.id}', 1,
          'owner@example.test', 'Please correct the location.', 'CHANGES_REQUESTED', '2026-09-22T15:03:00Z');
        UPDATE editorial_email_reviews SET status = 'CHANGES_REQUESTED', approved_at = NULL, reviewer = NULL,
          updated_at = updated_at + INTERVAL '1 microsecond' WHERE article_id = '${fixture.id}' AND version = 1;
        COMMIT; SELECT 'SECOND_RECEIPT_COMMITTED';\n`);
      await waitFor('second receipt commit', () => output.includes('SECOND_RECEIPT_COMMITTED'));
      const result = await recovery;
      assert.equal(result.accepted, false);
      await assertRecoveryUnchanged(fixture);
      assert.deepEqual(await sql`SELECT * FROM editorial_correction_jobs WHERE email_id = ${fixture.emailId}`, originalJob);
      assert.equal((await sql`SELECT * FROM editorial_email_events WHERE email_id = ${`lock-wait-${fixture.emailId}`}`).length, 1);
    } finally {
      if (!closed) holder.stdin.end('ROLLBACK;\n\\q\n');
      const stopTimer = setTimeout(() => { if (!closed) holder.kill('SIGKILL'); }, 2000);
      await finished; clearTimeout(stopTimer);
      if (recovery) await recovery.catch(() => {});
    }
  });

  // Email-only publication is a separate, explicit owner policy. The legacy
  // signed-in recovery/publication tests above remain as historical contracts.
  let emailPublicationSequence = 0;
  async function seedEmailPublication(legacy = false) {
    emailPublicationSequence++;
    const id = `email-only-publication-${emailPublicationSequence}`;
    const emailId = `email-only-receipt-${emailPublicationSequence}`;
    const reviewToken = `email-only-token-${emailPublicationSequence}`;
    const sha256 = createHash('sha256').update(`pixels:${id}`).digest('hex');
    const perceptualHash = createHash('sha256').update(`perceptual:${id}`).digest('hex').slice(0, 16);
    const artifact: EditorialCandidate = { ...candidate, id, image_url: `https://fixture.public.blob.vercel-storage.com/${id}.webp`, image_sha256: sha256 };
    const hash = editorialCandidateHash(artifact);
    const text = legacy ? recoveryReply : 'APPROVE THIS VERSION';
    const receivedAt = '2026-09-22T17:00:00.123456Z';
    await sql`INSERT INTO articles(id, status, title, excerpt, body, author, category, image_url)
      VALUES (${id}, 'draft', ${artifact.title}, ${artifact.excerpt}, ${artifact.body}, ${artifact.author}, ${artifact.category}, ${artifact.image_url})`;
    await sql`INSERT INTO editorial_review_jobs(article_id, status, submission)
      VALUES (${id}, 'READY_FOR_REVIEW', ${JSON.stringify(artifact)}::jsonb)`;
    await sql`INSERT INTO article_image_jobs(article_id, status) VALUES (${id}, 'READY_FOR_REVIEW')`;
    await sql`INSERT INTO editorial_email_reviews(article_id, version, review_token, status, recipient_email, reply_address, candidate_hash, candidate)
      VALUES (${id}, 1, ${reviewToken}, ${legacy ? 'CHANGES_REQUESTED' : 'AWAITING_REPLY'}, 'owner@example.test',
        'fixture@example.test', ${hash}, ${JSON.stringify(artifact)}::jsonb)`;
    await sql`INSERT INTO editorial_email_events(email_id, webhook_id, article_id, version, sender, reply_text, decision, received_at)
      VALUES (${emailId}, ${`svix-${emailId}`}, ${id}, 1, 'owner@example.test', ${text},
        ${legacy ? 'CHANGES_REQUESTED' : 'APPROVED'}, ${receivedAt}::timestamptz)`;
    if (legacy) {
      await sql`INSERT INTO editorial_email_event_actions(email_id, action, actor)
        VALUES (${emailId}, 'CHANGES_REQUESTED', 'untrusted-email-draft-only')`;
      await sql`INSERT INTO editorial_correction_jobs(email_id, article_id, version, base_hash)
        VALUES (${emailId}, ${id}, 1, ${hash})`;
    }
    const verified: Parameters<typeof publishVerifiedEditorialEmail>[2] = { token: reviewToken, sender: 'owner@example.test', text, receivedAt,
      authentication: { source: 'resend-receiving-api', spf: 'pass', dkim: 'pass', dmarc: 'pass' } };
    return { id, emailId, token: reviewToken, artifact, hash, verified, sha256, perceptualHash,
      load: async () => structuredClone(artifact), fingerprint: async () => ({ sha256, perceptualHash }) };
  }
  async function emailPublicationState(fixture: Awaited<ReturnType<typeof seedEmailPublication>>) {
    return {
      articles: await sql`SELECT * FROM articles WHERE id = ${fixture.id}`,
      reviews: await sql`SELECT * FROM editorial_review_jobs WHERE article_id = ${fixture.id}`,
      proofs: await sql`SELECT * FROM editorial_email_reviews WHERE article_id = ${fixture.id}`,
      events: await sql`SELECT * FROM editorial_email_events WHERE article_id = ${fixture.id} ORDER BY email_id`,
      actions: await sql`SELECT ac.* FROM editorial_email_event_actions ac JOIN editorial_email_events ev ON ev.email_id = ac.email_id WHERE ev.article_id = ${fixture.id} ORDER BY ac.email_id`,
      jobs: await sql`SELECT * FROM editorial_correction_jobs WHERE article_id = ${fixture.id} ORDER BY id`,
      publications: await sql`SELECT * FROM editorial_email_publications WHERE article_id = ${fixture.id}`,
      images: await sql`SELECT * FROM article_image_jobs WHERE article_id = ${fixture.id}`,
      fingerprints: await sql`SELECT * FROM article_image_fingerprints WHERE article_id = ${fixture.id}`,
    };
  }
  async function assertEmailPublicationBlocked(operation: () => ReturnType<typeof publishVerifiedEditorialEmail>, reason: RegExp) {
    await assert.rejects(operation, (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /^[A-Z][A-Z0-9_]+$/);
      assert.match(error.message, reason);
      return true;
    });
  }
  await t.test('verified email publication dry-run is genuinely read-only and needs no fabricated scorecard or owner session', async () => {
    const fixture = await seedEmailPublication();
    const before = await emailPublicationState(fixture);
    const result = await publishVerifiedEditorialEmail(sql, fixture.emailId, fixture.verified,
      { apply: false, load: fixture.load, fingerprint: fixture.fingerprint });
    assert.equal(result.published, false); assert.equal(result.dryRun, true);
    const forwarded = await publishVerifiedEditorialEmail(sql, fixture.emailId,
      { ...fixture.verified, authentication: { ...fixture.verified.authentication, spf: 'fail' } },
      { apply: false, load: fixture.load, fingerprint: fixture.fingerprint });
    assert.equal(forwarded.published, false); assert.equal(forwarded.dryRun, true);
    assert.deepEqual(await emailPublicationState(fixture), before);
    assert.equal(before.reviews[0].human_scores, ''); assert.equal(before.actions.length, 0);
  });
  await t.test('authenticated approval email publishes exact artifact atomically without extra login or numeric human scores', async () => {
    const fixture = await seedEmailPublication();
    const before = await emailPublicationState(fixture);
    const result = await publishVerifiedEditorialEmail(sql, fixture.emailId, fixture.verified,
      { apply: true, load: fixture.load, fingerprint: fixture.fingerprint });
    assert.equal(result.published, true);
    const after = await emailPublicationState(fixture);
    assert.equal(after.articles[0].status, 'live'); assert.equal(after.articles[0].body, fixture.artifact.body);
    assert.equal(after.proofs[0].status, 'PUBLISHED'); assert.equal(after.images[0].status, 'PUBLISHED');
    assert.equal(after.reviews[0].human_scores, ''); assert.equal(after.reviews[0].human_score, '');
    assert.equal(after.reviews[0].human_decision, 'APPROVED'); assert.equal(after.reviews[0].reviewer, 'owner@example.test');
    assert.deepEqual(after.events, before.events); assert.deepEqual(after.actions, before.actions);
    assert.equal(after.publications.length, 1); assert.equal(after.publications[0].email_id, fixture.emailId);
    assert.equal(after.publications[0].candidate_hash, fixture.hash); assert.equal(after.publications[0].sender, 'owner@example.test');
    assert.deepEqual(after.publications[0].authentication, fixture.verified.authentication);
    assert.ok(after.publications[0].policy_version); assert.ok(after.publications[0].published_at);
    assert.equal(after.fingerprints[0].sha256, fixture.sha256);
    const replay = await publishVerifiedEditorialEmail(sql, fixture.emailId, fixture.verified,
      { apply: true, load: fixture.load, fingerprint: fixture.fingerprint });
    assert.equal(replay.published, false); assert.equal(replay.alreadyPublished, true);
    assert.deepEqual(await emailPublicationState(fixture), after);
  });
  await t.test('email publication rejects failed authentication and mismatched sender, token, body or received timestamp without writes', async () => {
    const fixture = await seedEmailPublication(); const before = await emailPublicationState(fixture);
    const invalid = [
      { ...fixture.verified, authentication: { ...fixture.verified.authentication, source: 'untrusted-headers' } },
      ...['dkim', 'dmarc'].map((key) => ({ ...fixture.verified, authentication: { ...fixture.verified.authentication, [key]: 'fail' } })),
      { ...fixture.verified, sender: 'attacker@example.test' },
      { ...fixture.verified, token: 'wrong-proof-token' },
      { ...fixture.verified, text: 'APPROVE but change the headline first.' },
      { ...fixture.verified, receivedAt: '2026-09-22T18:00:00Z' },
    ];
    for (const verified of invalid) {
      await assertEmailPublicationBlocked(() => publishVerifiedEditorialEmail(sql, fixture.emailId, verified as Parameters<typeof publishVerifiedEditorialEmail>[2],
        { apply: true, load: fixture.load, fingerprint: fixture.fingerprint }), /AUTH|OWNER|SENDER|TOKEN|PROOF|APPROVAL|EVENT|EMAIL|RECEIPT/);
      assert.deepEqual(await emailPublicationState(fixture), before);
    }
  });
  await t.test('email publication rejects changed proof evidence and fresh image bytes that differ from the proof', async () => {
    const fixture = await seedEmailPublication(); const before = await emailPublicationState(fixture);
    await assertEmailPublicationBlocked(() => publishVerifiedEditorialEmail(sql, fixture.emailId, fixture.verified,
      { apply: true, load: async () => ({ ...fixture.artifact, claim_ledger: [] }), fingerprint: fixture.fingerprint }), /HASH|CANDIDATE|ARTIFACT|STALE|CHANGED|GATE|EVIDENCE/);
    await assertEmailPublicationBlocked(() => publishVerifiedEditorialEmail(sql, fixture.emailId, fixture.verified,
      { apply: true, load: fixture.load, fingerprint: async () => ({ sha256: '0'.repeat(64), perceptualHash: fixture.perceptualHash }) }), /IMAGE|FINGERPRINT|HASH|ARTIFACT|CHANGED/);
    assert.deepEqual(await emailPublicationState(fixture), before);
  });
  await t.test('later edits and superseded proofs block email-only publication', async () => {
    for (const condition of ['later-edit', 'new-proof']) {
      const fixture = await seedEmailPublication();
      if (condition === 'later-edit') {
        await sql`INSERT INTO editorial_email_events(email_id, webhook_id, article_id, version, sender, reply_text, decision, received_at)
          VALUES (${`later-${fixture.emailId}`}, ${`svix-later-${fixture.emailId}`}, ${fixture.id}, 1, 'owner@example.test',
            'Please correct the unit count.', 'CHANGES_REQUESTED', '2026-09-22T17:01:00Z')`;
      } else {
        await sql`INSERT INTO editorial_email_reviews(article_id, version, review_token, status, recipient_email, reply_address, candidate_hash, candidate)
          VALUES (${fixture.id}, 2, ${`new-${fixture.token}`}, 'AWAITING_REPLY', 'owner@example.test',
            'fixture@example.test', ${fixture.hash}, ${JSON.stringify(fixture.artifact)}::jsonb)`;
      }
      const before = await emailPublicationState(fixture);
      await assertEmailPublicationBlocked(() => publishVerifiedEditorialEmail(sql, fixture.emailId, fixture.verified,
        { apply: true, load: fixture.load, fingerprint: fixture.fingerprint }), /EDIT|CHANGE|STALE|PROOF|VERSION|ELIGIB|APPROVAL/);
      assert.deepEqual(await emailPublicationState(fixture), before);
    }
  });
  await t.test('legacy false-edit approval publishes only with its untouched correction job and preserves raw audit', async () => {
    const fixture = await seedEmailPublication(true); const before = await emailPublicationState(fixture);
    const result = await publishVerifiedEditorialEmail(sql, fixture.emailId, fixture.verified,
      { apply: true, load: fixture.load, fingerprint: fixture.fingerprint });
    assert.equal(result.published, true);
    const after = await emailPublicationState(fixture);
    assert.deepEqual(after.events, before.events); assert.deepEqual(after.actions, before.actions);
    assert.equal(after.jobs[0].status, 'STALE'); assert.equal(after.jobs[0].error_code, 'EMAIL_APPROVAL_RECLASSIFIED');
    assert.equal(Number(after.jobs[0].attempts), 0); assert.equal(after.jobs[0].result, '');
    assert.equal(after.reviews[0].human_score, ''); assert.equal(after.reviews[0].human_scores, '');
  });
  await t.test('legacy email-only approval cannot retire started, leased, result-bearing or unrelated correction work', async () => {
    for (const condition of ['started', 'attempted', 'leased', 'result', 'other-job']) {
      const fixture = await seedEmailPublication(true);
      if (condition === 'started') await sql`UPDATE editorial_correction_jobs SET status = 'RUNNING', attempts = 1 WHERE email_id = ${fixture.emailId}`;
      if (condition === 'attempted') await sql`UPDATE editorial_correction_jobs SET attempts = 1 WHERE email_id = ${fixture.emailId}`;
      if (condition === 'leased') await sql`UPDATE editorial_correction_jobs SET lease_token = 'another-worker' WHERE email_id = ${fixture.emailId}`;
      if (condition === 'result') await sql`UPDATE editorial_correction_jobs SET result = '{}'::jsonb WHERE email_id = ${fixture.emailId}`;
      if (condition === 'other-job') {
        await sql`INSERT INTO editorial_email_events(email_id, webhook_id, article_id, version, sender, reply_text, decision, received_at)
          VALUES (${`other-${fixture.emailId}`}, ${`svix-other-${fixture.emailId}`}, ${fixture.id}, 1, 'owner@example.test',
            'Please fix the excerpt.', 'CHANGES_REQUESTED', '2026-09-22T16:59:00Z')`;
        await sql`INSERT INTO editorial_correction_jobs(email_id, article_id, version, base_hash)
          VALUES (${`other-${fixture.emailId}`}, ${fixture.id}, 1, ${fixture.hash})`;
      }
      const before = await emailPublicationState(fixture);
      await assertEmailPublicationBlocked(() => publishVerifiedEditorialEmail(sql, fixture.emailId, fixture.verified,
        { apply: true, load: fixture.load, fingerprint: fixture.fingerprint }), /JOB|EDIT|CHANGE|STALE|ELIGIB|APPROVAL/);
      assert.deepEqual(await emailPublicationState(fixture), before);
    }
  });
  await t.test('email-only publication rejects exact and near-duplicate hero images', async () => {
    for (const exact of [true, false]) {
      const fixture = await seedEmailPublication();
      await sql`INSERT INTO article_image_fingerprints(article_id, image_url, sha256, perceptual_hash, verified_at)
        VALUES (${`other-image-${fixture.id}`}, 'https://fixture.public.blob.vercel-storage.com/existing.webp',
          ${exact ? fixture.sha256 : createHash('sha256').update(`other:${fixture.id}`).digest('hex')}, ${fixture.perceptualHash}, NOW())`;
      const before = await emailPublicationState(fixture);
      await assertEmailPublicationBlocked(() => publishVerifiedEditorialEmail(sql, fixture.emailId, fixture.verified,
        { apply: true, load: fixture.load, fingerprint: fixture.fingerprint }), /IMAGE|DUPLICATE|FINGERPRINT/);
      assert.deepEqual(await emailPublicationState(fixture), before);
    }
  });
  await t.test('simultaneous authenticated approval deliveries publish only once without modifying original events', async () => {
    const fixture = await seedEmailPublication();
    const before = await sql`SELECT * FROM editorial_email_events WHERE email_id = ${fixture.emailId}`;
    const results = await Promise.all([
      publishVerifiedEditorialEmail(sql, fixture.emailId, fixture.verified, { apply: true, load: fixture.load, fingerprint: fixture.fingerprint }),
      publishVerifiedEditorialEmail(sql, fixture.emailId, fixture.verified, { apply: true, load: fixture.load, fingerprint: fixture.fingerprint }),
    ]);
    assert.equal(results.filter((result) => result.published).length, 1);
    assert.equal((await sql`SELECT * FROM editorial_email_publications WHERE email_id = ${fixture.emailId}`).length, 1);
    assert.deepEqual(await sql`SELECT * FROM editorial_email_events WHERE email_id = ${fixture.emailId}`, before);
  });
  async function raceDistinctEmailPublications(nearDuplicate: boolean) {
    const fixtures = [await seedEmailPublication(), await seedEmailPublication()];
    if (nearDuplicate) {
      // Different URLs and bytes evade SHA/URL uniqueness. Only the visual check
      // and the generation fence can reject this cross-article race.
      fixtures[1].fingerprint = async () => ({ sha256: fixtures[1].sha256, perceptualHash: fixtures[0].perceptualHash });
    }
    assert.notEqual(fixtures[0].sha256, fixtures[1].sha256);
    assert.notEqual(fixtures[0].artifact.image_url, fixtures[1].artifact.image_url);
    const [initialFence] = await sql`SELECT generation FROM editorial_publication_fence WHERE id = 1`;
    const holder = spawn('psql', [database!, '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = ''; let errors = ''; let closed = false;
    holder.stdout.on('data', (chunk) => { output += String(chunk); });
    holder.stderr.on('data', (chunk) => { errors += String(chunk); });
    holder.on('error', (error) => { errors += error.message; });
    const finished = new Promise<void>((resolve) => holder.on('close', () => { closed = true; resolve(); }));
    async function waitFor(label: string, predicate: () => Promise<boolean> | boolean) {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if (await predicate()) return;
        if (closed || errors) throw new Error(`${label}: holder stopped: ${errors}`);
        await delay(25);
      }
      throw new Error(`${label}: bounded synchronization deadline exceeded`);
    }
    let publications: Promise<PromiseSettledResult<Awaited<ReturnType<typeof publishVerifiedEditorialEmail>>>[]> | undefined;
    try {
      holder.stdin.write(`SET idle_in_transaction_session_timeout = '10s'; BEGIN;
        SELECT generation FROM editorial_publication_fence WHERE id = 1 FOR UPDATE;
        SELECT 'PUBLICATION_FENCE_HELD';\n`);
      await waitFor('publication fence acquisition', () => output.includes('PUBLICATION_FENCE_HELD'));
      const waitingSql: EditorialSql = async (strings, ...values) => {
        const statement = renderSql(strings, values);
        return /^\s*WITH image_lock AS MATERIALIZED/i.test(statement)
          ? query(`SET application_name = 'cren_distinct_image_race'; SET statement_timeout = '10s'; ${statement}`)
          : query(statement);
      };
      publications = Promise.allSettled(fixtures.map((fixture) => publishVerifiedEditorialEmail(waitingSql, fixture.emailId,
        fixture.verified, { apply: true, load: fixture.load, fingerprint: fixture.fingerprint })));
      await waitFor('both publications waiting with pre-commit SQL snapshots', async () => {
        const [waiting] = await query(`SELECT count(*) AS count FROM pg_stat_activity
          WHERE application_name = 'cren_distinct_image_race' AND state = 'active' AND wait_event_type = 'Lock'`);
        return Number(waiting.count) === 2;
      });
      holder.stdin.write("COMMIT; SELECT 'PUBLICATION_FENCE_RELEASED';\n");
      const results = await publications;
      assert.equal(results.filter((result) => result.status === 'fulfilled' && result.value.published).length, 1);
      const loserIndex = results.findIndex((result) => result.status === 'rejected');
      assert.notEqual(loserIndex, -1);
      const rejected = results[loserIndex];
      assert.equal(rejected.status, 'rejected');
      if (rejected.status === 'rejected') assert.match(String(rejected.reason), /EMAIL_PUBLICATION_BLOCKED_BY_CHANGED_STATE_OR_IMAGE/);
      const loser = fixtures[loserIndex];
      assert.equal((await sql`SELECT status FROM articles WHERE id = ${loser.id}`)[0].status, 'draft');
      assert.equal((await sql`SELECT * FROM editorial_email_publications WHERE email_id = ${loser.emailId}`).length, 0);
      const [afterRace] = await sql`SELECT generation FROM editorial_publication_fence WHERE id = 1`;
      assert.equal(Number(afterRace.generation), Number(initialFence.generation) + 1);
      const retry = () => publishVerifiedEditorialEmail(sql, loser.emailId, loser.verified,
        { apply: true, load: loser.load, fingerprint: loser.fingerprint });
      if (nearDuplicate) {
        await assert.rejects(retry, /EMAIL_PUBLICATION_BLOCKED_BY_CHANGED_STATE_OR_IMAGE/);
        assert.equal((await sql`SELECT status FROM articles WHERE id = ${loser.id}`)[0].status, 'draft');
      } else {
        assert.equal((await retry()).published, true);
        assert.equal((await sql`SELECT status FROM articles WHERE id = ${loser.id}`)[0].status, 'live');
      }
      const [afterRetry] = await sql`SELECT generation FROM editorial_publication_fence WHERE id = 1`;
      assert.equal(Number(afterRetry.generation), Number(initialFence.generation) + (nearDuplicate ? 1 : 2));
    } finally {
      if (!closed) holder.stdin.end('ROLLBACK;\n\\q\n');
      const stopTimer = setTimeout(() => { if (!closed) holder.kill('SIGKILL'); }, 2000);
      await finished; clearTimeout(stopTimer);
      if (publications) await publications;
    }
  }
  await t.test('publication fence rejects a near-image phantom from two different articles with pre-lock snapshots', async () => {
    await raceDistinctEmailPublications(true);
  });
  await t.test('different-image concurrent publication retries successfully after refreshing the publication generation', async () => {
    await raceDistinctEmailPublications(false);
  });

  let stagedImageSequence = 0;
  // Neon decodes this int4 COUNT result as a number; psql CSV otherwise loses
  // the database type. Keep the conversion narrow rather than changing the harness.
  const stageSql: EditorialSql = async (strings, ...values) => {
    const rows = await sql(strings, ...values);
    return strings.join('').includes('COUNT(*)::int AS count FROM attached')
      ? rows.map((row) => ({ ...row, count: Number(row.count) })) : rows;
  };
  async function seedReviewedImage() {
    const id = `reviewed-source-image-${++stagedImageSequence}`;
    const source = `https://photos.example.test/${id}`;
    const imageUrl = `https://fixture.public.blob.vercel-storage.com/${id}.webp`;
    const sha256 = createHash('sha256').update(`source-pixels:${id}`).digest('hex');
    const perceptualHash = createHash('sha256').update(`source-perceptual:${id}`).digest('hex').slice(0, 16);
    const caption = 'Columbus project site, September 2026. Photo: Example Photographer.';
    const submission = { ...candidate, id, image_url: null, image_sha256: null };
    const artifact: EditorialCandidate = { ...submission, image_url: imageUrl, image_sha256: sha256,
      image_alt: 'A brick building and sidewalk at the documented Columbus project site.', image_caption: caption,
      image_brief: { ...(candidate.image_brief as Record<string, unknown>), image_policy_version: IMAGE_POLICY_VERSION,
        source_asset_considered: true, source_review: [{ url: source, outcome: 'SELECTED', note: 'Inspected original file and permission.' }] },
      image_provenance: { type: 'LICENSED_PHOTO', source, license: 'Written editorial-use license',
        permission_evidence: 'Local fixture written permission reference', credit: 'Example Photographer', caption,
        location_note: 'Location checked against the project record.', date_note: 'Captured September 2026.',
        verified_by: 'Fixture image editor', verified_at: '2026-09-22T18:00:00Z' } };
    await sql`INSERT INTO articles(id, title, excerpt, body, updated_at)
      VALUES (${id}, ${artifact.title}, ${artifact.excerpt}, ${artifact.body}, '2026-09-22T18:00:00.123456Z')`;
    await sql`INSERT INTO editorial_review_jobs(article_id, status, submission, updated_at)
      VALUES (${id}, 'AWAITING_IMAGE', ${JSON.stringify(submission)}::jsonb, '2026-09-22T18:00:01.654321Z')`;
    const [snapshot] = await sql`SELECT a.updated_at::text AS article_updated_at, r.updated_at::text AS review_updated_at,
      r.submission FROM articles a JOIN editorial_review_jobs r ON r.article_id = a.id WHERE a.id = ${id}`;
    return { articleId: id, snapshot: { article_updated_at: snapshot.article_updated_at,
      review_updated_at: snapshot.review_updated_at, submission: snapshot.submission },
    candidate: artifact, fingerprint: { sha256, perceptualHash }, model: 'verified-source-asset' };
  }
  async function stagedImageState(articleId: string) {
    return {
      article: await sql`SELECT * FROM articles WHERE id = ${articleId}`,
      review: await sql`SELECT * FROM editorial_review_jobs WHERE article_id = ${articleId}`,
      fingerprint: await sql`SELECT * FROM article_image_fingerprints WHERE article_id = ${articleId}`,
      job: await sql`SELECT * FROM article_image_jobs WHERE article_id = ${articleId}`,
      fence: await sql`SELECT * FROM editorial_publication_fence WHERE id = 1`,
    };
  }
  await t.test('sourced image stages URL, alt, caption, provenance, fingerprint and job atomically while article remains draft', async () => {
    const image = await seedReviewedImage();
    const before = await stagedImageState(image.articleId);
    assert.deepEqual(await stageReviewedImage(stageSql, image), { articleId: image.articleId, status: 'READY_FOR_REVIEW' });
    const after = await stagedImageState(image.articleId);
    assert.equal(after.article[0].status, 'draft'); assert.equal(after.article[0].body, before.article[0].body);
    assert.equal(after.article[0].image_url, image.candidate.image_url);
    assert.equal(after.article[0].image_alt, image.candidate.image_alt);
    assert.equal(after.article[0].image_caption, image.candidate.image_caption);
    assert.equal(after.review[0].status, 'READY_FOR_REVIEW');
    assert.deepEqual(after.review[0].submission, image.candidate);
    assert.equal((after.review[0].machine_report as { passed: boolean }).passed, true);
    assert.equal(after.fingerprint[0].sha256, image.fingerprint.sha256);
    assert.equal(after.fingerprint[0].perceptual_hash, image.fingerprint.perceptualHash);
    assert.equal(after.job[0].status, 'READY_FOR_REVIEW'); assert.equal(after.job[0].model, 'verified-source-asset');
    assert.equal(after.job[0].source_sha256, image.fingerprint.sha256);
    assert.equal(after.job[0].image_url, image.candidate.image_url); assert.ok(after.job[0].completed_at);
    assert.equal(Number(after.fence[0].generation), Number(before.fence[0].generation) + 1);
  });
  await t.test('generated-provider image cannot be attached under licensed-photo provenance', async () => {
    const image = await seedReviewedImage(); const before = await stagedImageState(image.articleId);
    await assert.rejects(stageReviewedImage(stageSql, { ...image, model: 'generated-provider-fixture' }), /IMAGE_PROVIDER_PROVENANCE_MISMATCH/);
    assert.deepEqual(await stagedImageState(image.articleId), before);
  });
  await t.test('image staging binds the candidate article identity and image hash to its exact attachment', async () => {
    const image = await seedReviewedImage(); const before = await stagedImageState(image.articleId);
    for (const artifact of [{ ...image.candidate, id: 'different-article' },
      { ...image.candidate, image_sha256: '0'.repeat(64) }]) {
      await assert.rejects(stageReviewedImage(stageSql, { ...image, candidate: artifact }), /IMAGE_ARTIFACT_BINDING_MISMATCH/);
      assert.deepEqual(await stagedImageState(image.articleId), before);
    }
  });
  await t.test('image staging refuses live articles and stale article, review or submission snapshots without partial writes', async () => {
    for (const condition of ['live', 'article-timestamp', 'review-timestamp', 'submission', 'already-attached']) {
      const image = await seedReviewedImage();
      if (condition === 'live') await sql`UPDATE articles SET status = 'live' WHERE id = ${image.articleId}`;
      if (condition === 'article-timestamp') await sql`UPDATE articles SET updated_at = updated_at + INTERVAL '1 microsecond' WHERE id = ${image.articleId}`;
      if (condition === 'review-timestamp') await sql`UPDATE editorial_review_jobs SET updated_at = updated_at + INTERVAL '1 microsecond' WHERE article_id = ${image.articleId}`;
      if (condition === 'submission') await sql`UPDATE editorial_review_jobs SET submission = submission || '{"changed_evidence":true}'::jsonb WHERE article_id = ${image.articleId}`;
      if (condition === 'already-attached') await sql`UPDATE articles SET image_url = 'https://fixture.public.blob.vercel-storage.com/existing-real-photo.webp' WHERE id = ${image.articleId}`;
      const before = await stagedImageState(image.articleId);
      await assert.rejects(stageReviewedImage(stageSql, image), /IMAGE_ATTACHMENT_CHANGED_STATE_OR_DUPLICATE/);
      assert.deepEqual(await stagedImageState(image.articleId), before, condition);
    }
  });
  await t.test('source image staging rejects duplicate bytes, visual fingerprints and asset URLs atomically', async () => {
    for (const duplicate of ['sha256', 'perceptual', 'url']) {
      const image = await seedReviewedImage();
      const otherSha = createHash('sha256').update(`duplicate-fixture:${image.articleId}`).digest('hex');
      const otherPhash = createHash('sha256').update(`duplicate-visual:${image.articleId}`).digest('hex').slice(0, 16);
      await sql`INSERT INTO article_image_fingerprints(article_id, image_url, sha256, perceptual_hash, verified_at)
        VALUES (${`existing-${image.articleId}`}, ${duplicate === 'url' ? image.candidate.image_url : `https://photos.example.test/${image.articleId}`},
          ${duplicate === 'sha256' ? image.fingerprint.sha256 : otherSha},
          ${duplicate === 'perceptual' ? image.fingerprint.perceptualHash : otherPhash}, NOW())`;
      const before = await stagedImageState(image.articleId);
      await assert.rejects(stageReviewedImage(stageSql, image), /IMAGE_ATTACHMENT_CHANGED_STATE_OR_DUPLICATE/);
      assert.deepEqual(await stagedImageState(image.articleId), before, duplicate);
    }
  });

  await t.test('source image staging rejects an article URL collision even when its fingerprint row is absent', async () => {
    const image = await seedReviewedImage();
    const otherId = `raw-url-${image.articleId}`;
    await sql`INSERT INTO articles(id, status, image_url) VALUES (${otherId}, 'live', ${image.candidate.image_url})`;
    assert.equal((await sql`SELECT * FROM article_image_fingerprints WHERE article_id = ${otherId}`).length, 0);
    const before = await stagedImageState(image.articleId);
    await assert.rejects(stageReviewedImage(stageSql, image), /IMAGE_ATTACHMENT_CHANGED_STATE_OR_DUPLICATE/);
    assert.deepEqual(await stagedImageState(image.articleId), before);
  });

  await t.test('concurrent cloud image claims grant exactly one live lease and one attempt', async () => {
    const image = await seedReviewedImage();
    const input = { articleId: image.articleId, prompt: 'Fixture source acquisition', model: image.model };
    const claims = await Promise.all([claimCloudImage(sql, input), claimCloudImage(sql, input)]);
    const tokens = claims.filter(token => token !== null);
    assert.equal(tokens.length, 1);
    const [job] = await sql`SELECT * FROM article_image_jobs WHERE article_id = ${image.articleId}`;
    assert.equal(job.status, 'GENERATING'); assert.equal(job.cloud_lease_token, tokens[0]);
    assert.equal(Number(job.attempts), 1); assert.ok(job.started_at);
  });
  await t.test('wrong cloud lease cannot hold or stage another worker image claim', async () => {
    const image = await seedReviewedImage();
    const token = await claimCloudImage(sql, { articleId: image.articleId, prompt: 'Fixture claim', model: image.model });
    assert.ok(token);
    const before = await stagedImageState(image.articleId);
    const wrong = '00000000-0000-4000-8000-000000000001';
    await recordCloudImageHold(sql, image.articleId, 'WRONG_WORKER', wrong);
    await recordCloudImageHold(sql, image.articleId, 'UNCLAIMED_WORKER');
    assert.deepEqual(await stagedImageState(image.articleId), before);
    await assert.rejects(stageReviewedImage(stageSql, { ...image, cloudLeaseToken: wrong }), /IMAGE_ATTACHMENT_CHANGED_STATE_OR_DUPLICATE/);
    assert.deepEqual(await stagedImageState(image.articleId), before);
  });
  await t.test('expired image claim gets a new token and stale worker cannot hold or stage; winning lease releases on attachment', async () => {
    const image = await seedReviewedImage();
    const input = { articleId: image.articleId, prompt: 'Fixture reclaim', model: image.model };
    const oldToken = await claimCloudImage(sql, input); assert.ok(oldToken);
    await sql`UPDATE article_image_jobs SET started_at = NOW() - INTERVAL '11 minutes' WHERE article_id = ${image.articleId}`;
    const newToken = await claimCloudImage(sql, input); assert.ok(newToken); assert.notEqual(newToken, oldToken);
    const before = await stagedImageState(image.articleId);
    assert.equal(Number(before.job[0].attempts), 2);
    await recordCloudImageHold(sql, image.articleId, 'STALE_WORKER_FAILURE', oldToken);
    await assert.rejects(stageReviewedImage(stageSql, { ...image, cloudLeaseToken: oldToken }), /IMAGE_ATTACHMENT_CHANGED_STATE_OR_DUPLICATE/);
    assert.deepEqual(await stagedImageState(image.articleId), before);
    assert.equal((await stageReviewedImage(stageSql, { ...image, cloudLeaseToken: newToken })).status, 'READY_FOR_REVIEW');
    const after = await stagedImageState(image.articleId);
    assert.equal(after.article[0].status, 'draft'); assert.equal(after.job[0].status, 'READY_FOR_REVIEW');
    assert.equal(after.job[0].cloud_lease_token, ''); assert.equal(Number(after.job[0].attempts), 2);
  });
  await t.test('ready and published image jobs cannot be reclaimed or downgraded by a cloud hold', async () => {
    for (const status of ['READY_FOR_REVIEW', 'PUBLISHED']) {
      const image = await seedReviewedImage();
      const token = await claimCloudImage(sql, { articleId: image.articleId, prompt: 'Fixture ready job', model: image.model });
      await sql`UPDATE article_image_jobs SET status = ${status}, started_at = NOW() - INTERVAL '11 minutes' WHERE article_id = ${image.articleId}`;
      const before = await stagedImageState(image.articleId);
      assert.equal(await claimCloudImage(sql, { articleId: image.articleId, prompt: 'Must not reopen', model: image.model }), null);
      await recordCloudImageHold(sql, image.articleId, 'MUST_NOT_DOWNGRADE');
      await recordCloudImageHold(sql, image.articleId, 'LATE_WORKER_FAILURE', token, true);
      assert.deepEqual(await stagedImageState(image.articleId), before, status);
    }
  });
  await t.test('blocked cloud images are terminal and retryable failures stop at three attempts', async () => {
    const blocked = await seedReviewedImage();
    await recordCloudImageHold(sql, blocked.articleId, 'SOURCE_RIGHTS_UNCLEAR');
    assert.equal(await claimCloudImage(sql, { articleId: blocked.articleId, prompt: 'Must not bypass hold', model: blocked.model }), null);
    assert.equal((await stagedImageState(blocked.articleId)).job[0].status, 'BLOCKED');
    const retry = await seedReviewedImage(); const input = { articleId: retry.articleId, prompt: 'Retry fixture', model: retry.model };
    for (let attempt = 1; attempt <= 3; attempt++) {
      const token = await claimCloudImage(sql, input); assert.ok(token);
      await recordCloudImageHold(sql, retry.articleId, 'TEMPORARY_PROVIDER_FAILURE', token, true);
      const [job] = await sql`SELECT status, attempts FROM article_image_jobs WHERE article_id = ${retry.articleId}`;
      assert.equal(job.status, 'FAILED'); assert.equal(Number(job.attempts), attempt);
    }
    const exhausted = await stagedImageState(retry.articleId);
    assert.equal(await claimCloudImage(sql, input), null);
    assert.deepEqual(await stagedImageState(retry.articleId), exhausted);
  });
  await t.test('cloud image claims never touch live articles', async () => {
    const image = await seedReviewedImage();
    await sql`UPDATE articles SET status = 'live' WHERE id = ${image.articleId}`;
    const before = await stagedImageState(image.articleId);
    assert.equal(await claimCloudImage(sql, { articleId: image.articleId, prompt: 'Must not edit live', model: image.model }), null);
    await recordCloudImageHold(sql, image.articleId, 'MUST_NOT_EDIT_LIVE');
    assert.deepEqual(await stagedImageState(image.articleId), before);
  });
  await t.test('image staging refuses a lease reclaimed while its SQL snapshot waits on the image-job lock', async () => {
    const image = await seedReviewedImage();
    const oldToken = await claimCloudImage(sql, { articleId: image.articleId, prompt: 'Lock-wait fixture', model: image.model });
    assert.ok(oldToken);
    const newToken = '00000000-0000-4000-8000-000000000002';
    const holder = spawn('psql', [database!, '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = ''; let errors = ''; let closed = false;
    holder.stdout.on('data', chunk => { output += String(chunk); });
    holder.stderr.on('data', chunk => { errors += String(chunk); });
    holder.on('error', error => { errors += error.message; });
    const finished = new Promise<void>(resolve => holder.on('close', () => { closed = true; resolve(); }));
    async function waitFor(label: string, predicate: () => Promise<boolean> | boolean) {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if (await predicate()) return;
        if (closed || errors) throw new Error(`${label}: holder stopped: ${errors}`);
        await delay(25);
      }
      throw new Error(`${label}: bounded synchronization deadline exceeded`);
    }
    let staging: ReturnType<typeof stageReviewedImage> | undefined;
    try {
      holder.stdin.write(`SET idle_in_transaction_session_timeout = '10s'; BEGIN;
        SELECT article_id FROM article_image_jobs WHERE article_id = '${image.articleId}' FOR UPDATE;
        SELECT 'IMAGE_JOB_LOCK_HELD';\n`);
      await waitFor('image job lock acquisition', () => output.includes('IMAGE_JOB_LOCK_HELD'));
      const waitingSql: EditorialSql = async (strings, ...values) => {
        const statement = renderSql(strings, values);
        if (!/^\s*WITH image_lock AS MATERIALIZED/.test(statement)) return stageSql(strings, ...values);
        const rows = await query(`SET application_name = 'cren_cloud_image_stale_lease'; SET statement_timeout = '10s'; ${statement}`);
        return rows.map(row => ({ ...row, count: Number(row.count) }));
      };
      staging = stageReviewedImage(waitingSql, { ...image, cloudLeaseToken: oldToken });
      void staging.catch(() => {});
      await waitFor('stale image worker waiting with old SQL snapshot', async () => {
        const [waiting] = await query(`SELECT count(*) AS count FROM pg_stat_activity
          WHERE application_name = 'cren_cloud_image_stale_lease' AND state = 'active' AND wait_event_type = 'Lock'`);
        return Number(waiting.count) === 1;
      });
      holder.stdin.write(`UPDATE article_image_jobs SET cloud_lease_token = '${newToken}'::uuid,
        attempts = attempts + 1, started_at = NOW(), updated_at = NOW() WHERE article_id = '${image.articleId}';
        COMMIT; SELECT 'IMAGE_LEASE_RECLAIMED';\n`);
      await assert.rejects(staging, /IMAGE_ATTACHMENT_CHANGED_STATE_OR_DUPLICATE/);
      const state = await stagedImageState(image.articleId);
      assert.equal(state.article[0].image_url, ''); assert.equal(state.review[0].status, 'AWAITING_IMAGE');
      assert.equal(state.fingerprint.length, 0); assert.equal(state.job[0].status, 'GENERATING');
      assert.equal(state.job[0].cloud_lease_token, newToken); assert.equal(Number(state.job[0].attempts), 2);
    } finally {
      if (!closed) holder.stdin.end('ROLLBACK;\n\\q\n');
      const stopTimer = setTimeout(() => { if (!closed) holder.kill('SIGKILL'); }, 2000);
      await finished; clearTimeout(stopTimer);
      if (staging) await staging.catch(() => {});
    }
  });

  await t.test('isolated cloud draft import transactions', async (imports) => {
    await query(`ALTER TABLE articles ADD COLUMN canonical_slug TEXT, ADD COLUMN featured BOOLEAN,
      ADD COLUMN category_class TEXT, ADD COLUMN icon TEXT;
      CREATE UNIQUE INDEX articles_canonical_slug_unique ON articles(canonical_slug) WHERE canonical_slug IS NOT NULL`);
    await ensureNewsroomRunTable(sql);
    for (const statement of cloudImportSchema) await query(statement);
    const date = '2026-09-22'; const now = new Date('2026-09-22T18:00:00Z');
    let importSequence = 0;
    function artifact(): CloudDraftArtifact {
      const sequence = ++importSequence;
      const digest = createHash('sha256').update(`import-fixture:${sequence}`).digest('hex');
      // Deliberately distinct fixture titles isolate identity/event guards from
      // fuzzy-title matching against the pre-existing lifecycle test corpus.
      const title = `Columbus ${digest.slice(0, 8)} ${digest.slice(8, 16)} ${digest.slice(16, 24)} ${digest.slice(24, 32)} ${digest.slice(32, 40)}`;
      const source = `https://photos.example.test/import-${sequence}`;
      const article: Record<string, unknown> = { ...structuredClone(fixture), title,
        prompt_version: 'cren-article-v1.0.2', date, fact_checked_at: now.toISOString(),
        canonical_event_key: `local-cloud-import-event-${sequence}`, image_url: null,
        image_alt: 'A brick building and sidewalk at the documented Columbus project site.',
        image_brief: { ...fixture.image_brief, image_policy_version: IMAGE_POLICY_VERSION, source_asset_considered: true,
          source_review: [{ url: source, outcome: 'SELECTED', note: 'Fixture original source and permission reviewed.' }] },
        image_provenance: { type: 'LICENSED_PHOTO', source, license: 'Written editorial permission',
          permission_evidence: 'Fixture written permission', credit: 'Example Photographer',
          caption: 'Project site. Photo: Example Photographer.', location_note: 'Verified site.', date_note: 'September 2026.',
          verified_by: 'Fixture editor', verified_at: now.toISOString() },
      };
      article.image_caption = (article.image_provenance as { caption: string }).caption;
      article.cloud_image_asset = { path: `frontend/content/images/${date}-local-source-${sequence}.webp`,
        git_blob_sha: createHash('sha1').update(`image-blob:${sequence}`).digest('hex'), source_sha256: digest,
        visual_review: { reviewed_by: 'Fixture image editor', reviewed_at: now.toISOString(), natural_appearance: true,
          geometry_and_shadows: true, no_synthetic_artifacts: true, story_match: true, truthful_caption: true, mobile_crop: true } };
      article.source_ledger = fixture.source_ledger.map((source: Record<string, unknown>) => ({ ...source, fetched_at: now.toISOString() }));
      delete article.id; delete article.image_sha256;
      return { path: `frontend/content/articles/${date}-local-import-${sequence}.json`, commit: 'a'.repeat(40),
        blobSha: createHash('sha1').update(`blob:${sequence}`).digest('hex'), sha256: digest, article };
    }
    const importSql: EditorialSql = async (strings, ...values) => {
      const rows = await sql(strings, ...values);
      return strings.join('').includes('COUNT(*)::int AS count FROM inserted')
        ? rows.map(row => ({ ...row, count: Number(row.count) })) : rows;
    };
    async function importState(input: CloudDraftArtifact) {
      const id = prepareCloudDraft(input, date, now).id;
      return { articles: await sql`SELECT * FROM articles WHERE id = ${id}`,
        reviews: await sql`SELECT * FROM editorial_review_jobs WHERE article_id = ${id}`,
        receipts: await sql`SELECT * FROM cren_cloud_draft_imports WHERE source_path = ${input.path}`,
        runs: await sql`SELECT * FROM newsroom_runs WHERE staged_article_ids @> ${JSON.stringify([id])}::jsonb`,
        fence: await sql`SELECT * FROM editorial_publication_fence WHERE id = 1` };
    }
    const batch = (input: CloudDraftArtifact) => async () => ({ date, commit: input.commit, artifacts: [input] });
    await imports.test('dry-run plans a current draft without records, receipts or run writes', async () => {
      const input = artifact(); const before = await importState(input);
      const [runsBefore] = await sql`SELECT count(*) AS count FROM cren_cloud_import_runs`;
      const result = await runCloudImport(importSql, batch(input), { apply: false, now });
      assert.equal(result.ok, true); assert.equal(result.published, 0); assert.equal(result.results[0].status, 'READY_TO_STAGE');
      assert.deepEqual(await importState(input), before);
      assert.deepEqual((await sql`SELECT count(*) AS count FROM cren_cloud_import_runs`)[0], runsBefore);
    });
    await imports.test('verified quiet-day receipt creates one idempotent completed newsroom run', async () => {
      const runReceipt = { storyResult: 'NO_QUALIFYING_STORY' as const, completedAt: now.toISOString(),
        path: `frontend/content/newsroom-runs/${date}.json`, blobSha: 'b'.repeat(40) };
      const source = async () => ({ date, commit: 'a'.repeat(40), artifacts: [], runReceipt });
      const first = await runCloudImport(importSql, source, { apply: true, now });
      const second = await runCloudImport(importSql, source, { apply: true, now });
      assert.deepEqual(first.runReceipt, { present: true, quietRunRecorded: true });
      assert.deepEqual(second.runReceipt, { present: true, quietRunRecorded: false });
      const runs = await sql`SELECT * FROM newsroom_runs WHERE details->>'role'='verified-cloud-run-receipt'`;
      assert.equal(runs.length, 1); assert.equal(runs[0].status, 'COMPLETED');
      assert.equal(runs[0].story_result, 'NO_QUALIFYING_STORY'); assert.equal(Number(runs[0].staged_count), 0);
    });
    await imports.test('cloud import atomically stages article, evidence, receipt and truthful run membership without publication', async () => {
      const input = artifact(); const before = await importState(input);
      const result = await runCloudImport(importSql, batch(input), { apply: true, now });
      assert.equal(result.ok, true); assert.equal(result.published, 0); assert.equal(result.results[0].status, 'STAGED');
      const state = await importState(input);
      assert.equal(state.articles.length, 1); assert.equal(state.articles[0].status, 'draft'); assert.equal(state.articles[0].image_url, '');
      assert.equal(state.reviews[0].status, 'AWAITING_IMAGE');
      assert.deepEqual(state.reviews[0].submission, prepareCloudDraft(input, date, now).article);
      assert.equal((state.reviews[0].machine_report as { passed: boolean }).passed, true);
      assert.equal(state.reviews[0].human_score, ''); assert.equal(state.reviews[0].human_decision, '');
      assert.equal(state.receipts.length, 1); assert.equal(state.receipts[0].content_sha256, input.sha256);
      assert.equal(state.receipts[0].blob_sha, input.blobSha); assert.equal(state.receipts[0].source_commit, input.commit);
      assert.equal(state.runs.length, 1); assert.equal(state.runs[0].source, 'vercel-github-import');
      assert.equal(state.runs[0].status, 'COMPLETED'); assert.equal(state.runs[0].story_result, 'STAGED');
      assert.equal(Number(state.runs[0].staged_count), 1); assert.equal(Number(state.runs[0].published_count), 0);
      assert.deepEqual(state.runs[0].staged_article_ids, [state.articles[0].id]);
      assert.equal(Number(state.fence[0].generation), Number(before.fence[0].generation) + 1);
      const [receiptRun] = await sql`SELECT * FROM cren_cloud_import_runs ORDER BY started_at DESC LIMIT 1`;
      assert.equal(receiptRun.status, 'CHECKED'); assert.ok(receiptRun.completed_at);
    });
    await imports.test('exact replay is idempotent, while a changed path is held without updating its original draft', async () => {
      const input = artifact(); await stageCloudDraft(importSql, input, { date, now, apply: true });
      const before = await importState(input);
      assert.equal((await stageCloudDraft(importSql, { ...input, commit: 'd'.repeat(40) }, { date, now, apply: true })).status, 'ALREADY_STAGED');
      assert.deepEqual(await importState(input), before);
      for (const patch of [{ blobSha: 'f'.repeat(40) }, { sha256: 'e'.repeat(64) }]) {
        await assert.rejects(stageCloudDraft(importSql, { ...input, ...patch }, { date, now, apply: true }), /IMPORT_PATH_CHANGED_REQUIRES_REVIEW/);
        assert.deepEqual(await importState(input), before);
      }
    });
    await imports.test('live article identity, duplicate titles and existing event keys block new imports', async () => {
      for (const conflict of ['live-id', 'title', 'event']) {
        const input = artifact(); const prepared = prepareCloudDraft(input, date, now);
        const existingId = conflict === 'live-id' ? prepared.id : `conflict-${prepared.id}`;
        await sql`INSERT INTO articles(id, status, title) VALUES (${existingId}, 'live', ${conflict === 'title' ? input.article.title : `Distinct legacy marker ${importSequence}`})`;
        if (conflict === 'event') await sql`INSERT INTO editorial_review_jobs(article_id, status, submission)
          VALUES (${existingId}, 'APPROVED', ${JSON.stringify({ canonical_event_key: input.article.canonical_event_key })}::jsonb)`;
        const before = await importState(input);
        await assert.rejects(stageCloudDraft(importSql, input, { date, now, apply: true }), /IMPORT_EXISTING_STORY_REQUIRES_REVIEW/);
        assert.deepEqual(await importState(input), before, conflict);
      }
    });
    await imports.test('concurrent exact deliveries commit one import and the losing attempt can replay safely', async () => {
      const input = artifact();
      let arrived = 0; let release!: () => void;
      const barrier = new Promise<void>(resolve => { release = resolve; });
      const concurrentSql: EditorialSql = async (strings, ...values) => {
        if (/^\s*WITH guard AS MATERIALIZED/.test(strings.join(''))) {
          arrived++; if (arrived === 2) release();
          await Promise.race([barrier, delay(5000).then(() => { throw new Error('IMPORT_TEST_BARRIER_TIMEOUT'); })]);
        }
        return importSql(strings, ...values);
      };
      const results = await Promise.allSettled([stageCloudDraft(concurrentSql, input, { date, now, apply: true }),
        stageCloudDraft(concurrentSql, input, { date, now, apply: true })]);
      assert.equal(results.filter(result => result.status === 'fulfilled' && result.value.status === 'STAGED').length, 1);
      const rejected = results.find(result => result.status === 'rejected');
      assert.ok(rejected && rejected.status === 'rejected'); assert.match(String(rejected.reason), /IMPORT_CONCURRENT_CHANGE_RETRY/);
      const state = await importState(input);
      assert.equal(state.articles.length, 1); assert.equal(state.reviews.length, 1); assert.equal(state.receipts.length, 1); assert.equal(state.runs.length, 1);
      assert.equal((await stageCloudDraft(importSql, input, { date, now, apply: true })).status, 'ALREADY_STAGED');
      assert.deepEqual(await importState(input), state);
    });
    await imports.test('failed receipt insertion rolls back article, review, run and fence with no orphan records', async () => {
      const input = artifact(); input.path = `frontend/content/articles/${date}-rollback-fixture.json`;
      const before = await importState(input);
      await query("ALTER TABLE cren_cloud_draft_imports ADD CONSTRAINT local_import_rollback_fixture CHECK (source_path NOT LIKE '%rollback-fixture%')");
      try {
        const result = await runCloudImport(importSql, batch(input), { apply: true, now });
        assert.equal(result.ok, false); assert.equal(result.status, 'BLOCKED'); assert.equal(result.published, 0);
        assert.equal(result.results[0].status, 'HELD'); assert.equal(result.results[0].code, 'IMPORT_STAGE_FAILED');
        assert.deepEqual(await importState(input), before);
        const [run] = await sql`SELECT * FROM cren_cloud_import_runs ORDER BY started_at DESC LIMIT 1`;
        assert.equal(run.status, 'BLOCKED'); assert.ok(run.completed_at);
      } finally { await query('ALTER TABLE cren_cloud_draft_imports DROP CONSTRAINT local_import_rollback_fixture'); }
    });
    await imports.test('source failures persist a sanitized failed import run without staging or publishing', async () => {
      await assert.rejects(runCloudImport(importSql, async () => { throw new Error('secret-provider-body-do-not-persist'); }, { apply: true, now }), /GITHUB_IMPORT_UNAVAILABLE/);
      const [run] = await sql`SELECT * FROM cren_cloud_import_runs ORDER BY started_at DESC LIMIT 1`;
      assert.equal(run.status, 'FAILED'); assert.equal(run.error_code, 'GITHUB_IMPORT_UNAVAILABLE');
      assert.deepEqual(run.results, []); assert.ok(run.completed_at); assert.doesNotMatch(JSON.stringify(run), /secret-provider-body/);
    });
  });
});

test('PostgreSQL fingerprint reconciliation is read-only by default and atomically fenced', { skip: !database }, async (t) => {
  const fresh = { sha256: '1'.repeat(64), perceptualHash: '1234567890abcdef' };
  const freshOther = { sha256: '2'.repeat(64), perceptualHash: 'edcba9876f543210' };
  const url = 'https://fixture.public.blob.vercel-storage.com/sync-a.webp';
  const otherUrl = 'https://fixture.public.blob.vercel-storage.com/sync-b.webp';
  async function reset() {
    await query('TRUNCATE articles, article_image_fingerprints CASCADE');
    await sql`INSERT INTO articles(id, status, image_url, updated_at)
      VALUES ('sync-a', 'live', ${url}, '2026-09-22T12:00:00.123456Z'),
        ('sync-b', 'draft', ${otherUrl}, '2026-09-22T12:00:01.654321Z')`;
    await sql`INSERT INTO article_image_fingerprints(article_id,image_url,sha256,perceptual_hash,verified_at)
      VALUES ('sync-a','https://old.example.test/a','malformed','bad',NOW()),
        ('sync-b',${otherUrl},${'3'.repeat(64)},${'0'.repeat(16)},NOW())`;
  }
  const fingerprint = async (imageUrl: string) => imageUrl === url ? fresh : freshOther;
  const state = async () => ({
    articles: await sql`SELECT * FROM articles ORDER BY id`,
    fingerprints: await sql`SELECT * FROM article_image_fingerprints ORDER BY article_id`,
    fence: await sql`SELECT * FROM editorial_publication_fence WHERE id = 1`,
  });
  await t.test('default scan reports stale/malformed cache without a single persistent change', async () => {
    await reset(); const before = await state();
    const result = await syncImageFingerprints(sql, { fingerprint });
    assert.equal(result.ok, true); assert.equal(result.mode, 'dry-run'); assert.equal(result.wouldSync, 2);
    assert.ok(result.cacheIssues.some(issue => issue.reason === 'MALFORMED_CACHED_FINGERPRINT'));
    assert.deepEqual(await state(), before);
  });
  await t.test('authorized refresh repairs the complete checked cache and increments the fence once without touching articles', async () => {
    await reset(); const before = await state();
    const result = await syncImageFingerprints(sql, { apply: true, fingerprint });
    assert.equal(result.ok, true); assert.equal(result.synced, 2);
    const after = await state(); assert.deepEqual(after.articles, before.articles);
    assert.equal(after.fingerprints[0].image_url, url); assert.equal(after.fingerprints[0].sha256, fresh.sha256);
    assert.equal(after.fingerprints[1].sha256, freshOther.sha256);
    assert.equal(Number(after.fence[0].generation), Number(before.fence[0].generation) + 1);
  });
  await t.test('one unreachable image or duplicate blocks every cache write', async () => {
    for (const failure of ['unreachable', 'exact', 'near', 'url']) {
      await reset();
      if (failure === 'url') await sql`UPDATE articles SET image_url = ${url} WHERE id = 'sync-b'`;
      const before = await state();
      const result = await syncImageFingerprints(sql, { apply: true, fingerprint: async (imageUrl) => {
        if (imageUrl === url) return fresh;
        if (failure === 'unreachable') return null;
        return failure === 'exact' ? fresh : { ...freshOther, perceptualHash: fresh.perceptualHash };
      } });
      assert.equal(result.ok, false, failure); assert.equal(result.synced, 0);
      assert.deepEqual(await state(), before, failure);
    }
  });
  await t.test('concurrent refreshes share a snapshot but exactly one advances the publication fence', async () => {
    await reset(); const before = await state(); let arrived = 0; let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const racingSql: EditorialSql = async (strings, ...values) => {
      if (/WITH image_lock AS MATERIALIZED/.test(strings.join(''))) {
        arrived++; if (arrived === 2) release();
        await Promise.race([barrier, delay(5000).then(() => { throw new Error('FINGERPRINT_TEST_BARRIER_TIMEOUT'); })]);
      }
      return sql(strings, ...values);
    };
    const results = await Promise.all([syncImageFingerprints(racingSql, { apply: true, fingerprint }),
      syncImageFingerprints(racingSql, { apply: true, fingerprint })]);
    assert.equal(results.filter(result => result.ok && result.synced === 2).length, 1);
    assert.equal(results.filter(result => !result.ok && result.synced === 0).length, 1);
    const after = await state(); assert.deepEqual(after.articles, before.articles);
    assert.equal(Number(after.fence[0].generation), Number(before.fence[0].generation) + 1);
  });
  await t.test('URL, microsecond timestamp, corpus, cache and generation changes during fetch refuse the entire commit', async () => {
    for (const change of ['url', 'timestamp', 'new-article', 'cache', 'generation']) {
      await reset(); let changed = false; let afterChange: Awaited<ReturnType<typeof state>> | undefined;
      const result = await syncImageFingerprints(sql, { apply: true, fingerprint: async (imageUrl) => {
        if (!changed) {
          changed = true;
          if (change === 'url') await sql`UPDATE articles SET image_url = ${`${url}?changed`} WHERE id = 'sync-a'`;
          if (change === 'timestamp') await sql`UPDATE articles SET updated_at = updated_at + INTERVAL '1 microsecond' WHERE id = 'sync-a'`;
          if (change === 'new-article') await sql`INSERT INTO articles(id, status, image_url) VALUES ('sync-c', 'draft', ${`${url}?new`})`;
          if (change === 'cache') await sql`UPDATE article_image_fingerprints SET sha256 = ${'4'.repeat(64)} WHERE article_id = 'sync-a'`;
          if (change === 'generation') await sql`UPDATE editorial_publication_fence SET generation = generation + 1 WHERE id = 1`;
          afterChange = await state();
        }
        return fingerprint(imageUrl);
      } });
      assert.equal(result.ok, false, change); assert.equal(result.synced, 0);
      assert.equal(result.invalid[0].reason, 'FINGERPRINT_SYNC_CHANGED_STATE_RETRY');
      assert.deepEqual(await state(), afterChange, change);
    }
  });
});

test('PostgreSQL owner-authorized live image cleanup is image-only, atomic and independently verified', { skip: !database }, async (t) => {
  await query(`ALTER TABLE article_image_jobs ADD COLUMN IF NOT EXISTS claim_token UUID,
    ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS visual_review JSONB`);
  await query(`CREATE TABLE IF NOT EXISTS audit_logs(id BIGSERIAL PRIMARY KEY, actor_type TEXT NOT NULL,
    actor_id TEXT, entity_type TEXT NOT NULL, entity_id TEXT, action TEXT NOT NULL, source_route TEXT,
    before_json JSONB NOT NULL DEFAULT '{}', after_json JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW())`);
  let batchNumber = 0;
  async function seed() {
    await query('TRUNCATE articles, article_image_fingerprints, article_image_jobs, audit_logs CASCADE');
    await sql`INSERT INTO articles(id,status,title,body,image_url,image_alt,image_caption,updated_at)
      VALUES ('cleanup-a','live','Protected first title','Protected first body','https://fixture.example.test/old-a.webp','Old A alt','Old A caption','2026-09-22T12:00:00.123456Z'),
        ('cleanup-b','live','Protected second title','Protected second body','https://fixture.example.test/old-b.webp','Old B alt','Old B caption','2026-09-22T12:00:01.654321Z')`;
    for (const [id, oldHash] of [['cleanup-a', '1'], ['cleanup-b', '2']]) {
      await sql`INSERT INTO article_image_jobs(article_id,status,model,last_error_code,cloud_lease_token,claim_token,lease_expires_at,visual_review)
        VALUES (${id},'FAILED','original-model','STALE_FAILURE','00000000-0000-4000-8000-000000000001',
          '00000000-0000-4000-8000-000000000002',NOW()-INTERVAL '1 day','{"historical_image_review":true}'::jsonb)`;
      await sql`INSERT INTO article_image_fingerprints(article_id,image_url,sha256,perceptual_hash,verified_at)
        SELECT id,image_url,${oldHash.repeat(64)},${oldHash.repeat(16)},NOW() FROM articles WHERE id=${id}`;
    }
    const articles = await sql`SELECT a.*,a.updated_at::text AS snapshot_updated_at FROM articles a WHERE status='live' ORDER BY id`;
    const beforeJobs = await sql`SELECT * FROM article_image_jobs ORDER BY article_id`;
    const fingerprints = await sql`SELECT * FROM article_image_fingerprints ORDER BY article_id`;
    const [fence] = await sql`SELECT generation::text AS generation FROM editorial_publication_fence WHERE id=1`;
    const records = articles.map((article, index) => ({ id: String(article.id), expected_url: article.image_url,
      snapshot_updated_at: article.snapshot_updated_at, image_url: `https://fixture.example.test/new-${index}.webp`,
      image_alt: `Reviewed documentary photograph for cleanup article ${index}.`, image_caption: `Photo ${index}: Fixture Photographer.`,
      sha256: (index ? 'b' : 'a').repeat(64), perceptual_hash: (index ? 'b' : 'a').repeat(16), replacement: index === 0,
      before_image: { image_url: article.image_url, image_alt: article.image_alt, image_caption: article.image_caption },
      provenance: { type: 'LICENSED_PHOTO', credit: 'Fixture Photographer' }, visual_review: { fixture: true } }));
    const batch = `00000000-0000-4000-8000-${String(++batchNumber).padStart(12, '0')}`;
    return { records, generation: String(fence.generation), batch, articles, beforeJobs, fingerprints };
  }
  const state = async () => ({
    articles: await sql`SELECT * FROM articles ORDER BY id`,
    fingerprints: await sql`SELECT * FROM article_image_fingerprints ORDER BY article_id`,
    jobs: await sql`SELECT * FROM article_image_jobs ORDER BY article_id`,
    audits: await sql`SELECT * FROM audit_logs ORDER BY id`,
    fence: await sql`SELECT * FROM editorial_publication_fence WHERE id=1`,
  });
  await t.test('successful commit updates exact image metadata, fingerprints, jobs and receipts without changing copy', async () => {
    const input = await seed();
    assertLiveImageCleanupPreflight({ records: input.records, fingerprints: input.fingerprints, jobs: input.beforeJobs });
    const result = await commitLiveImageCleanup(sql, input);
    assert.deepEqual(result, { changed: 2, fingerprints: 2, jobs: 2, receipts: 2 });
    assert.deepEqual(await verifyLiveImageCleanup(sql, input), { verifiedCopyUnchanged: true, verifiedImageMetadata: true,
      verifiedFingerprints: true, verifiedImageJobs: true, verifiedAuditReceipts: 2 });
    const after = await state();
    assert.equal(Number(after.fence[0].generation), Number(input.generation) + 1);
    assert.ok(after.jobs.every(job => job.status === 'PUBLISHED' && !job.last_error_code && !job.cloud_lease_token && job.completed_at));
    assert.ok(after.jobs.every(job => !job.claim_token && !job.lease_expires_at));
    assert.deepEqual(after.jobs[0].visual_review, input.records[0].visual_review);
    assert.deepEqual(after.jobs[1].visual_review, input.beforeJobs[1].visual_review);
    assert.equal(after.jobs[0].model, 'verified-source-photo-cleanup'); assert.equal(after.jobs[1].model, 'original-model');
    await assert.rejects(commitLiveImageCleanup(sql, input), /LIVE_CORPUS_CHANGED_NO_DATABASE_REPAIR_APPLIED/);
    assert.deepEqual(await state(), after, 'same-batch replay cannot modify rows or duplicate audit receipts');
  });
  await t.test('stale URL, microsecond timestamp, fence or missing job refuses every write', async () => {
    for (const change of ['url', 'timestamp', 'fence', 'missing-job']) {
      const input = await seed();
      if (change === 'url') await sql`UPDATE articles SET image_url='https://fixture.example.test/concurrent.webp' WHERE id='cleanup-a'`;
      if (change === 'timestamp') await sql`UPDATE articles SET updated_at=updated_at+INTERVAL '1 microsecond' WHERE id='cleanup-a'`;
      if (change === 'fence') await sql`UPDATE editorial_publication_fence SET generation=generation+1 WHERE id=1`;
      if (change === 'missing-job') await sql`DELETE FROM article_image_jobs WHERE article_id='cleanup-b'`;
      const before = await state();
      await assert.rejects(commitLiveImageCleanup(sql, input), /LIVE_CORPUS_CHANGED_NO_DATABASE_REPAIR_APPLIED/, change);
      assert.deepEqual(await state(), before, change);
    }
  });
  await t.test('stale unique SHA ownership blocks preflight, and a late unique conflict rolls back every database effect', async () => {
    const input = await seed();
    assertLiveImageCleanupPreflight({ records: input.records, fingerprints: input.fingerprints, jobs: input.beforeJobs });
    await sql`UPDATE article_image_fingerprints SET sha256=${input.records[0].sha256} WHERE article_id='cleanup-b'`;
    const currentFingerprints = await sql`SELECT * FROM article_image_fingerprints`;
    assert.throws(() => assertLiveImageCleanupPreflight({ records: input.records, fingerprints: currentFingerprints,
      jobs: input.beforeJobs }), /IMAGE_SHA_OWNERSHIP_CONFLICT/);
    // An out-of-batch owner makes the SQL constraint failure order-independent.
    await sql`UPDATE article_image_fingerprints SET sha256=${'2'.repeat(64)} WHERE article_id='cleanup-b'`;
    await sql`INSERT INTO articles(id,status) VALUES ('cleanup-draft-owner','draft')`;
    await sql`INSERT INTO article_image_fingerprints(article_id,image_url,sha256,perceptual_hash,verified_at)
      VALUES ('cleanup-draft-owner','https://fixture.example.test/other.webp',${input.records[0].sha256},${'c'.repeat(16)},NOW())`;
    const before = await state();
    await assert.rejects(commitLiveImageCleanup(sql, input), /duplicate key value violates unique constraint/);
    assert.deepEqual(await state(), before, 'copy, image metadata, jobs, fingerprints, receipts and fence all roll back');
  });
  await t.test('postcommit verification detects wrong image metadata, hashes, jobs, receipts and changed copy', async () => {
    for (const change of ['metadata', 'fingerprint', 'job', 'job-error', 'job-lease', 'legacy-claim', 'legacy-lease', 'job-review', 'missing-audit', 'audit-content', 'copy']) {
      const input = await seed(); await commitLiveImageCleanup(sql, input);
      if (change === 'metadata') await sql`UPDATE articles SET image_caption='Unexpected caption' WHERE id='cleanup-a'`;
      if (change === 'fingerprint') await sql`UPDATE article_image_fingerprints SET sha256=${'f'.repeat(64)} WHERE article_id='cleanup-a'`;
      if (change === 'job') await sql`UPDATE article_image_jobs SET status='FAILED' WHERE article_id='cleanup-a'`;
      if (change === 'job-error') await sql`UPDATE article_image_jobs SET last_error_code='UNCLEARED' WHERE article_id='cleanup-a'`;
      if (change === 'job-lease') await sql`UPDATE article_image_jobs SET cloud_lease_token='00000000-0000-4000-8000-000000000001' WHERE article_id='cleanup-a'`;
      if (change === 'legacy-claim') await sql`UPDATE article_image_jobs SET claim_token='00000000-0000-4000-8000-000000000002' WHERE article_id='cleanup-a'`;
      if (change === 'legacy-lease') await sql`UPDATE article_image_jobs SET lease_expires_at=NOW() WHERE article_id='cleanup-a'`;
      if (change === 'job-review') await sql`UPDATE article_image_jobs SET visual_review='{}'::jsonb WHERE article_id='cleanup-a'`;
      if (change === 'missing-audit') await sql`DELETE FROM audit_logs WHERE entity_id='cleanup-a'`;
      if (change === 'audit-content') await sql`UPDATE audit_logs SET after_json='{}'::jsonb WHERE entity_id='cleanup-a'`;
      if (change === 'copy') await sql`UPDATE articles SET body='Unexpected copy change' WHERE id='cleanup-a'`;
      await assert.rejects(verifyLiveImageCleanup(sql, input), /POST_REPAIR_.*FAILED/, change);
    }
  });
});

test('PostgreSQL shared newsroom health observes real handoffs without changing state', { skip: !database }, async (t) => {
  const now = new Date('2026-09-22T18:00:00Z');
  const env = { CREN_CLOUD_IMPORT_ENABLED: 'true', CREN_EDITORIAL_CORRECTIONS_ENABLED: 'false' };
  const health = () => loadNewsroomHealth(sql, { now, env });
  await query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()');
  let sequence = 0;
  async function importRun(status: string, results: unknown[] = [], at = '2026-09-22T17:55:00Z') {
    const id = `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;
    await sql`INSERT INTO cren_cloud_import_runs(id,status,results,started_at,completed_at)
      VALUES (${id},${status},${JSON.stringify(results)}::jsonb,${at}::timestamptz,
        ${status === 'RUNNING' ? null : at}::timestamptz)`;
  }
  async function proof(id: string, status: string, version = 1, at = '2026-09-22T17:45:00Z') {
    await sql`INSERT INTO editorial_email_reviews(article_id,version,review_token,status,recipient_email,reply_address,candidate_hash,candidate,
      created_at,updated_at,published_at)
      VALUES (${id},${version},${`${id}-token-${version}`},${status},'owner@example.test','reply@example.test',${'a'.repeat(64)},'{}'::jsonb,
        ${at}::timestamptz,${at}::timestamptz,${status === 'PUBLISHED' ? at : null}::timestamptz)`;
  }
  async function event(id: string, decision: string, version = 1, at = '2026-09-22T17:45:00Z') {
    const email = `health-event-${++sequence}`;
    await sql`INSERT INTO editorial_email_events(email_id,webhook_id,article_id,version,sender,reply_text,decision,received_at,created_at)
      VALUES (${email},${`webhook-${email}`},${id},${version},'owner@example.test','PRIVATE_REPLY_DO_NOT_RETURN',${decision},${at}::timestamptz,${at}::timestamptz)`;
    return email;
  }
  async function draft(id: string, status = 'AWAITING_REPLY') {
    await sql`INSERT INTO articles(id,status,created_at,updated_at) VALUES (${id},'draft','2026-08-01T00:00:00Z','2026-09-22T17:45:00Z')`;
    await sql`INSERT INTO editorial_review_jobs(article_id,status,updated_at) VALUES (${id},'READY_FOR_REVIEW','2026-09-22T17:45:00Z')`;
    if (status !== 'NO_PROOF') await proof(id, status);
  }
  async function seed() {
    await query('TRUNCATE articles, article_image_jobs, article_image_fingerprints, newsroom_runs, cren_cloud_import_runs CASCADE');
    await sql`INSERT INTO newsroom_runs(run_id,source,status,story_result,started_at,completed_at)
      VALUES ('health-run','fixture','COMPLETED','NO_QUALIFYING_STORY','2026-09-22T17:00:00Z','2026-09-22T17:30:00Z')`;
    await sql`INSERT INTO articles(id,status,created_at,updated_at) VALUES ('health-live','live','2026-08-01T00:00:00Z','2026-09-22T17:45:00Z')`;
    await proof('health-live', 'PUBLISHED', 1, '2026-09-22T17:00:00Z');
    await importRun('NO_ARTIFACTS');
  }
  await t.test('old article published today is fresh; image-only updates cannot refresh an old publication', async () => {
    await seed(); const current = await health();
    assert.equal(current.ok, true); assert.equal(current.metrics.lastPublicationAgeHours, 1);
    await sql`UPDATE editorial_email_reviews SET published_at='2026-09-10T17:00:00Z' WHERE article_id='health-live'`;
    await sql`UPDATE articles SET image_caption='Image-only cleanup',updated_at='2026-09-22T18:00:00Z' WHERE id='health-live'`;
    assert.ok((await health()).reasons.includes('PUBLICATION_STALE'));
    await sql`UPDATE editorial_email_reviews SET published_at=NULL WHERE article_id='health-live'`;
    const unknown = await health(); assert.equal(unknown.metrics.publicationClock, 'UNKNOWN');
    assert.equal(unknown.metrics.lastPublicationAt, null);
  });
  await t.test('later empty polls do not clear held paths, while exact path success resolves them', async () => {
    await seed(); const path = 'frontend/content/articles/2026-09-22-fixture.json';
    await importRun('BLOCKED', [{ path, status: 'HELD', code: 'IMPORT_CURRENT_WRITING_POLICY_REQUIRED' }], '2026-09-22T17:00:00Z');
    let report = await health(); assert.equal(report.stages.imports.lastStatus, 'NO_ARTIFACTS');
    assert.equal(report.stages.imports.blocked, 1); assert.ok(report.reasons.includes('CLOUD_IMPORT_BLOCKED'));
    await importRun('CHECKED', [{ path, status: 'ALREADY_STAGED' }], '2026-09-22T17:59:00Z');
    report = await health(); assert.equal(report.stages.imports.blocked, 0); assert.equal(report.ok, true);
    await importRun('FAILED', [], '2026-09-22T18:00:00Z'); assert.ok((await health()).reasons.includes('CLOUD_IMPORT_FAILED'));
  });
  await t.test('active blocked/failed images count, but historical live-image failures do not', async () => {
    await seed(); await draft('health-image', 'NO_PROOF');
    await sql`INSERT INTO article_image_jobs(article_id,status,last_error_code) VALUES ('health-live','FAILED','OLD_FAILURE'),('health-image','BLOCKED','SOURCE_RIGHTS_REQUIRED')`;
    let report = await health(); assert.equal(report.stages.images.blocked, 1); assert.equal(report.stages.images.failed, 0);
    await sql`UPDATE article_image_jobs SET status='FAILED' WHERE article_id='health-image'`;
    report = await health(); assert.equal(report.stages.images.failed, 1); assert.ok(report.reasons.includes('IMAGE_FAILED'));
    await sql`UPDATE article_image_jobs SET status='GENERATING',started_at='2026-09-22T17:40:00Z' WHERE article_id='health-image'`;
    assert.equal((await health()).stages.images.expiredLeases, 1);
  });
  await t.test('only latest proof/correction versions count and normal owner waiting does not become a stuck draft', async () => {
    await seed(); await draft('health-proof', 'SENDING');
    await sql`UPDATE editorial_email_reviews SET created_at='2026-09-20T17:00:00Z' WHERE article_id='health-proof'`;
    assert.ok((await health()).reasons.includes('PROOF_DELIVERY_RECONCILIATION_REQUIRED'));
    const oldEdit = await event('health-proof', 'CHANGES_REQUESTED');
    await sql`INSERT INTO editorial_correction_jobs(email_id,article_id,version,base_hash,status,error_code)
      VALUES (${oldEdit},'health-proof',1,${'a'.repeat(64)},'BLOCKED','HISTORICAL_FAILURE')`;
    await proof('health-proof', 'AWAITING_REPLY', 2);
    const report = await health(); assert.equal(report.ok, true); assert.equal(report.stages.proofs.sending, 0);
    assert.equal(report.stages.corrections.blocked, 0); assert.equal(report.metrics.actionableDraftCount, 0);
    assert.deepEqual(report.notices, ['AWAITING_OWNER_REVIEW']);
  });
  await t.test('manual corrections, missing receipt handoffs, expired leases and reproof work remain visible', async () => {
    await seed(); await draft('health-edit', 'CHANGES_REQUESTED');
    const email = await event('health-edit', 'CHANGES_REQUESTED');
    let report = await health(); assert.equal(report.stages.corrections.missingJobs, 1);
    assert.equal(report.stages.corrections.manualRequired, 1); assert.ok(report.notices.includes('MANUAL_CORRECTION_REQUIRED'));
    await sql`INSERT INTO editorial_correction_jobs(email_id,article_id,version,base_hash,status,created_at,updated_at)
      VALUES (${email},'health-edit',1,${'a'.repeat(64)},'QUEUED','2026-09-22T17:45:00Z','2026-09-22T17:45:00Z')`;
    report = await health(); assert.equal(report.stages.corrections.missingJobs, 0); assert.equal(report.stages.corrections.pending, 1);
    await sql`UPDATE editorial_correction_jobs SET status='RUNNING',lease_until='2026-09-22T17:59:00Z' WHERE email_id=${email}`;
    assert.ok((await health()).reasons.includes('CORRECTION_STUCK'));
    await sql`UPDATE editorial_correction_jobs SET status='READY_FOR_PROOF',lease_until=NULL WHERE email_id=${email}`;
    report = await health(); assert.equal(report.stages.proofs.pending, 1); assert.equal(report.stages.corrections.manualRequired, 0);
    await sql`UPDATE editorial_correction_jobs SET status='BLOCKED',error_code='NEEDS_REPORTING' WHERE email_id=${email}`;
    assert.ok((await health()).reasons.includes('CORRECTION_BLOCKED'));
  });
  await t.test('publication processing, blocked approvals and post-publication bookkeeping errors are distinct', async () => {
    await seed(); await draft('health-approval');
    const email = await event('health-approval', 'APPROVED');
    let report = await health(); assert.equal(report.stages.publication.pending, 1);
    await sql`INSERT INTO editorial_email_publication_checks(email_id,status,error_code) VALUES (${email},'BLOCKED','APPROVAL_IMAGE_FETCH_TIMEOUT')`;
    report = await health(); assert.equal(report.stages.publication.pending, 0); assert.equal(report.stages.publication.blocked, 1);
    await proof('health-approval', 'AWAITING_REPLY', 2);
    assert.equal((await health()).stages.publication.blocked, 0);
    const publishedEmail = await event('health-live', 'APPROVED');
    await sql`INSERT INTO editorial_email_publications(email_id,article_id,version,candidate_hash,sender,authentication,policy_version,published_at)
      VALUES (${publishedEmail},'health-live',1,${'a'.repeat(64)},'owner@example.test','{}'::jsonb,'fixture','2026-09-22T17:50:00Z')`;
    await sql`INSERT INTO editorial_email_publication_checks(email_id,status,error_code)
      VALUES (${publishedEmail},'PUBLISHED','EDITORIAL_PUBLICATION_BOOKKEEPING_RETRY')`;
    report = await health(); assert.equal(report.metrics.lastPublicationAgeHours, 0.2);
    assert.ok(report.reasons.includes('PUBLICATION_BOOKKEEPING_FAILED'));
    await sql`UPDATE editorial_email_publication_checks SET error_code=NULL WHERE email_id=${publishedEmail}`;
    assert.equal((await health()).stages.publication.bookkeepingFailures, 0);
  });
  await t.test('collection is read-only and does not expose owner reply text or receipt credentials', async () => {
    await seed(); await draft('health-readonly', 'CHANGES_REQUESTED'); await event('health-readonly', 'CHANGES_REQUESTED');
    const snapshot = () => query(`SELECT jsonb_build_object('articles',(SELECT jsonb_agg(a) FROM articles a),
      'proofs',(SELECT jsonb_agg(p) FROM editorial_email_reviews p),'events',(SELECT jsonb_agg(e) FROM editorial_email_events e),
      'imports',(SELECT jsonb_agg(i) FROM cren_cloud_import_runs i),'runs',(SELECT jsonb_agg(r) FROM newsroom_runs r)) AS snapshot`);
    const before = await snapshot(); const report = await health();
    assert.deepEqual(await snapshot(), before); assert.doesNotMatch(JSON.stringify(report), /PRIVATE_REPLY_DO_NOT_RETURN|owner@example|review_token/);
  });
});
