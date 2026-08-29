"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

type CommercialData = {
  generatedAt: string;
  counts: Record<string, number>;
  statusBreakdowns: Record<string, Record<string, number>>;
  businessProfiles: Record<string, unknown>[];
  apartmentProfiles: Record<string, unknown>[];
  profileClaims: Record<string, unknown>[];
  profileDisputes: Record<string, unknown>[];
  advertiserAccounts: Record<string, unknown>[];
  campaigns: Record<string, unknown>[];
  adAssets: Record<string, unknown>[];
  claimSubstantiation: Record<string, unknown>[];
  insertionOrders: Record<string, unknown>[];
  leadRoutes: Record<string, unknown>[];
  leadRecipients: Record<string, unknown>[];
};

const tabs = ["Queues", "Profiles", "Advertisers", "Lead Routing", "Reports"] as const;
type Tab = (typeof tabs)[number];

const statLabels = [
  ["openProfileClaims", "Open profile claims"],
  ["profileDisputes", "Profile disputes"],
  ["advertiserAccounts", "Advertiser accounts"],
  ["campaigns", "Campaigns"],
  ["campaignAssetsPendingReview", "Assets pending review"],
  ["claimSubstantiationNeeded", "Claims needing proof"],
] as const;

function formatCell(value: unknown) {
  if (value == null || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function StatusBreakdown({ title, breakdown }: { title: string; breakdown?: Record<string, number> }) {
  const entries = Object.entries(breakdown ?? {});
  if (entries.length === 0) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {entries.map(([status, count]) => (
          <span key={status} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
            {formatLabel(status)}: {count}
          </span>
        ))}
      </div>
    </div>
  );
}

function DataTable({ title, rows, columns }: { title: string; rows: Record<string, unknown>[]; columns: string[] }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {title} <span className="text-sm font-normal text-gray-500">({rows.length})</span>
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-500">No rows yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-4 py-3">{formatLabel(column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${formatCell(row.id)}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {columns.map((column) => (
                    <td key={column} className="max-w-[320px] truncate px-4 py-3 text-gray-700" title={formatCell(row[column])}>
                      {formatCell(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function CommercialAdminPage() {
  const [data, setData] = useState<CommercialData | null>(null);
  const [tab, setTab] = useState<Tab>("Queues");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/commercial", { credentials: "include" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Commercial data unavailable.");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commercial data unavailable.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // This effect synchronizes the client admin view with the remote API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  const report = useMemo(() => {
    if (!data) return null;
    return {
      reportType: "CREN commercial operations export",
      generatedAt: data.generatedAt,
      counts: data.counts,
      statusBreakdowns: data.statusBreakdowns,
      advertiserAccounts: data.advertiserAccounts,
      campaigns: data.campaigns,
      adAssets: data.adAssets,
      insertionOrders: data.insertionOrders,
      leadRoutes: data.leadRoutes,
      leadRecipients: data.leadRecipients,
    };
  }, [data]);

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cren-commercial-report-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <main className="ml-64 flex-1 overflow-auto">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Commercial Operations</h1>
            <p className="text-sm text-gray-600">Profile claims, advertiser intake, campaign approvals, lead routing, and reporting.</p>
          </div>
          <button
            type="button"
            onClick={downloadReport}
            disabled={!report}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Download report
          </button>
        </div>

        <div className="p-8">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading commercial queues...</p>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
          ) : data ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {statLabels.map(([key, label]) => (
                  <StatCard key={key} label={label} value={data.counts[key] ?? 0} />
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {tabs.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTab(item)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      tab === item ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {tab === "Queues" && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <StatusBreakdown title="Profile claim status" breakdown={data.statusBreakdowns.profileClaims} />
                    <StatusBreakdown title="Campaign status" breakdown={data.statusBreakdowns.campaigns} />
                  </div>
                  <DataTable title="Profile Claims" rows={data.profileClaims} columns={["id", "profile_type", "profile_id", "claimant_name", "claimant_email", "authority_type", "status", "created_at"]} />
                  <DataTable title="Disputes" rows={data.profileDisputes} columns={["id", "profile_type", "profile_id", "reporter_name", "issue_type", "status", "created_at"]} />
                  <DataTable title="Claims Needing Proof" rows={data.claimSubstantiation} columns={["id", "entity_type", "entity_id", "claim_text", "claim_type", "status", "created_at"]} />
                  <DataTable title="Ad Assets" rows={data.adAssets} columns={["id", "campaign_id", "asset_type", "headline", "review_status", "created_at"]} />
                </div>
              )}

              {tab === "Profiles" && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <StatusBreakdown title="Business profile status" breakdown={data.statusBreakdowns.businessProfiles} />
                    <StatusBreakdown title="Apartment profile status" breakdown={data.statusBreakdowns.apartmentProfiles} />
                  </div>
                  <DataTable title="Business Profiles" rows={data.businessProfiles} columns={["id", "display_name", "legal_name", "category", "status", "verification_label", "paid_status", "last_verified_at", "updated_at"]} />
                  <DataTable title="Apartment Profiles" rows={data.apartmentProfiles} columns={["id", "property_name", "property_manager", "area_slug", "rent_min", "rent_max", "availability_source", "status", "last_verified_at", "updated_at"]} />
                </div>
              )}

              {tab === "Advertisers" && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <StatusBreakdown title="Advertiser account status" breakdown={data.statusBreakdowns.advertiserAccounts} />
                    <StatusBreakdown title="Insertion order status" breakdown={data.statusBreakdowns.insertionOrders} />
                  </div>
                  <DataTable title="Advertiser Accounts" rows={data.advertiserAccounts} columns={["id", "display_name", "legal_name", "category", "campaign_email", "status", "source_contact_id", "updated_at"]} />
                  <DataTable title="Campaigns" rows={data.campaigns} columns={["id", "advertiser_account_id", "package_key", "placement", "label", "status", "start_date", "end_date", "source_contact_id", "updated_at"]} />
                  <DataTable title="Insertion Orders" rows={data.insertionOrders} columns={["id", "advertiser_account_id", "campaign_id", "terms_version", "price_cents", "currency", "status", "accepted_at", "updated_at"]} />
                </div>
              )}

              {tab === "Lead Routing" && (
                <div className="space-y-5">
                  <DataTable title="Lead Routes" rows={data.leadRoutes} columns={["id", "lead_id", "route_rule", "actor", "recipient_category", "reason", "status", "created_at"]} />
                  <DataTable title="Lead Recipients" rows={data.leadRecipients} columns={["id", "lead_id", "recipient_type", "recipient_id", "recipient_category", "compensation_category", "response_status", "sent_at", "created_at"]} />
                </div>
              )}

              {tab === "Reports" && (
                <section className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="text-lg font-semibold text-gray-900">Advertiser campaign report export</h2>
                  <p className="mt-2 max-w-2xl text-sm text-gray-600">
                    The export includes aggregate counts, status breakdowns, advertiser accounts, campaigns, assets, insertion orders, lead routes,
                    and lead recipient records available to the admin account. Use it as the first managed-sales wrap report until pageview, click,
                    newsletter, and payment integrations are connected.
                  </p>
                  <button
                    type="button"
                    onClick={downloadReport}
                    className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                  >
                    Download JSON report
                  </button>
                  <pre className="mt-5 max-h-[520px] overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-100">
                    {report ? JSON.stringify(report, null, 2) : "No report available."}
                  </pre>
                </section>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
