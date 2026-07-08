import { getDb } from "@/lib/db";
import { FtcDisclosure } from "@/components/ftc-disclosure";

type Partner = {
  slug: string;
  name: string;
  blurb: string | null;
  cta_text: string | null;
};

// Server component: renders active affiliate partners for a category with
// the FTC disclosure above them. Renders nothing if the category is empty
// or the DB is unreachable — affiliate blocks must never break a page.
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
      SELECT slug, name, blurb, cta_text FROM affiliate_partners
      WHERE category = ${category} AND active = true
      ORDER BY sort_order ASC
      LIMIT 6
    `) as unknown as Partner[];
  } catch {
    return null;
  }
  if (partners.length === 0) return null;

  return (
    <section className="cren-surface p-8">
      <h2 className="cren-heading-lg">{heading}</h2>
      <div className="mt-3">
        <FtcDisclosure />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {partners.map((p) => (
          <a
            key={p.slug}
            href={`/go/${p.slug}?from=${encodeURIComponent(fromPath)}`}
            rel="sponsored nofollow"
            className="cren-surface cren-card-link block rounded-[var(--radius)] border border-[color:var(--border)] p-5"
          >
            <h3 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)]">{p.name}</h3>
            {p.blurb && <p className="cren-body mt-2 text-sm">{p.blurb}</p>}
            <span className="cren-text-link mt-3 inline-block text-sm font-semibold">{p.cta_text ?? "Learn more"} →</span>
          </a>
        ))}
      </div>
    </section>
  );
}
