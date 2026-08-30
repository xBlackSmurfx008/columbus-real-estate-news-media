import { crmAdapter } from "@/src/agent/integrations/crm";
import { getDashboardMetrics } from "@/src/agent/reporting/kpi";
import { getBillingSnapshot } from "@/src/agent/workflows/billing";
import { getSequenceSnapshot } from "@/src/agent/workflows/sequences";
import { CrenPage } from "@/components/cren/cren-page";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CRMPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login?next=/crm");
  if (!["admin", "owner", "sales", "operations"].includes(session.role)) redirect("/admin");

  const crm = await crmAdapter.getSnapshot();
  const billing = await getBillingSnapshot();
  const sequences = await getSequenceSnapshot();
  const metrics = await getDashboardMetrics();

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Internal</div>
          <h1 className="cren-heading-lg">CRM Dashboard</h1>
          <p className="cren-body mt-1 text-sm">Sales activity, revenue funnel, billing, and automation overview.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <MetricCard label="Touches This Week" value={metrics.touchesThisWeek} />
            <MetricCard label="Discovery Calls Booked" value={metrics.discoveryCallsBooked} />
            <MetricCard label="Proposals Sent" value={metrics.proposalsSent} />
            <MetricCard label="Conversion Rate" value={`${metrics.conversionRatePercent}%`} />
            <MetricCard label="New MRR" value={`$${metrics.newMrr}`} />
            <MetricCard label="One-Time Revenue" value={`$${metrics.oneTimeRevenue}`} />
            <MetricCard label="Blended Account Value" value={`$${metrics.blendedAccountValue}`} />
            <MetricCard label="Renewal Pipeline" value={metrics.renewalPipelineCount} />
          </div>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <h2 className="cren-heading-lg">Pipeline</h2>
          <p className="cren-body mt-1 text-sm">
            Companies: {crm.companies.length} | Contacts: {crm.contacts.length} | Deals: {crm.deals.length}
          </p>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <h2 className="cren-heading-lg">Contracts and Invoices</h2>
          <p className="cren-body mt-1 text-sm">
            Contracts: {billing.contracts.length} | Invoices: {billing.invoices.length}
          </p>
        </section>

        <section className="cren-surface p-6 md:p-8">
          <h2 className="cren-heading-lg">Outreach Automation</h2>
          <p className="cren-body mt-1 text-sm">
            Sequences: {sequences.sequences.length} | Enrollments: {sequences.enrollments.length}
          </p>
        </section>
      </div>
    </CrenPage>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="cren-metric-inner">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--mono)] text-2xl font-semibold text-[color:var(--text-hero)]">{value}</p>
    </div>
  );
}
