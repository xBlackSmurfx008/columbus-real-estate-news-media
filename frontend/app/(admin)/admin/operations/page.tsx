'use client';

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import type { NewsroomHealthReport } from '@/scripts/newsroom-run-policy.mjs';

type Snapshot = {
  scheduledHeartbeatHealthy: boolean; counts: Record<string, number>; crm: { enabled: boolean; reason: string | null; acquisition: string };
  newsroomHealth: NewsroomHealthReport;
  jobs: { kind: string; status: string; count: number }[];
  outbox: { pipeline: string; status: string; count: number }[];
  intake: { pipeline: string; status: string; count: number }[];
  latestJobs: { id: string; kind: string; status: string; last_error: string | null;
    review_report?: { notice?: string; plannedTasks?: { tasks?: string[] } } | null }[];
};

export default function OperationsPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/admin/agent-control-tower', { credentials: 'include' }).then(async response => {
      if (!response.ok) throw new Error('Operations data unavailable. Sign in and verify the additive migration.');
      setData(await response.json());
    }).catch(error => setError(error.message));
  }, []);
  return <div className="flex min-h-screen bg-gray-50"><AdminSidebar /><main className="flex-1 p-8">
    <h1 className="text-2xl font-bold">Operations control tower</h1>
    <p className="my-4">Read-only oversight. Marketing sends and the legacy in-memory pilot remain disabled. Completed review jobs are reports, not completed newsroom or revenue work.</p>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p>Loading durable operations…</p>}
    {data && <>
      <p>Scheduled heartbeat: {data.scheduledHeartbeatHealthy ? 'Current' : 'Missing or stale'}</p>
      <h2 className="mt-6 text-xl font-semibold">Newsroom handoff health</h2>
      <p>{data.newsroomHealth.ok ? 'No current handoff failures' : 'Action required'} — independent of scheduler heartbeat.</p>
      <p>Last audited publication: {data.newsroomHealth.metrics.lastPublicationAt
        ? String(data.newsroomHealth.metrics.lastPublicationAt) : 'Unknown; no publication receipt'}</p>
      <ul>{data.newsroomHealth.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      <ul>{data.newsroomHealth.notices.map(notice => <li key={notice}>{notice}</li>)}</ul>
      <ul>{Object.entries(data.newsroomHealth.stages).map(([name, stage]) => <li key={name}>
        {name}: {stage.pending} pending, {stage.blocked ?? 0} blocked, {stage.failed ?? 0} failed
        {stage.awaitingOwner ? `; ${stage.awaitingOwner} awaiting owner review` : ''}
        {stage.manualRequired ? `; ${stage.manualRequired} requiring supervised correction` : ''}
        {stage.bookkeepingFailures ? `; ${stage.bookkeepingFailures} bookkeeping failures` : ''}
        {stage.problems?.length ? <ul>{stage.problems.map((problem, index) =>
          <li key={index}>{problem.articleId ?? problem.path ?? name}: {problem.code}</li>)}</ul> : null}
      </li>)}</ul>
      <p>CRM media sync: {data.crm.enabled ? 'Configured' : data.crm.reason}. Acquisition delivery: blocked until a separated receiver is verified.</p>
      <h2 className="mt-6 text-xl font-semibold">Job queues</h2>
      <ul>{data.jobs.map(row => <li key={`${row.kind}:${row.status}`}>{row.kind} — {row.status}: {row.count}</li>)}</ul>
      <h2 className="mt-6 text-xl font-semibold">CRM deliveries by business</h2>
      <ul>{data.outbox.map(row => <li key={`${row.pipeline}:${row.status}`}>{row.pipeline} — {row.status}: {row.count}</li>)}</ul>
      <h2 className="mt-6 text-xl font-semibold">Intake by business and verification</h2>
      <ul>{data.intake.map(row => <li key={`${row.pipeline}:${row.status}`}>{row.pipeline} — {row.status}: {row.count}</li>)}</ul>
      <h2 className="mt-6 text-xl font-semibold">Recent work and failures</h2>
      <ul>{data.latestJobs.map(row => <li key={row.id}>{row.kind} — {row.status}{row.last_error ? ` (${row.last_error})` : ''}
        {row.review_report && <details><summary>Review report</summary><p>{row.review_report.notice}</p>
          <ul>{row.review_report.plannedTasks?.tasks?.map(task => <li key={task}>{task}</li>)}</ul>
        </details>}
      </li>)}</ul>
    </>}
  </main></div>;
}
