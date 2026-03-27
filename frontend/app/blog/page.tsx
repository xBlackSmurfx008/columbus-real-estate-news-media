import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { getArticles, generateSlug, DbArticle } from "@/lib/public-data";

export const revalidate = 300;

function ArticleCard({ article, featured = false }: { article: DbArticle; featured?: boolean }) {
  const slug = generateSlug(article.title);
  const initials = article.author.split(" ").map((n) => n[0]).join("");

  return (
    <Link href={`/blog/${slug}`} className="block no-underline group">
      <article
        className="cren-surface p-6 transition-shadow duration-300 hover:shadow-[var(--shadow-hover)]"
        data-item-type="article"
        data-item-id={article.id}
      >
        {featured && (
          <div className="mb-4 aspect-[16/8] overflow-hidden rounded-[var(--radius-sm)] bg-gradient-to-br from-[color:var(--green)]/15 via-[color:var(--gold)]/10 to-transparent" />
        )}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full bg-[color:var(--green)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">
            {article.category}
          </span>
          {article.featured && (
            <span className="inline-block rounded-full bg-[color:var(--gold)]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--gold)]">
              Featured
            </span>
          )}
        </div>
        <h3 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)] transition-colors group-hover:text-[color:var(--green)]">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm text-[color:var(--text-secondary)]">{article.excerpt}</p>
        )}
        <div className="mt-4 flex items-center gap-3 text-xs text-[color:var(--text-muted)]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--green)] text-[10px] font-bold text-white">
            {initials}
          </div>
          <span className="font-medium text-[color:var(--text-secondary)]">{article.author}</span>
          <span>·</span>
          <span>{article.date}</span>
          <span>·</span>
          <span>{article.read_time}</span>
        </div>
      </article>
    </Link>
  );
}

export default async function BlogPage() {
  let articles: DbArticle[] = [];
  try {
    articles = await getArticles();
  } catch {
    articles = [];
  }

  const featuredArticles = articles.filter((a) => a.featured);
  const otherArticles = articles.filter((a) => !a.featured);

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Live Coverage</div>
          <h1 className="cren-heading-xl">Market News &amp; Analysis</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Market updates, neighborhood analysis, and data-driven guidance for renters, buyers, sellers, and investors across
            Columbus and Central Ohio.
          </p>
          <div className="mt-4 flex gap-4">
            <Link href="/areas" className="cren-text-link inline-block text-sm">
              Browse neighborhoods
            </Link>
            <Link href="/market-data" className="cren-text-link inline-block text-sm">
              View market data
            </Link>
          </div>
        </div>

        {featuredArticles.length > 0 && (
          <section className="space-y-4">
            <h2 className="cren-heading-lg">Featured</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {featuredArticles.map((article) => (
                <ArticleCard key={article.id} article={article} featured />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="cren-heading-lg">Latest Coverage</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {otherArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {articles.length === 0 && (
            <div className="cren-surface p-8 text-center">
              <p className="cren-body text-[color:var(--text-muted)]">
                Articles are being loaded. Check back shortly.
              </p>
            </div>
          )}
        </section>
      </div>
    </CrenPage>
  );
}
