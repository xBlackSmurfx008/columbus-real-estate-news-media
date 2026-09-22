import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createEditorialRevisionAdapter, runEditorialCorrection, sweepEditorialProofs } from '@/lib/editorial-correction-worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

/** Bounded draft-only worker; never invokes publication. Disabled until approved activation. */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const correct = process.env.CREN_EDITORIAL_CORRECTIONS_ENABLED === 'true';
  const send = process.env.CREN_EDITORIAL_PROOFS_ENABLED === 'true';
  if (!correct && !send) return NextResponse.json({ ok: false, error: 'EDITORIAL_WORKER_DISABLED' }, { status: 503 });
  if (correct && (!process.env.AI_GATEWAY_API_KEY || !process.env.CREN_EDITORIAL_REVISION_MODEL)) {
    return NextResponse.json({ ok: false, error: 'REVISION_PROVIDER_NOT_CONFIGURED' }, { status: 503 });
  }
  if (send && (!process.env.CREN_EDITOR_REVIEW_EMAIL || !process.env.RESEND_API_KEY)) {
    return NextResponse.json({ ok: false, error: 'PROOF_DELIVERY_NOT_CONFIGURED' }, { status: 503 });
  }
  try {
    const sql = getDb();
    const correction = correct ? await runEditorialCorrection(sql, {
      revise: createEditorialRevisionAdapter({ apiKey: process.env.AI_GATEWAY_API_KEY!, model: process.env.CREN_EDITORIAL_REVISION_MODEL! }),
    }) : { processed: false, disabled: true };
    const proofs = await sweepEditorialProofs(sql, { send, limit: 2 });
    // Avoid exposing draft text/diffs or provider errors through a scheduler response.
    const blocked = 'status' in correction && correction.status === 'BLOCKED';
    const proofFailures = proofs.filter((proof) => 'error' in proof || ('acceptedByProvider' in proof && !proof.acceptedByProvider)).length;
    return NextResponse.json({ ok: !blocked && proofFailures === 0,
      correction: { processed: correction.processed, ...('status' in correction ? { status: correction.status } : {}) },
      proofs: { checked: proofs.length, failures: proofFailures, sendEnabled: send }, published: 0,
    }, { status: blocked || proofFailures ? 503 : 200 });
  } catch {
    return NextResponse.json({ ok: false, error: 'EDITORIAL_WORKER_FAILED', published: 0 }, { status: 503 });
  }
}
