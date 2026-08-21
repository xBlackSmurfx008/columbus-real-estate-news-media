import { NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { crenNewsroomImagesWorkflow } from '@/workflows/newsroom-images';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const run = await start(crenNewsroomImagesWorkflow, []);
    return NextResponse.json({ ok: true, workflowRunId: run.runId ?? null });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'WORKFLOW_START_FAILED',
    }, { status: 500 });
  }
}

export const POST = GET;
