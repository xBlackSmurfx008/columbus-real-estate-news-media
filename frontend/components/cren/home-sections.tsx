import Link from "next/link";
import { HomeNewsletterForm } from "@/components/cren/home-newsletter-form";
import {
  DbArticle,
  DbMarketSnapshot,
  DbNeighborhood,
  DbAd,
  DbTestimonial,
  DbTicker,
  generateSlug,
} from "@/lib/public-data";

// ----- Fallback data (used when DB is unavailable) -----
const fallbackHoods = [
  { slug: "short-north", name: "Short North", type: "Urban · Walkable · Arts District", median: "$385K", rent: "$1,650", yoy: "+8.2%", dom: "42" },
  { slug: "dublin", name: "Dublin", type: "Suburban · Families · Top Schools", median: "$425K", rent: "$1,480", yoy: "+6.1%", dom: "55" },
  { slug: "german-village", name: "German Village", type: "Historic · Charming · Walkable", median: "$415K", rent: "$1,550", yoy: "+7.4%", dom: "38" },
  { slug: "westerville", name: "Westerville", type: "Suburban · Community · Growing", median: "$340K", rent: "$1,280", yoy: "+5.3%", dom: "61" },
  { slug: "grandview-heights", name: "Grandview Heights", type: "Urban · Trendy · Young Professionals", median: "$395K", rent: "$1,520", yoy: "+9.1%", dom: "35" },
  { slug: "new-albany", name: "New Albany", type: "Luxury · Estates · Intel HQ", median: "$612K", rent: "$1,900", yoy: "+11.3%", dom: "48" },
  { slug: "franklinton", name: "Franklinton", type: "Emerging · Arts · Best Value", median: "$215K", rent: "$1,100", yoy: "+14.7%", dom: "29" },
  { slug: "hilliard", name: "Hilliard", type: "Suburban · Families · Affordable", median: "$310K", rent: "$1,220", yoy: "+4.8%", dom: "64" },
];

const fallbackMarketPulse = [
  { label: "Median Price", value: "$286,000", change: "+5.9%", direction: "up" },
  { label: "Active Listings", value: "4,440", change: "+14.2%", direction: "up" },
  { label: "Days on Market", value: "59", change: "+8", direction: "down" },
  { label: "Closed Sales (2025)", value: "29,626", change: "+3%", direction: "up" },
  { label: "30-Year Rate", value: "6.82%", change: "", direction: "neutral" },
];

// Category tag styling
const categoryTagClass: Record<string, string> = {
  "Market Analysis": "tag-market",
  "Development": "tag-development",
  "Neighborhoods": "tag-neighborhoods",
  "Economic Impact": "tag-invest",
  "Rental Market": "tag-rent",
  "Commercial": "tag-market",
  "default": "tag-market",
};

// Bento background classes for visual variety
const bentoBgs = ["bg-1", "bg-2", "bg-3", "bg-4", "bg-5", "bg-6"];

interface HomeSectionsProps {
  articles?: DbArticle[];
  marketSnapshot?: DbMarketSnapshot[];
  neighborhoods?: DbNeighborhood[];
  ads?: DbAd[];
  testimonials?: DbTestimonial[];
  tickers?: DbTicker[];
}

