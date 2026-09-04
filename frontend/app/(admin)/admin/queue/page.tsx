'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import {
  DISPOSITIONS,
  DISPOSITION_LABELS,
  INQUIRY_TYPES,
  INQUIRY_TYPE_LABELS,
  RESPONSE_CHANNELS,
  SLA_STATE_LABELS,
  slaSnapshot,
  type Disposition,
  type InquiryOwner,
  type SlaState,
} from '@/lib/inquiry-queue';

type QueueRow = {
  id: number;
  source_table: string;
  source_id: string;
  inquiry_type: string;
  persona: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  area: string | null;
  source: string | null;
  source_route: string | null;
  summary: string | null;
  owner_key: string;
  status: string;
  received_at: string;
  sla_due_at: string;
  sla_warn_at: string;
  first_response_at: string | null;
  first_response_channel: string | null;
  first_response_by: string | null;
  disposition: string;
  disposition_note: string | null;
  is_test: boolean;
  notes: string | null;
};

type AlertRow = {
  id: number;
  alert_key: string;
  kind: string;
  queue_id: number | null;
  message: string;
  delivery: string;
  delivery_error: string | null;
  created_at: string;
};

type Stats = {
  open_count?: number;
  breached_count?: number;
  due_soon_count?: number;
  responded_count?: number;
  responded_in_sla_count?: number;
  total_count?: number;
};

const STATE_STYLES: Record<SlaState, { row: string; pill: string }> = {
  breached: { row: 'border-l-4 border-l-red-600 bg-red-50', pill: 'bg-red-600 text-white' },
  due_soon: { row: 'border-l-4 border-l-amber-500 bg-amber-50', pill: 'bg-amber-500 text-white' },
  on_track: { row: 'border-l-4 border-l-emerald-500', pill: 'bg-emerald-100 text-emerald-800' },
  met: { row: 'border-l-4 border-l-gray-300', pill: 'bg-gray-100 text-gray-700' },
  met_late: { row: 'border-l-4 border-l-gray-400', pill: 'bg-orange-100 text-orange-800' },
};

function StatCard({ label, value, note, tone }: { label: string; value: string | number; note?: string; tone?: 'alert' | 'warn' }) {
  const toneClass = tone === 'alert' ? 'text-red-700' : tone === 'warn' ? 'text-amber-700' : 'text-gray-900';
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${toneClass}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
    </div>
  );
}

