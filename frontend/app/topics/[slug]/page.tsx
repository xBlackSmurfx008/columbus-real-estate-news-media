import { notFound } from "next/navigation";
import Link from "next/link";
import { getTopicBySlug } from "@/lib/data";
import { CrenPage } from "@/components/cren/cren-page";
import { getArticles, generateSlug, DbArticle } from "@/lib/public-data";

export const revalidate = 300;

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  let articles: DbArticle[] = [];
  try {
    const all = await getArticles();
    articles = all.filter((a) => a.topic_slug === topic.slug);
  } catch {
    // Continue with empty
  }

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">Topic Hub</div>
          <h1 className="cren-heading-xl">{topic.name}</h1>
          <p className="cren-body mt-2">{topic.description}</p>
        </div>

        {articles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/blog/${generateSlug(article.title)}`}
                className="block no-underline group"
              >
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
                    {article.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm text-[color:var(--text-secondary)]">{article.excerpt}</p>
                    )}
                    <div className="mt-3 text-xs text-[color:var(--text-muted)]">
                      {article.author} · {article.date} · {article.read_time}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="cren-surface p-6 text-center">
            <p className="cren-body text-[color:var(--text-muted)]">
              Coverage for {topic.name} is building. Check back soon.
            </p>
          </div>
        )}
      </div>
    </CrenPage>
  );
}
