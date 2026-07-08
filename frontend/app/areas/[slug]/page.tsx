import { notFound } from "next/navigation";
import Link from "next/link";
import { getAreaBySlug } from "@/lib/data";
import { CrenPage } from "@/components/cren/cren-page";
import { getArticles, getMarketData, generateSlug, DbArticle, DbNeighborhood } from "@/lib/public-data";

export const revalidate = 300;

function ArticleCard({ article }: { article: DbArticle }) {
  return (
    <Link href={`/blog/${generateSlug(article.title)}`} className="block no-underline group">
      <div className="cren-surface overflow-hidden transition-shadow duration-300 hover:shadow-[var(--shadow-hover)]">
        {article.image_url && (
          <div className="aspect-[16/9] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.image_url} alt={article.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          </div>
        )}
        <div className="p-5">
          <span className="mb-2 inline-block rounded-full bg-[color:var(--green)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">
            {article.category}
          </span>
          <h3 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)] transition-colors group-hover:text-[color:var(--green)]">
            {article.title}
          </h3>
          {article.excerpt && <p className="mt-2 line-clamp-2 text-sm text-[color:var(--text-secondary)]">{article.excerpt}</p>}
          <div className="mt-3 text-xs text-[color:var(--text-muted)]">
            {article.author} · {article.date} · {article.read_time}
          </div>
        </div>
      </div>
    </Link>
  );
}

const funnelCardClass = "cren-surface cren-card-link block rounded-[var(--radius)] border border-[color:var(--border)] p-4";

export default async function AreaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) notFound();

  let local: DbArticle[] = [];
  let metro: DbArticle[] = [];
  let matchingNeighborhood: DbNeighborhood | null = null;

  try {
    const [allArticles, marketData] = await Promise.all([getArticles(), getMarketData()]);
    local = allArticles.filter((a) => a.area_slug === area.slug && area.slug !== "columbus-citywide");
    metro = allArticles.filter((a) => a.area_slug === "columbus-citywide").slice(0, 4);
    matchingNeighborhood =
      marketData.neighborhoods.find(
        (n) => n.name.toLowerCase().replace(/[^a-z0-9]/g, "") === area.name.toLowerCase().replace(/[^a-z0-9]/g, "")
      ) ?? null;
  } catch {
    // Continue with empty data
  }

  // For the citywide hub itself, "local" is the full metro feed.
  if (area.slug === "columbus-citywide") {
    try {
      const all = await getArticles();
      local = all.filter((a) => a.area_slug === "columbus-citywide");
      metro = [];
    } catch {}
  }

  const heroImage = local.find((a) => a.image_url)?.image_url ?? null;

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        {/* Header */}
        <div className="cren-surface overflow-hidden">
          {heroImage && (
            <div className="aspect-[21/9] w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImage} alt={`${area.name}, Columbus`} className="h-full w-full object-cover" />
            </div>
          )}
          <div className="p-6 md:p-8">
            <div className="section-eyebrow">Neighborhood Hub</div>
            <h1 className="cren-heading-xl">{area.name}</h1>
            <p className="cren-body mt-2 max-w-2xl">{area.description}</p>
            {area.populationSignal && (
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">{area.populationSignal}</p>
            )}
            {area.multiCountyNote && (
              <p className="cren-body mt-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--green-pale)] px-3 py-2 text-sm text-[color:var(--text-body)]">
                {area.multiCountyNote}
              </p>
            )}
          </div>
        </div>

        {/* Market Data */}
        {matchingNeighborhood && (
          <div className="cren-surface p-6 md:p-8">
            <h2 className="cren-heading-lg mb-4">{area.name} market data</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {[
                ["Typical Value", matchingNeighborhood.median],
                ["YoY Change", matchingNeighborhood.yoy],
                ["Avg Rent", matchingNeighborhood.rent],
                ["Days on Market", matchingNeighborhood.dom],
                ["Inventory", matchingNeighborhood.inventory],
              ].map(([label, value]) => (
                <div key={label} className="cren-metric-inner">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">{label}</p>
                  <p
                    className={`mt-1 text-xl font-semibold ${
                      label === "YoY Change"
                        ? value.startsWith("+")
                          ? "cren-data-up font-[family-name:var(--mono)]"
                          : "cren-data-down font-[family-name:var(--mono)]"
                        : label === "Inventory"
                          ? "text-[color:var(--text-hero)]"
                          : "font-[family-name:var(--mono)] text-[color:var(--text-hero)]"
                    }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[color:var(--text-muted)]">
              Snapshot figures. See the{" "}
              <Link href="/market-data" className="cren-text-link">full metro market data</Link> for methodology and citywide trends.
            </p>
          </div>
        )}

        {/* Do something in this neighborhood */}
        <div>
          <h2 className="cren-heading-lg mb-4">Buy, sell, or rent in {area.name}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/sell/your-home" className={funnelCardClass}>
              <h3 className="font-semibold text-[color:var(--text-hero)]">Sell your home</h3>
              <p className="cren-body mt-1 text-sm">Free offer, no commission, no repairs.</p>
            </Link>
            <Link href="/rent/find-a-home" className={funnelCardClass}>
              <h3 className="font-semibold text-[color:var(--text-hero)]">Find a rental</h3>
              <p className="cren-body mt-1 text-sm">Free help matching your budget here.</p>
            </Link>
            <Link href="/invest/deploy-capital" className={funnelCardClass}>
              <h3 className="font-semibold text-[color:var(--text-hero)]">Invest here</h3>
              <p className="cren-body mt-1 text-sm">Put capital to work in this area.</p>
            </Link>
            <Link href="/sell/investment-property" className={funnelCardClass}>
              <h3 className="font-semibold text-[color:var(--text-hero)]">Sell a rental</h3>
              <p className="cren-body mt-1 text-sm">Exit off-market, tenants in place.</p>
            </Link>
          </div>
        </div>

        {/* Local coverage */}
        {local.length > 0 ? (
          <section>
            <h2 className="cren-heading-lg mb-4">{area.slug === "columbus-citywide" ? "Metro coverage" : `${area.name} coverage`}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {local.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        ) : (
          <div className="cren-surface p-6 text-center">
            <p className="cren-body text-[color:var(--text-muted)]">
              We haven&apos;t published a {area.name}-specific story yet.{" "}
              <Link href="/subscribe" className="cren-text-link">Subscribe</Link> and we&apos;ll tell you when we do. Metro coverage is below.
            </p>
          </div>
        )}

        {/* Metro context (only on non-citywide hubs) */}
        {area.slug !== "columbus-citywide" && metro.length > 0 && (
          <section>
            <h2 className="cren-heading-lg mb-4">Across the Columbus metro</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {metro.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}

        <div className="flex gap-4">
          <Link href="/areas" className="cren-text-link text-sm font-semibold">All neighborhoods</Link>
          <Link href="/market-data" className="cren-text-link text-sm font-semibold">Full market data</Link>
        </div>
      </div>
    </CrenPage>
  );
}
