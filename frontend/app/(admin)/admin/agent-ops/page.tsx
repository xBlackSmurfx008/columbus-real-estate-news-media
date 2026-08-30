'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

type Approval = {
  id: number;
  action_class: string;
  risk: string;
  required_role: string;
  status: string;
  payload_json: unknown;
  expires_at: string;
  agent_name: string;
  workflow_name: string;
  agent_version: string;
  trace_id?: string;
  initiated_by: string;
};

type Snapshot = {
  counts: Record<string, number>;
  runs: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  incidents: Array<Record<string, unknown>>;
};

const countLabels: Array<[string, string]> = [
  ['pendingApprovals', 'Pending approvals'],
  ['overdueTasks', 'Overdue tasks'],
  ['openIncidents', 'Open incidents'],
  ['blockedCampaigns', 'Blocked campaigns'],
  ['campaignsMissingTracking', 'Missing tracking'],
  ['claimsNeedingProof', 'Claims needing proof'],
];

export default function AgentOpsPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [towerResponse, approvalResponse] = await Promise.all([
        fetch('/api/agent/control-tower', { credentials: 'include' }),
        fetch('/api/agent/approvals', { credentials: 'include' }),
      ]);
      const tower = await towerResponse.json();
      const approvalData = await approvalResponse.json();
      if (!towerResponse.ok) throw new Error(tower.error || 'Control Tower unavailable.');
      if (!approvalResponse.ok) throw new Error(approvalData.error || 'Approval queue unavailable.');
      setSnapshot(tower.snapshot);
      setApprovals(approvalData.approvals || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Agent operations unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const start = async () => { await load(); };
    void start();
  }, [load]);

  const runScan = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/agent/control-tower', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Control Tower scan failed.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Control Tower scan failed.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (approvalId: number, action: 'approved' | 'rejected' | 'paused' | 'revision_requested' | 'resume') => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/agent/approvals', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'resume'
          ? { action, approvalId: String(approvalId), reason: 'Resumed from Agent Ops.' }
          : { action: 'decide', approvalId: String(approvalId), decision: action, reason: `Decision from Agent Ops: ${action}.` }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Approval update failed.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Approval update failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="ml-64 flex-1 overflow-auto p-8">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-red-600">Operations</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">Agent Ops</h1>
            <p className="mt-2 max-w-2xl text-gray-600">Review durable runs, approvals, tasks, and incidents before any external action.</p>
          </div>
          <button type="button" onClick={runScan} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Working...' : 'Run Control Tower scan'}
          </button>
        </div>

        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {countLabels.map(([key, label]) => (
            <div key={key} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{loading ? '...' : snapshot?.counts?.[key] ?? 0}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4"><h2 className="font-semibold text-gray-900">Approval queue</h2></div>
          <div className="divide-y divide-gray-100">
            {!loading && approvals.length === 0 && <p className="px-6 py-8 text-sm text-gray-500">No pending approvals.</p>}
            {approvals.map((approval) => (
              <div key={approval.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase">
                    <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">{approval.action_class}</span>
                    <span className="rounded bg-amber-100 px-2 py-1 text-amber-800">{approval.risk} risk</span>
                    <span className="rounded bg-blue-100 px-2 py-1 text-blue-800">{approval.required_role}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Approval #{approval.id} expires {new Date(approval.expires_at).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-gray-500">{approval.agent_name} · {approval.workflow_name} · v{approval.agent_version} · trace {approval.trace_id || 'none'} · initiated by {approval.initiated_by}</p>
                  <pre className="mt-3 max-w-3xl overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-700">{JSON.stringify(approval.payload_json, null, 2)}</pre>
                </div>
                <div className="flex shrink-0 gap-2">
                  {approval.status === 'paused' ? (
                    <button type="button" disabled={busy} onClick={() => decide(approval.id, 'resume')} className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Resume</button>
                  ) : (
                    <>
                      <button type="button" disabled={busy} onClick={() => decide(approval.id, 'approved')} className="rounded bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve</button>
                      <button type="button" disabled={busy} onClick={() => decide(approval.id, 'paused')} className="rounded bg-amber-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Pause</button>
                      <button type="button" disabled={busy} onClick={() => decide(approval.id, 'revision_requested')} className="rounded bg-purple-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Request revision</button>
                    </>
                  )}
                  <button type="button" disabled={busy} onClick={() => decide(approval.id, 'rejected')} className="rounded bg-gray-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-gray-900">Recent runs</h2><div className="mt-4 space-y-3">{snapshot?.runs?.slice(0, 8).map((run) => <div key={String(run.id)} className="flex justify-between border-b border-gray-100 pb-2 text-sm"><span className="text-gray-700">{String(run.workflow_name)}</span><span className="font-medium text-gray-500">{String(run.status)}</span></div>)}</div></div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-gray-900">Incidents and tasks</h2><div className="mt-4 space-y-3">{snapshot?.incidents?.slice(0, 4).map((incident) => <div key={String(incident.id)} className="border-b border-gray-100 pb-2 text-sm"><span className="font-semibold text-red-700">{String(incident.severity)}</span> <span className="text-gray-700">{String(incident.error_code)}</span></div>)}{snapshot?.tasks?.slice(0, 4).map((task) => <div key={String(task.id)} className="border-b border-gray-100 pb-2 text-sm"><span className="font-semibold text-gray-700">{String(task.priority)}</span> <span className="text-gray-700">{String(task.kind)}</span></div>)}{!snapshot?.incidents?.length && !snapshot?.tasks?.length && <p className="text-sm text-gray-500">No open incidents or queued tasks.</p>}</div></div>
        </section>
      </main>
    </div>
  );
}