function formatDate() {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

export function HomeSections({
  articles = [],
  marketSnapshot = [],
  neighborhoods = [],
  ads = [],
  testimonials = [],
}: HomeSectionsProps) {
  // Use DB data or fallbacks
  const marketPulse = marketSnapshot.length > 0
    ? marketSnapshot.map((s) => ({ label: s.label, value: s.value, change: s.change, direction: s.direction }))
    : fallbackMarketPulse;

  const hoods = neighborhoods.length > 0
    ? neighborhoods.map((n) => ({
        slug: n.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        name: n.name,
        type: `${n.inventory} inventory`,
        median: n.median,
        rent: n.rent,
        yoy: n.yoy,
        dom: n.dom.replace(" days", ""),
      }))
    : fallbackHoods;

  // Featured article = first DB article, or fallback
  const heroArticle = articles.length > 0 ? articles[0] : null;
  const otherArticles = articles.length > 1 ? articles.slice(1) : [];

  // Native ads for placement
  const nativeAds = ads.filter((a) => a.type === "native");

  const currentDate = formatDate();

  return (
    <>
      {/* ==================== HERO ==================== */}
      <div className="hero">
        <div className="cren-container-wide">
          <div className="hero-grid">
            <div>
              <div className="hero-date">{currentDate} — Columbus &amp; Central Ohio</div>
              <h1 className="hero-headline">
                {heroArticle ? (
                  <>
                    {heroArticle.title.split("—")[0]}
                    {heroArticle.title.includes("—") && (
                      <em>— {heroArticle.title.split("—").slice(1).join("—")}</em>
                    )}
                    {!heroArticle.title.includes("—") && heroArticle.title.includes(":") && ""}
                  </>
                ) : (
                  <>
                    Columbus Home Prices Hit $286K as Inventory <em>Surges 14%</em> — What It Means for You
                  </>
                )}
              </h1>
              <p className="hero-excerpt">
                {heroArticle?.excerpt ??
                  "February's data reveals a rare combination: rising prices alongside growing inventory. For the first time in three years, Columbus buyers have real negotiating leverage. Here's our deep-dive analysis."}
              </p>
              <div className="hero-meta">
                <span className="hero-tag">{heroArticle?.category ?? "Market Report"}</span>
                <div className="hero-author-img">
                  {heroArticle?.author ? heroArticle.author.split(" ").map((n) => n[0]).join("") : "SA"}
                </div>
                <span>{heroArticle?.author ?? "Stephen Adams"}</span>
                <span>·</span>
                <span>{heroArticle?.read_time ?? "8 min read"}</span>
              </div>
            </div>
            <div className="hero-sidebar">
              <div className="market-pulse">
                <div className="mp-header">
                  <div className="mp-title">Market Pulse</div>
                  <div className="mp-live">Live</div>
                </div>
                {marketPulse.map((m, i) => (
                  <div key={i} className="mp-row">
                    <span className="mp-label">{m.label}</span>
                    <span className="mp-value">{m.value}</span>
                    {m.change && (
                      <span className={`mp-change ${m.direction === "up" ? "up" : m.direction === "down" ? "down" : ""}`}>
                        {m.change}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="trending-box">
                <div className="trending-title">Trending Now</div>
                {otherArticles.slice(0, 4).map((article, idx) => (
                  <Link
                    key={article.id}
                    href={`/blog/${generateSlug(article.title)}`}
                    className="trending-item no-underline"
                  >
                    <span className="trending-num">{String(idx + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="trending-text">{article.title}</div>
                      <div className="trending-meta">{article.category} · {article.date}</div>
                    </div>
                  </Link>
                ))}
                {otherArticles.length === 0 && (
                  <>
                    <Link href="/blog" className="trending-item no-underline">
                      <span className="trending-num">01</span>
                      <div>
                        <div className="trending-text">Short North Corridor: $2.1B Expansion Plan Revealed</div>
                        <div className="trending-meta">Development · 2h ago</div>
                      </div>
                    </Link>
                    <Link href="/blog" className="trending-item no-underline">
                      <span className="trending-num">02</span>
                      <div>
                        <div className="trending-text">Best Columbus Neighborhoods for First-Time Buyers (2026)</div>
                        <div className="trending-meta">Buy · 5h ago</div>
                      </div>
                    </Link>
                    <Link href="/blog" className="trending-item no-underline">
                      <span className="trending-num">03</span>
                      <div>
                        <div className="trending-text">Dublin vs. Westerville: Where Should You Invest?</div>
                        <div className="trending-meta">Invest · 1d ago</div>
                      </div>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== BENTO ARTICLE GRID ==================== */}
      <section style={{ paddingTop: 32, paddingBottom: 16 }}>
        <div className="cren-container-wide">
          <div className="bento">
            {articles.length > 0 ? (
              <>
                {/* Large featured card */}
                {articles[0] && (
                  <Link
                    href={`/blog/${generateSlug(articles[0].title)}`}
                    className="bento-card bento-lg reveal no-underline"
                  >
                    <div className="bento-img">
                      <div className={`bento-img-bg ${bentoBgs[0]}`} />
                    </div>
                    <div className="bento-body">
                      <span className={`bento-tag ${categoryTagClass[articles[0].category] ?? "tag-market"}`}>
                        {articles[0].category}
                      </span>
                      <div className="bento-title">{articles[0].title}</div>
                      <div className="bento-excerpt">{articles[0].excerpt}</div>
                      <div className="bento-footer">
                        <div className="bento-author-dot">
                          {articles[0].author.split(" ").map((n) => n[0]).join("")}
                        </div>
                        {articles[0].author} · {articles[0].date} · {articles[0].read_time}
                      </div>
                    </div>
                  </Link>
                )}

                {/* Medium card */}
                {articles[1] && (
                  <Link
                    href={`/blog/${generateSlug(articles[1].title)}`}
                    className="bento-card bento-md reveal no-underline"
                  >
                    <div className="bento-img">
                      <div className={`bento-img-bg ${bentoBgs[3]}`} />
                    </div>
                    <div className="bento-body">
                      <span className={`bento-tag ${categoryTagClass[articles[1].category] ?? "tag-development"}`}>
                        {articles[1].category}
                      </span>
                      <div className="bento-title">{articles[1].title}</div>
                      <div className="bento-excerpt">{articles[1].excerpt}</div>
                      <div className="bento-footer">
                        <div className="bento-author-dot">
                          {articles[1].author.split(" ").map((n) => n[0]).join("")}
                        </div>
                        {articles[1].author} · {articles[1].date} · {articles[1].read_time}
                      </div>
                    </div>
                  </Link>
                )}

                {/* Wide card */}
                {articles[2] && (
                  <Link
                    href={`/blog/${generateSlug(articles[2].title)}`}
                    className="bento-card bento-wide reveal no-underline"
                  >
                    <div className="bento-body">
                      <span className={`bento-tag ${categoryTagClass[articles[2].category] ?? "tag-rent"}`}>
                        {articles[2].category}
                      </span>
                      <div className="bento-title">{articles[2].title}</div>
                      <div className="bento-excerpt">{articles[2].excerpt}</div>
                      <div className="bento-footer">
                        <div className="bento-author-dot">
                          {articles[2].author.split(" ").map((n) => n[0]).join("")}
                        </div>
                        {articles[2].author} · {articles[2].date} · {articles[2].read_time}
                      </div>
                    </div>
                  </Link>
                )}

                {/* Wide card with image */}
                {articles[3] && (
                  <Link
                    href={`/blog/${generateSlug(articles[3].title)}`}
                    className="bento-card bento-wide reveal no-underline"
                  >
                    <div className="bento-img" style={{ height: 160 }}>
                      <div className={`bento-img-bg ${bentoBgs[2]}`} />
                    </div>
                    <div className="bento-body">
                      <span className={`bento-tag ${categoryTagClass[articles[3].category] ?? "tag-invest"}`}>
                        {articles[3].category}
                      </span>
                      <div className="bento-title">{articles[3].title}</div>
                      <div className="bento-excerpt">{articles[3].excerpt}</div>
                      <div className="bento-footer">
                        <div className="bento-author-dot">
                          {articles[3].author.split(" ").map((n) => n[0]).join("")}
                        </div>
                        {articles[3].author} · {articles[3].date} · {articles[3].read_time}
                      </div>
                    </div>
                  </Link>
                )}

                {/* Small cards for remaining articles */}
                {articles.slice(4).map((article, idx) => (
                  <Link
                    key={article.id}
                    href={`/blog/${generateSlug(article.title)}`}
                    className="bento-card bento-sm reveal no-underline"
                  >
                    {idx % 3 === 2 && (
                      <div className="bento-img" style={{ height: 100 }}>
                        <div className={`bento-img-bg ${bentoBgs[(idx + 4) % bentoBgs.length]}`} />
                      </div>
                    )}
                    <div className="bento-body">
                      <span className={`bento-tag ${categoryTagClass[article.category] ?? "tag-market"}`}>
                        {article.category}
                      </span>
                      <div className="bento-title">{article.title}</div>
                      <div className="bento-footer">
                        <div className="bento-author-dot">
                          {article.author.split(" ").map((n) => n[0]).join("")}
                        </div>
                        {article.author} · {article.date}
                      </div>
                    </div>
                  </Link>
                ))}
              </>
            ) : (
              /* Fallback static bento cards */
              <>
                <Link href="/blog" className="bento-card bento-lg reveal no-underline">
                  <div className="bento-img"><div className="bento-img-bg bg-1" /></div>
                  <div className="bento-body">
                    <span className="bento-tag tag-market">Market Report</span>
                    <div className="bento-title">February 2026 Full MLS Report: The Columbus Market Is Shifting — And Buyers Are Winning</div>
                    <div className="bento-excerpt">29,626 closed sales, rising inventory, and a median price that&apos;s still climbing.</div>
                    <div className="bento-footer"><div className="bento-author-dot">SA</div>Stephen Adams · Mar 20 · 10 min</div>
                  </div>
                </Link>
                <Link href="/blog" className="bento-card bento-md reveal no-underline">
                  <div className="bento-img"><div className="bento-img-bg bg-4" /></div>
                  <div className="bento-body">
                    <span className="bento-tag tag-development">Development</span>
                    <div className="bento-title">The $2.1B Short North Corridor: Everything You Need to Know</div>
                    <div className="bento-excerpt">Columbus&apos;s biggest mixed-use project just got approved.</div>
                    <div className="bento-footer"><div className="bento-author-dot">JR</div>Jamie Reeves · Mar 18 · 5 min</div>
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ==================== NATIVE AD SECTION ==================== */}
      {nativeAds.length > 0 && (
        <section style={{ paddingTop: 0, paddingBottom: 16 }}>
          <div className="cren-container-wide">
            {nativeAds.slice(0, 1).map((ad) => (
              <div key={ad.id} className="reveal" style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "24px 32px",
                display: "flex",
                alignItems: "center",
                gap: 24,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: ad.brand_color ?? "var(--green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                }}>
                  {ad.brand_name?.split(" ").map((w) => w[0]).join("").slice(0, 2) ?? "AD"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.5, marginBottom: 4 }}>Sponsored</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, color: "var(--text-hero)" }}>{ad.title}</div>
                  {ad.text && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{ad.text}</div>}
                </div>
                {ad.cta_text && (
                  <a
                    href={ad.cta_url ?? "#"}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      background: ad.brand_color ?? "var(--green)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ad.cta_text}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================== NEWSLETTER CTA ==================== */}
      <section style={{ paddingTop: 0, paddingBottom: 64 }}>
        <div className="cren-container-wide">
          <div className="newsletter-cta reveal">
            <div className="nl-inner">
              <div>
                <div className="nl-heading">The Columbus RE Insider</div>
                <div className="nl-desc">
                  The most important Columbus real estate stories, market data, and investment insights — curated for renters,
                  buyers, and investors every Tuesday morning.
                </div>
                <div className="nl-proof">Join 10,000+ Columbus locals who skip Zillow and read this instead.</div>
              </div>
              <div>
                <HomeNewsletterForm />
                <div className="nl-checks">
                  <span className="nl-check">Free forever</span>
                  <span className="nl-check">No spam</span>
                  <span className="nl-check">58% open rate</span>
                  <span className="nl-check">Unsubscribe anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== NEIGHBORHOODS ==================== */}
      <section className="neighborhoods">
        <div className="cren-container">
          <div className="section-eyebrow reveal">Explore Your City</div>
          <div className="section-heading reveal">
            Columbus <em>Neighborhoods</em>
          </div>
          <div className="section-desc reveal">
            Hyper-local market data for every corner of Columbus and its suburbs. Click any area for the full report.
          </div>
          <div className="hood-grid">
            {hoods.map((h) => (
              <Link key={h.slug} href={`/areas/${h.slug}`} className="hood-card reveal no-underline">
                <div className="hood-name">{h.name}</div>
                <div className="hood-type">{h.type}</div>
                <div className="hood-stats">
                  <div>
                    <div className="hood-stat-val">{h.median}</div>
                    <div className="hood-stat-label">Typical Value</div>
                  </div>
                  <div>
                    <div className="hood-stat-val">{h.rent}</div>
                    <div className="hood-stat-label">Avg Rent (1BR)</div>
                  </div>
                  <div>
                    <div className="hood-stat-val" style={{ color: "var(--data-up)" }}>
                      {h.yoy}
                    </div>
                    <div className="hood-stat-label">YoY Growth</div>
                  </div>
                  <div>
                    <div className="hood-stat-val">{h.dom}</div>
                    <div className="hood-stat-label">Avg DOM</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      {testimonials.length > 0 && (
        <section style={{ paddingTop: 64, paddingBottom: 0 }}>
          <div className="cren-container">
            <div className="section-eyebrow reveal" style={{ justifyContent: "center" }}>What People Are Saying</div>
            <div className="section-heading reveal" style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 40px" }}>
              Trusted by Columbus <em>Professionals</em>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              {testimonials.map((t) => (
                <div key={t.id} className="reveal" style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 32,
                }}>
                  <div style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7, fontStyle: "italic" }}>
                    &ldquo;{t.quote}&rdquo;
                  </div>
                  <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "var(--green)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 13,
                    }}>
                      {t.initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-hero)" }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== WHY LOCAL ==================== */}
      <section>
        <div className="cren-container" style={{ textAlign: "center" }}>
          <div className="section-eyebrow reveal" style={{ justifyContent: "center" }}>
            Why Columbus Locals Choose Us
          </div>
          <div className="section-heading reveal" style={{ maxWidth: 700, margin: "0 auto 16px" }}>
            Skip the Big Portals.
            <br />
            <em>Go Local.</em>
          </div>
          <p className="section-desc reveal" style={{ margin: "0 auto 56px" }}>
            Zillow gives you data. Apartments.com gives you listings. We give you context, community intelligence, and the local
            insights that only someone embedded in Columbus can provide.
          </p>
          <div className="cren-why-grid">
            <div className="reveal" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 32 }}>
              <div className="cren-why-mark" aria-hidden />
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--text-hero)", marginBottom: 8 }}>
                Data You Can&apos;t Find on Zillow
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                ZIP-code level analysis, absorption rates, price-per-sqft trends, and predictive analytics built specifically for
                Central Ohio&apos;s unique market dynamics.
              </div>
            </div>
            <div className="reveal" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 32 }}>
              <div className="cren-why-mark" aria-hidden />
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--text-hero)", marginBottom: 8 }}>
                50+ Neighborhoods Covered
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                From Franklinton&apos;s emerging art scene to New Albany&apos;s luxury estates — we know every block, every school district,
                every hidden gem that national platforms miss.
              </div>
            </div>
            <div className="reveal" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 32 }}>
              <div className="cren-why-mark" aria-hidden />
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--text-hero)", marginBottom: 8 }}>
                Built By Columbus, For Columbus
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                We&apos;re not a Silicon Valley portal monetizing your data. We&apos;re your neighbors, covering the city we live in,
                connecting the community we&apos;re part of.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