export default function AdminQueuePage() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [owners, setOwners] = useState<InquiryOwner[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [includeTest, setIncludeTest] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [openOnly, setOpenOnly] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [draftChannel, setDraftChannel] = useState<string>('email');
  const [draftDisposition, setDraftDisposition] = useState<Disposition>('qualified');
  const [tick, setTick] = useState(() => Date.now());

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (includeTest) params.set('includeTest', '1');
      const res = await fetch(`/api/admin/inquiry-queue?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load the queue');
      setRows(data.rows || []);
      setOwners(data.owners || []);
      setAlerts(data.alerts || []);
      setStats(data.stats || {});
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load the queue');
    } finally {
      setIsLoading(false);
    }
  }, [includeTest]);

  useEffect(() => {
    // Synchronizes the client queue view with the protected admin API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    void load();
  }, [load]);

  // Keeps the countdown honest without re-fetching.
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const now = useMemo(() => new Date(tick), [tick]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (typeFilter !== 'all' && row.inquiry_type !== typeFilter) return false;
      if (openOnly && row.first_response_at) return false;
      return true;
    });
  }, [rows, typeFilter, openOnly]);

  const patch = useCallback(async (id: number, payload: Record<string, unknown>, successMessage: string) => {
    try {
      const res = await fetch(`/api/admin/inquiry-queue/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      showToast(successMessage);
      setDraftNote('');
      await load();
    } catch (patchError) {
      showToast(patchError instanceof Error ? patchError.message : 'Update failed');
    }
  }, [load, showToast]);

  const onTimeRate = stats.responded_count
    ? Math.round(((stats.responded_in_sla_count ?? 0) / stats.responded_count) * 100)
    : null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <main className="ml-64 flex-1 overflow-auto">
        <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Response Queue</h1>
              <p className="mt-1 text-sm text-gray-600">
                Every inbound inquiry — seller, rental, capital, advertiser, directory — with an owner and a
                one-business-day SLA timer. Business hours are Mon–Fri, 9am–6pm ET, holidays excluded.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-6 p-8">
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          {alerts.length > 0 && (
            <section className="rounded-lg border border-amber-400 bg-amber-50 p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900">
                {alerts.length} unacknowledged SLA alert{alerts.length === 1 ? '' : 's'}
              </h2>
              <p className="mt-1 text-xs text-amber-800">
                These are raised by the scheduled sweep. When Telegram is not configured they land here only — this
                banner is the fallback path to a human.
              </p>
              <ul className="mt-3 space-y-2">
                {alerts.slice(0, 8).map((alert) => (
                  <li key={alert.alert_key} className="rounded border border-amber-300 bg-white p-3 text-xs text-gray-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold uppercase text-amber-900">{alert.kind.replace('_', ' ')}</span>
                      <span className="text-gray-500">
                        delivery: {alert.delivery}
                        {alert.delivery_error ? ` (${alert.delivery_error})` : ''} · {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap font-sans">{alert.message}</pre>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Open" value={stats.open_count ?? 0} note="Awaiting first response" />
            <StatCard label="Due soon" value={stats.due_soon_count ?? 0} note="Inside the warning window" tone="warn" />
            <StatCard label="Breached" value={stats.breached_count ?? 0} note="Past the promise" tone="alert" />
            <StatCard label="Answered" value={stats.responded_count ?? 0} note="First response recorded" />
            <StatCard
              label="On-time rate"
              value={onTimeRate === null ? '—' : `${onTimeRate}%`}
              note="Test records excluded"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
            <label className="text-sm text-gray-700">
              Type
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                {INQUIRY_TYPES.map((type) => (
                  <option key={type} value={type}>{INQUIRY_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={openOnly} onChange={(event) => setOpenOnly(event.target.checked)} />
              Only unanswered
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={includeTest} onChange={(event) => setIncludeTest(event.target.checked)} />
              Show internal test records
            </label>
            <span className="ml-auto text-xs text-gray-500">{visibleRows.length} shown</span>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-600">Loading queue…</p>
          ) : visibleRows.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
              Nothing in the queue for these filters.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleRows.map((row) => {
                const snapshot = slaSnapshot(row, now);
                const style = STATE_STYLES[snapshot.state];
                const isExpanded = expandedId === row.id;
                return (
                  <article key={row.id} className={`rounded-lg border border-gray-200 bg-white shadow-sm ${style.row}`}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${style.pill}`}>
                        {SLA_STATE_LABELS[snapshot.state]}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{snapshot.label}</span>
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {INQUIRY_TYPE_LABELS[row.inquiry_type as keyof typeof INQUIRY_TYPE_LABELS] ?? row.inquiry_type}
                      </span>
                      {row.is_test && (
                        <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">test record</span>
                      )}
                      <span className="text-sm text-gray-900">{row.name || 'Unnamed'}</span>
                      <span className="text-xs text-gray-500">{row.email}</span>
                      <span className="ml-auto text-xs text-gray-600">
                        owner <strong>{row.owner_key}</strong> · due {new Date(row.sla_due_at).toLocaleString()}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="space-y-4 border-t border-gray-200 px-4 py-4">
                        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          <div><dt className="text-xs uppercase text-gray-500">Received</dt><dd>{new Date(row.received_at).toLocaleString()}</dd></div>
                          <div><dt className="text-xs uppercase text-gray-500">SLA due</dt><dd>{new Date(row.sla_due_at).toLocaleString()}</dd></div>
                          <div><dt className="text-xs uppercase text-gray-500">First response</dt><dd>{row.first_response_at ? `${new Date(row.first_response_at).toLocaleString()} (${row.first_response_channel ?? 'n/a'}, ${row.first_response_by ?? 'unknown'})` : 'Not yet'}</dd></div>
                          <div><dt className="text-xs uppercase text-gray-500">Status</dt><dd>{row.status}</dd></div>
                          <div><dt className="text-xs uppercase text-gray-500">Disposition</dt><dd>{DISPOSITION_LABELS[row.disposition as Disposition] ?? row.disposition}</dd></div>
                          <div><dt className="text-xs uppercase text-gray-500">Source</dt><dd>{row.source_table}#{row.source_id} · {row.source || 'unknown'}</dd></div>
                          <div><dt className="text-xs uppercase text-gray-500">Phone</dt><dd>{row.phone || '—'}</dd></div>
                          <div><dt className="text-xs uppercase text-gray-500">Area</dt><dd>{row.area || '—'}</dd></div>
                          <div><dt className="text-xs uppercase text-gray-500">Response time</dt><dd>{snapshot.responseBusinessMinutes === null ? '—' : `${snapshot.responseBusinessMinutes} business minutes`}</dd></div>
                        </dl>

                        {row.summary && (
                          <p className="rounded bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">{row.summary}</p>
                        )}
                        {row.notes && (
                          <div>
                            <p className="text-xs uppercase text-gray-500">Notes</p>
                            <p className="whitespace-pre-wrap text-sm text-gray-800">{row.notes}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
                          <label className="text-sm text-gray-700">
                            Owner
                            <select
                              value={row.owner_key}
                              onChange={(event) => void patch(row.id, { ownerKey: event.target.value }, 'Owner reassigned')}
                              className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm"
                            >
                              {owners.map((owner) => (
                                <option key={owner.owner_key} value={owner.owner_key}>{owner.name}</option>
                              ))}
                              {!owners.some((owner) => owner.owner_key === row.owner_key) && (
                                <option value={row.owner_key}>{row.owner_key}</option>
                              )}
                            </select>
                          </label>

                          {!row.first_response_at && (
                            <>
                              <label className="text-sm text-gray-700">
                                Channel
                                <select
                                  value={draftChannel}
                                  onChange={(event) => setDraftChannel(event.target.value)}
                                  className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm"
                                >
                                  {RESPONSE_CHANNELS.map((channel) => (
                                    <option key={channel} value={channel}>{channel}</option>
                                  ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                onClick={() => void patch(
                                  row.id,
                                  { recordFirstResponse: true, channel: draftChannel, responseNote: draftNote || null },
                                  'First response recorded',
                                )}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                              >
                                Record first response
                              </button>
                            </>
                          )}

                          <label className="text-sm text-gray-700">
                            Disposition
                            <select
                              value={draftDisposition}
                              onChange={(event) => setDraftDisposition(event.target.value as Disposition)}
                              className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm"
                            >
                              {DISPOSITIONS.map((disposition) => (
                                <option key={disposition} value={disposition}>{DISPOSITION_LABELS[disposition]}</option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            onClick={() => void patch(
                              row.id,
                              { disposition: draftDisposition, dispositionNote: draftNote || null },
                              'Disposition saved',
                            )}
                            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                          >
                            Save disposition
                          </button>
                        </div>

                        <div className="flex flex-wrap items-end gap-3">
                          <label className="flex-1 text-sm text-gray-700">
                            Note (attached to the response or disposition you save next)
                            <input
                              type="text"
                              value={draftNote}
                              onChange={(event) => setDraftNote(event.target.value)}
                              placeholder="What was said, what happens next"
                              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => void patch(row.id, { note: draftNote }, 'Note added')}
                            disabled={!draftNote.trim()}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-40"
                          >
                            Add note only
                          </button>
                          <button
                            type="button"
                            onClick={() => void patch(row.id, { acknowledgeAlerts: true }, 'Alerts acknowledged')}
                            className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-medium text-amber-800"
                          >
                            Acknowledge alerts
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {toast && (
          <div className="fixed bottom-6 right-6 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">{toast}</div>
        )}
      </main>
    </div>
  );
}
