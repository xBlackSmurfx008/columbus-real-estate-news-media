import { notFound } from "next/navigation";
import Link from "next/link";
import { getAreaBySlug } from "@/lib/data";
import { CrenPage } from "@/components/cren/cren-page";
import { getArticles, getMarketData, generateSlug, DbArticle, DbNeighborhood } from "@/lib/public-data";

export const revalidate = 300;

export default async function AreaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) notFound();

  let articles: DbArticle[] = [];
  let matchingNeighborhood: DbNeighborhood | null = null;

  try {
    const [allArticles, marketData] = await Promise.all([getArticles(), getMarketData()]);
    articles = allArticles.filter((a) => a.area_slug === area.slug || a.area_slug === "columbus-citywide");
    // Try to match this area to a DB neighborhood by name
    matchingNeighborhood =
      marketData.neighborhoods.find(
        (n) => n.name.toLowerCase().replace(/[^a-z0-9]/g, "") === area.name.toLowerCase().replace(/[^a-z0-9]/g, "")
      ) ?? null;
  } catch {
    // Continue with empty data
  }

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Neighborhood Hub</div>
          <h1 className="cren-heading-xl">{area.name}</h1>
          <p className="cren-body mt-2">{area.description}</p>
          {area.populationSignal && (
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">{area.populationSignal}</p>
          )}
          {area.multiCountyNote && (
            <p className="cren-body mt-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--green-pale)] px-3 py-2 text-sm text-[color:var(--text-body)]">
              {area.multiCountyNote}
            </p>
          )}
        </div>

        {/* Neighborhood Market Data Card */}
        {matchingNeighborhood && (
          <div className="cren-surface p-6 md:p-8">
            <h2 className="cren-heading-lg mb-4">Market Data</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
              <div className="cren-metric-inner">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Median Price</p>
                <p className="mt-1 font-[family-name:var(--mono)] text-xl font-semibold text-[color:var(--text-hero)]">{matchingNeighborhood.median}</p>
              </div>
              <div className="cren-metric-inner">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">YoY Change</p>
                <p className={`mt-1 font-[family-name:var(--mono)] text-xl font-semibold ${matchingNeighborhood.yoy.startsWith("+") ? "cren-data-up" : "cren-data-down"}`}>
                  {matchingNeighborhood.yoy}
                </p>
              </div>
              <div className="cren-metric-inner">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Avg Rent</p>
                <p className="mt-1 font-[family-name:var(--mono)] text-xl font-semibold text-[color:var(--text-hero)]">{matchingNeighborhood.rent}</p>
              </div>
              <div className="cren-metric-inner">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Days on Market</p>
                <p className="mt-1 font-[family-name:var(--mono)] text-xl font-semibold text-[color:var(--text-hero)]">{matchingNeighborhood.dom}</p>
              </div>
              <div className="cren-metric-inner">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Inventory</p>
                <p className="mt-1 text-xl font-semibold text-[color:var(--text-hero)]">{matchingNeighborhood.inventory}</p>
              </div>
            </div>
          </div>
        )}

        {/* Area Articles */}
        {articles.length > 0 ? (
          <section>
            <h2 className="cren-heading-lg mb-4">Coverage</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/blog/${generateSlug(article.title)}`}
                  className="block no-underline group"
                >
                  <div className="cren-surface p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-hover)]">
                    <span className="inline-block rounded-full bg-[color:var(--green)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--green)] mb-2">
                      {article.category}
                    </span>
                    <h3 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)] transition-colors group-hover:text-[color:var(--green)]">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm text-[color:var(--text-secondary)]">{article.excerpt}</p>
                    )}
                    <div className="mt-3 text-xs text-[color:var(--text-muted)]">
                      {article.author} · {article.date} · {article.read_time}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <div className="cren-surface p-6 text-center">
            <p className="cren-body text-[color:var(--text-muted)]">
              Coverage for {area.name} is building. Check back soon or{" "}
              <Link href="/subscribe" className="cren-text-link">subscribe</Link>{" "}
              to be notified when new content is published.
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <Link href="/areas" className="cren-text-link text-sm font-semibold">
            All neighborhoods
          </Link>
          <Link href="/market-data" className="cren-text-link text-sm font-semibold">
            Full market data
          </Link>
        </div>
      </div>
    </CrenPage>
  );
}
