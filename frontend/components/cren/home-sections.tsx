import Link from "next/link";
import { HomeNewsletterForm } from "@/components/cren/home-newsletter-form";
import { CoverImage } from "@/components/cren/cover-image";
import {
  DbArticle,
  DbMarketSnapshot,
  DbNeighborhood,
  DbAd,
  DbTestimonial,
  DbTicker,
} from "@/lib/public-data";
import { getArticlePath } from "@/lib/article-routing";

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

// Renders a bento card's image slot: the article's real hero photo when it has
// one, otherwise the decorative gradient fallback.
function BentoImg({ article, bg, height }: { article: DbArticle; bg: string; height?: number }) {
  return (
    <div className="bento-img" style={height ? { height } : undefined}>
      {article.image_url ? (
        <CoverImage src={article.image_url} alt={article.title} sizes="(max-width: 768px) 100vw, 33vw" />
      ) : (
        <div className={`bento-img-bg ${bg}`} />
      )}
    </div>
  );
}

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
  const marketPulse = marketSnapshot.map((s) => ({ label: s.label, value: s.value, change: s.change, direction: s.direction }));

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
    : [];

  // Featured article = first DB article, or fallback
  const heroArticle = articles.length > 0 ? articles[0] : null;
  const otherArticles = articles.length > 1 ? articles.slice(1) : [];

  // Native ads for placement
  const nativeAds = ads.filter((a) => a.type === "native");

  const currentDate = formatDate();

  return (
    <>
      {/* ==================== HERO (v5) ==================== */}
      <div className="hero-v5">
        <div className="cren-container-wide">
          <div className="hero-v5-grid">
            <div className="hero-v5-content">
              <div className="hero-v5-eyebrow">
                <span className="hero-v5-dot" aria-hidden="true" />
                Live · {currentDate} · Columbus &amp; Central Ohio
              </div>
              <h1 className="hero-v5-headline">
                {heroArticle ? (
                  <>
                    {heroArticle.title.split("—")[0]}
                    {heroArticle.title.includes("—") && (
                      <em>— {heroArticle.title.split("—").slice(1).join("—")}</em>
                    )}
                  </>
                ) : (
                  <>
                    Columbus Real Estate, <em>Decoded</em> — Daily Local Intelligence
                  </>
                )}
              </h1>
              <p className="hero-v5-excerpt">
                {heroArticle?.excerpt ??
                  "Hyper-local market data, neighborhood analysis, and the stories moving Central Ohio real estate — published every day."}
              </p>
              <div className="hero-v5-meta">
                <span className="hero-tag">{heroArticle?.category ?? "Market Report"}</span>
                <span>{heroArticle?.author ?? "CRE Newsroom"}</span>
                <span>·</span>
                <span>{heroArticle?.read_time ?? "5 min read"}</span>
              </div>
              {heroArticle && (
                <Link href={getArticlePath(heroArticle)} className="hero-v5-cta no-underline">
                  Read the full story
                  <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>

            {heroArticle && (
              <Link
                href={getArticlePath(heroArticle)}
                className="hero-v5-feature no-underline reveal"
                aria-label={heroArticle.title}
              >
                {heroArticle.image_url ? (
                  <CoverImage src={heroArticle.image_url} alt={heroArticle.title} sizes="(max-width: 900px) 100vw, 46vw" priority />
                ) : (
                  <div className="hero-v5-feature-fallback" />
                )}
                <span className="hero-v5-feature-tag">Featured · {heroArticle.category}</span>
              </Link>
            )}
          </div>

          {/* Market Pulse stat ribbon */}
          <div className="hero-v5-pulse">
            <div className="hero-v5-pulse-head">
              <span className="hero-v5-dot hero-v5-dot-light" aria-hidden="true" />
              Market Pulse
            </div>
            <div className="hero-v5-pulse-stats">
              {marketPulse.length > 0 ? marketPulse.map((m, i) => (
                <div key={i} className="hero-v5-pulse-stat">
                  <div className="hero-v5-pulse-value">{m.value}</div>
                  <div className="hero-v5-pulse-label">{m.label}</div>
                  {m.change && (
                    <div className={`hero-v5-pulse-change ${m.direction === "up" ? "up" : m.direction === "down" ? "down" : ""}`}>
                      {m.change}
                    </div>
                  )}
                </div>
              )) : (
                <div className="hero-v5-pulse-stat">
                  <div className="hero-v5-pulse-label">Latest verified snapshot temporarily unavailable</div>
                </div>
              )}
            </div>
            <Link href="/market-data" className="hero-v5-pulse-link no-underline">
              Full market data →
            </Link>
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
                    href={getArticlePath(articles[0])}
                    className="bento-card bento-lg reveal no-underline"
                  >
                    <BentoImg article={articles[0]} bg={bentoBgs[0]} />
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
                    href={getArticlePath(articles[1])}
                    className="bento-card bento-md reveal no-underline"
                  >
                    <BentoImg article={articles[1]} bg={bentoBgs[3]} />
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
                    href={getArticlePath(articles[2])}
                    className="bento-card bento-wide reveal no-underline"
                  >
                    <BentoImg article={articles[2]} bg={bentoBgs[1]} height={150} />
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
                    href={getArticlePath(articles[3])}
                    className="bento-card bento-wide reveal no-underline"
                  >
                    <BentoImg article={articles[3]} bg={bentoBgs[2]} height={150} />
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
                    href={getArticlePath(article)}
                    className="bento-card bento-sm reveal no-underline"
                  >
                    <BentoImg article={article} bg={bentoBgs[(idx + 4) % bentoBgs.length]} height={110} />
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
              <div className="bento-card bento-lg reveal">
                <div className="bento-body">
                  <span className="bento-tag tag-market">Coverage status</span>
                  <div className="bento-title">The latest article feed is temporarily unavailable.</div>
                  <div className="bento-excerpt">Browse neighborhood and topic hubs while the newsroom feed reconnects.</div>
                </div>
              </div>
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
                <div className="nl-proof">Choose the local topics and areas you want to follow.</div>
              </div>
              <div>
                <HomeNewsletterForm />
                <div className="nl-checks">
                  <span className="nl-check">Free forever</span>
                  <span className="nl-check">No spam</span>
                  <span className="nl-check">Reader-first local coverage</span>
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
            {hoods.length > 0 ? hoods.map((h) => (
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
            )) : (
              <div className="cren-surface p-6">
                <p className="cren-body text-sm">The verified neighborhood data snapshot is temporarily unavailable.</p>
                <Link href="/areas" className="cren-text-link mt-3 inline-block">Browse all area hubs</Link>
              </div>
            )}
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
                Sources You Can Inspect
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Our reporting links the public records, datasets, and originating announcements used to support material claims.
              </div>
            </div>
            <div className="reveal" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 32 }}>
              <div className="cren-why-mark" aria-hidden />
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--text-hero)", marginBottom: 8 }}>
                Area-First Local Coverage
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Neighborhood and municipality hubs organize housing, development, schools, restaurants, events, and policy in one place.
              </div>
            </div>
            <div className="reveal" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 32 }}>
              <div className="cren-why-mark" aria-hidden />
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--text-hero)", marginBottom: 8 }}>
                Transparent Newsroom Standards
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Our sourcing, automation, image-integrity checks, and corrections policy are public so readers can evaluate how the work is made.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
