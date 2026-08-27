'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

type Lead = {
  id: number;
  persona: string;
  name: string;
  email: string;
  phone: string | null;
  area: string | null;
  details: Record<string, string>;
  source: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

type SimpleRow = Record<string, string | number | boolean | null>;

const TABS = ['Leads', 'Subscribers', 'Contacts', 'Members'] as const;
type Tab = (typeof TABS)[number];

const PERSONA_LABELS: Record<string, string> = {
  fsbo_seller: 'FSBO Seller',
  investor_seller: 'Investor Selling',
  capital_partner: 'Capital Partner',
  renter: 'Renter',
};

const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-gray-200 text-gray-600',
};

export default function AdminLeadsPage() {
  const [tab, setTab] = useState<Tab>('Leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [subscribers, setSubscribers] = useState<SimpleRow[]>([]);
  const [contacts, setContacts] = useState<SimpleRow[]>([]);
  const [members, setMembers] = useState<SimpleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [personaFilter, setPersonaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/leads', { credentials: 'include' });
      const data = await res.json();
      setLeads(data.leads || []);
      setSubscribers(data.subscribers || []);
      setContacts(data.contacts || []);
      setMembers(data.members || []);
    } catch {
      showToast('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // This effect synchronizes the client admin view with the remote API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAll();
  }, [fetchAll]);

  async function updateLead(id: number, patch: { status?: string; notes?: string }) {
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...updated } : l)));
      showToast('Lead updated');
    } catch {
      showToast('Update failed');
    }
  }

  const filteredLeads = leads.filter(
    (l) => (personaFilter === 'all' || l.persona === personaFilter) && (statusFilter === 'all' || l.status === statusFilter)
  );

  const newCount = leads.filter((l) => l.status === 'new').length;

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <main className="flex-1 ml-64 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-30 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Leads {newCount > 0 && <span className="ml-2 rounded-full bg-red-600 px-2.5 py-0.5 text-sm text-white align-middle">{newCount} new</span>}
          </h1>
        </div>

        <div className="p-8">
          {/* Tabs */}
          <div className="mb-6 flex gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tab === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {t}{' '}
                <span className="opacity-60">
                  ({t === 'Leads' ? leads.length : t === 'Subscribers' ? subscribers.length : t === 'Contacts' ? contacts.length : members.length})
                </span>
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="text-gray-500">Loading…</p>
          ) : tab === 'Leads' ? (
            <>
              <div className="mb-4 flex gap-3">
                <select value={personaFilter} onChange={(e) => setPersonaFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="all">All personas</option>
                  {Object.entries(PERSONA_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="all">All statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              {filteredLeads.length === 0 ? (
                <p className="text-gray-500">No leads match.</p>
              ) : (
                <div className="space-y-3">
                  {filteredLeads.map((lead) => (
                    <div key={lead.id} className="rounded-xl border border-gray-200 bg-white p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                          {PERSONA_LABELS[lead.persona] ?? lead.persona}
                        </span>
                        <span className="font-semibold text-gray-900">{lead.name}</span>
                        <a href={`mailto:${lead.email}`} className="text-sm text-blue-700 underline">
                          {lead.email}
                        </a>
                        {lead.phone && <span className="text-sm text-gray-600">{lead.phone}</span>}
                        {lead.area && <span className="text-sm text-gray-500">📍 {lead.area}</span>}
                        <span className="ml-auto text-xs text-gray-400">{new Date(lead.created_at).toLocaleString()}</span>
                        <select
                          value={lead.status}
                          onChange={(e) => updateLead(lead.id, { status: e.target.value })}
                          className={`rounded-full px-3 py-1 text-xs font-semibold border-0 ${STATUS_COLORS[lead.status] ?? 'bg-gray-100'}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {Object.keys(lead.details ?? {}).length > 0 && (
                        <div className="mt-3 grid gap-1 text-sm text-gray-700 md:grid-cols-2">
                          {Object.entries(lead.details).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-gray-400">{k.replace(/_/g, ' ')}:</span> {v}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3">
                        {expandedId === lead.id ? (
                          <div className="flex gap-2">
                            <input
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              placeholder="Add a note…"
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                            />
                            <button
                              onClick={() => {
                                updateLead(lead.id, { notes: noteDraft });
                                setExpandedId(null);
                              }}
                              className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setExpandedId(lead.id);
                              setNoteDraft(lead.notes ?? '');
                            }}
                            className="text-sm text-gray-500 underline"
                          >
                            {lead.notes ? `Note: ${lead.notes.slice(0, 80)}${lead.notes.length > 80 ? '…' : ''} (edit)` : '+ Add note'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <SimpleTable
              rows={tab === 'Subscribers' ? subscribers : tab === 'Contacts' ? contacts : members}
            />
          )}
        </div>

        {toast && (
          <div className="fixed bottom-6 right-6 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
        )}
      </main>
    </div>
  );
}

function SimpleTable({ rows }: { rows: SimpleRow[] }) {
  if (rows.length === 0) return <p className="text-gray-500">Nothing here yet.</p>;
  const cols = Object.keys(rows[0]).filter((c) => !['id', 'stripe_customer_id', 'tier_started_at'].includes(c));
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-4 py-3">
                {c.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              {cols.map((c) => (
                <td key={c} className="px-4 py-3 text-gray-700">
                  {c.includes('_at') && r[c] ? new Date(String(r[c])).toLocaleDateString() : String(r[c] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
