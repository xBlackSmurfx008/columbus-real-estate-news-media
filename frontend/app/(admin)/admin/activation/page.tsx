"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import {
  ANALYTICS_STORAGE_KEY,
  sanitizeAnalyticsPayload,
  summarizeActivationEvents,
  type StoredAreaPageView,
  type StoredActivationEvent,
} from "@/lib/activation-analytics";

type RemoteState =
  | { status: "loading"; message: string }
  | { status: "ready"; message: string; events: StoredActivationEvent[]; areaPageViews: StoredAreaPageView[] }
  | { status: "local-only"; message: string; events: StoredActivationEvent[]; areaPageViews: StoredAreaPageView[] };

const EMPTY_AREA_PAGE_VIEWS: StoredAreaPageView[] = [];

function readLocalEvents(): StoredActivationEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((event): StoredActivationEvent | null => {
        if (!event || typeof event !== "object") return null;
        return {
          name: typeof event.name === "string" ? event.name : "",
          path: typeof event.path === "string" ? event.path : "/",
          payload: sanitizeAnalyticsPayload(event.payload),
          timestamp: typeof event.timestamp === "string" ? event.timestamp : "",
        };
      })
      .filter((event): event is StoredActivationEvent => Boolean(event?.name && event.timestamp));
  } catch {
    return [];
  }
}

function StatCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-sm text-gray-600">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {note && <p className="mt-2 text-xs text-gray-500">{note}</p>}
    </div>
  );
}

function ValueList({ title, values }: { title: string; values: Array<{ label: string; count: number }> }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {values.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No events yet.</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {values.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span className="truncate text-gray-700">{item.label}</span>
              <strong className="text-gray-900">{item.count}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AdminActivationPage() {
  const [localEvents, setLocalEvents] = useState<StoredActivationEvent[]>(() => readLocalEvents());
  const [remoteState, setRemoteState] = useState<RemoteState>({
    status: "loading",
    message: "Loading production activation events...",
  });

  const loadRemote = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activation", { credentials: "include" });
      if (!res.ok) {
        setRemoteState({
          status: "local-only",
          message: `Production analytics unavailable (${res.status}). Showing this browser's local QA events.`,
          events: [],
          areaPageViews: [],
        });
        return;
      }
      const data = await res.json();
      setRemoteState({
        status: "ready",
        message: `Production activation events, last ${data.windowDays ?? 30} days.`,
        events: Array.isArray(data.events) ? data.events : [],
        areaPageViews: Array.isArray(data.areaPageViews) ? data.areaPageViews : [],
      });
    } catch {
      setRemoteState({
        status: "local-only",
        message: "Production analytics unavailable. Showing this browser's local QA events.",
        events: [],
        areaPageViews: [],
      });
    }
  }, []);

  useEffect(() => {
    // This effect synchronizes the client admin view with the remote API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRemote();
  }, [loadRemote]);

  const activeEvents = remoteState.status === "ready" ? remoteState.events : localEvents;
  const activeAreaPageViews = remoteState.status === "ready" ? remoteState.areaPageViews : EMPTY_AREA_PAGE_VIEWS;
  const summary = useMemo(() => summarizeActivationEvents(activeEvents, activeAreaPageViews), [activeAreaPageViews, activeEvents]);

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <main className="ml-64 flex-1 overflow-auto">
        <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Activation Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">{remoteState.message}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLocalEvents(readLocalEvents());
                void loadRemote();
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Activation events" value={summary.totalEvents} note="Whitelisted conversion events" />
            <StatCard label="Area follows" value={summary.areaFollows} note="Started follow forms" />
            <StatCard label="Preferences saved" value={summary.preferencesSaved} note="Subscribe and follow saves" />
            <StatCard label="Zero-result searches" value={summary.zeroResultSearches} note="Search demand gaps" />
            <StatCard label="Form submissions" value={summary.formSubmissions} note="Lead and contact forms" />
            <StatCard
              label="Checklist completion"
              value={summary.checklistCompletionRate === null ? "n/a" : `${summary.checklistCompletionRate}%`}
              note={`${summary.checklistCompletions} complete / ${summary.checklistStarts} starts`}
            />
          </div>

          <section className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Event mix</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summary.eventCounts.map((event) => (
                <div key={event.name} className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">{event.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{event.count}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <ValueList title="Top areas and preferences" values={summary.topAreas} />
            <ValueList title="Top sources" values={summary.topSources} />
            <ValueList title="Form submissions by source" values={summary.topFormSources} />
            <ValueList title="Form submissions by persona" values={summary.topFormPersonas} />
            <ValueList title="Zero-result terms" values={summary.topSearchTerms} />
            <ValueList title="Zero-result intents" values={summary.topSearchIntents} />
          </div>

          <section className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Area hub performance</h2>
            {summary.areaHubPerformance.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No area hub traffic or follow activity in this window yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Area</th>
                      <th className="px-3 py-2">Views</th>
                      <th className="px-3 py-2">Visitors</th>
                      <th className="px-3 py-2">Follows</th>
                      <th className="px-3 py-2">Preferences</th>
                      <th className="px-3 py-2">Follow rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.areaHubPerformance.map((area) => (
                      <tr key={area.area_slug} className="border-b border-gray-100 last:border-0">
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{area.area_name}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">{area.views}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">{area.visitors}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">{area.follows}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">{area.preferences}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                          {area.followRate === null ? "n/a" : `${area.followRate}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Recent activation events</h2>
            {summary.recentEvents.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No activation events have been captured in this browser or production window yet.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Event</th>
                      <th className="px-3 py-2">Path</th>
                      <th className="px-3 py-2">Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentEvents.map((event, index) => (
                      <tr key={`${event.timestamp}-${event.name}-${index}`} className="border-b border-gray-100 last:border-0">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">{new Date(event.timestamp).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{event.name}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">{event.path}</td>
                        <td className="px-3 py-2 text-gray-600">{JSON.stringify(event.payload)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
