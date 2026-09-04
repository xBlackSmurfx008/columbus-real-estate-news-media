import { getDb } from "@/lib/db";
import { loadAffiliatePrograms } from "@/lib/affiliate-programs";
import { isPlaceholderUrl, outboundHref, resolveAffiliateUrl } from "@/lib/outbound-partners";
import { OutboundLinkGroup, type OutboundCardLink } from "@/components/outbound-link-group";

type Partner = {
  slug: string;
  name: string;
  blurb: string | null;
  cta_text: string | null;
  url: string;
};

// Server component: the older category-driven block on /resources and /improve.
//
// It now renders through OutboundLinkGroup, so it obeys the same invariant as
// the utility-page comparison sets: a paid link cannot render without the FTC
// disclosure above it, and a link is only marked paid when `affiliate_programs`
// holds a real, active relationship for that partner. Placeholder rows
// (example.com) stay hidden. Renders nothing if the category is empty or the
// database is unreachable — an affiliate block must never break a page.
export async function AffiliateBlock({
  category,
  fromPath,
  heading = "Helpful services",
}: {
  category: string;
  fromPath: string;
  heading?: string;
}) {
  let partners: Partner[] = [];
  try {
    const sql = getDb();
    partners = (await sql`
      SELECT slug, name, blurb, cta_text, url FROM affiliate_partners
      WHERE category = ${category} AND active = true
      ORDER BY sort_order ASC
      LIMIT 6
    `) as unknown as Partner[];
  } catch {
    return null;
  }
  partners = partners.filter((partner) => !isPlaceholderUrl(partner.url));
  if (partners.length === 0) return null;

  const programs = await loadAffiliatePrograms();

  const links: OutboundCardLink[] = partners.map((partner) => ({
    key: partner.slug,
    title: partner.name,
    note: partner.blurb ?? partner.cta_text ?? "",
    host: null,
    href: outboundHref(partner.slug, { page: fromPath, placement: `affiliate-block:${category}` }),
    sponsored: resolveAffiliateUrl(programs.get(partner.slug) ?? null, partner.url) !== null,
  }));

  return (
    <section className="cren-surface p-8">
      <h2 className="cren-heading-lg">{heading}</h2>
      <OutboundLinkGroup links={links} columns={3} className="mt-4" />
    </section>
  );
}
