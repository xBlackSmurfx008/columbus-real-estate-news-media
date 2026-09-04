import { loadAffiliatePrograms } from "@/lib/affiliate-programs";
import { outboundHref, outboundLinksFor, type OutboundIntent } from "@/lib/outbound-partners";
import { OutboundLinkGroup, type OutboundCardLink } from "@/components/outbound-link-group";

// Server component: the comparison set for one intent on one utility page.
//
// It resolves two things and combines them:
//   registry (lib/outbound-partners.ts) -> which destinations, in what order
//   affiliate_programs (database)       -> which of them, if any, actually pay
//
// The registry decides membership and order; the database only decides the
// `sponsored` flag. A partner that starts paying gains a label and a tracked
// affiliate URL, never a better position, and a partner that does not pay is
// never dropped. Rendering goes through OutboundLinkGroup, so the FTC
// disclosure cannot be separated from a paid link.

export async function PartnerLinks({
  intent,
  area,
  page,
  placement,
  columns = 4,
  className,
}: {
  intent: OutboundIntent;
  /** Area context for both the destination URL and the click record. */
  area: string;
  /** The CREN page this block sits on, recorded as the click's `page`. */
  page: string;
  /** Named block, so placement-level performance is separable. */
  placement: string;
  columns?: 3 | 4;
  className?: string;
}) {
  const programs = await loadAffiliatePrograms();
  const links = outboundLinksFor(intent, area, programs);

  const cards: OutboundCardLink[] = links.map((link) => ({
    key: link.key,
    title: link.title,
    note: link.note,
    host: link.host,
    eyebrow: area,
    href: outboundHref(link.key, { page, area, placement }),
    sponsored: link.sponsored,
  }));

  return <OutboundLinkGroup links={cards} columns={columns} className={className} />;
}
