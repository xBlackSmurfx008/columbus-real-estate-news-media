import { notFound } from "next/navigation";
import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";
import { CoverImage } from "@/components/cren/cover-image";
import { getArticleBySlug, getArticles, generateSlug, DbArticle } from "@/lib/public-data";
import { getAreaBySlug, getTopicBySlug } from "@/lib/data";
import Script from "next/script";

export const revalidate = 300;

// Turn markdown links [text](url), **bold**, and bare URLs into React nodes.
// Internal links (/path) render as normal links; external links get
// rel="nofollow noopener" and open in a new tab.
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Order matters: markdown links first, then bare URLs, then bold.
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)|(https?:\/\/[^\s)]+)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyBase}-${n++}`;
    if (m[1] && m[2]) {
      const href = m[2];
      const external = href.startsWith("http");
      nodes.push(
        <a
          key={key}
          href={href}
          className="cren-text-link"
          {...(external ? { target: "_blank", rel: "nofollow noopener" } : {})}
        >
          {m[1]}
        </a>
      );
    } else if (m[3]) {
      nodes.push(
        <a key={key} href={m[3]} className="cren-text-link" target="_blank" rel="nofollow noopener">
          {m[3]}
        </a>
      );
    } else if (m[4]) {
      nodes.push(<strong key={key}>{m[4]}</strong>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderBody(body: string) {
  const paragraphs = body.split("\n\n").filter((p) => p.trim());
  return paragraphs.map((p, i) => {
    const trimmed = p.trim();
    // Markdown heading (## Foo) or a short, punctuation-free line = heading.
    const headingMatch = trimmed.match(/^#{2,3}\s+(.*)$/);
    if (headingMatch) {
      return (
        <h2 key={i} className="cren-heading-lg mt-8 mb-4">
          {headingMatch[1]}
        </h2>
      );
    }
    if (trimmed.length < 80 && !trimmed.includes(".") && !trimmed.includes("[") && trimmed === p) {
      return (
        <h2 key={i} className="cren-heading-lg mt-8 mb-4">
          {trimmed}
        </h2>
      );
    }
    return (
      <p key={i} className="cren-body mt-4" style={{ lineHeight: 1.8 }}>
        {renderInline(trimmed, `p${i}`)}
      </p>
    );
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let article: DbArticle | null = null;
  let relatedArticles: DbArticle[] = [];

  try {
    article = await getArticleBySlug(slug);
    if (article) {
      const all = await getArticles();
      relatedArticles = all
        .filter((a) => a.id !== article!.id)
        .slice(0, 5);
    }
  } catch {
    article = null;
  }

  if (!article) notFound();

  const canonicalUrl = `https://columbusrealestatenews.com/blog/${slug}`;
  const initials = article.author.split(" ").map((n) => n[0]).join("");
  const topic = article.topic_slug ? getTopicBySlug(article.topic_slug) : null;
  const area = article.area_slug ? getAreaBySlug(article.area_slug) : null;
  const visibleTags = (Array.isArray(article.tags) ? article.tags : []).filter(
    (tag) => tag !== article.topic_slug && tag !== article.area_slug,
  );

  const jsonLdBlogPosting = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonicalUrl}#blogposting`,
    headline: article.title,
    description: article.meta_description ?? article.excerpt ?? "",
    datePublished: article.date,
    dateModified: article.updated_at,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    author: { "@type": "Person", name: article.author },
    publisher: { "@type": "Organization", name: "Columbus Real Estate News" },
    ...(article.image_url ? { image: [article.image_url] } : {}),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://columbusrealestatenews.com/" },
      { "@type": "ListItem", position: 2, name: "Market News", item: "https://columbusrealestatenews.com/blog" },
      { "@type": "ListItem", position: 3, name: article.title, item: canonicalUrl },
    ],
  };

  return (
    <>
      <Script id={`blogposting-${slug}`} type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(jsonLdBlogPosting)}
      </Script>
      <Script id={`breadcrumb-${slug}`} type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(breadcrumb)}
      </Script>
      <CrenPage wide>
        <article className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="cren-stack">
            {/* Header */}
            <header className="cren-surface p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Link href={topic ? `/topics/${topic.slug}` : "/topics"} className="inline-block rounded-full bg-[color:var(--green)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--green)] no-underline">
                  {article.category}
                </Link>
                {topic && topic.name !== article.category && (
                  <Link href={`/topics/${topic.slug}`} className="inline-block rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--text-secondary)] no-underline">
                    {topic.name}
                  </Link>
                )}
                {area && area.slug !== "columbus-citywide" && (
                  <Link href={`/areas/${area.slug}`} className="inline-block rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--text-secondary)] no-underline">
                    {area.name}
                  </Link>
                )}
                {visibleTags.map((tag) => (
                  <span key={tag} className="inline-block rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text-muted)]">
                    {tag.replaceAll("-", " ")}
                  </span>
                ))}
                <span className="text-xs text-[color:var(--text-muted)]">{article.read_time}</span>
              </div>
              <h1 className="cren-heading-xl">{article.title}</h1>
              {article.excerpt && (
                <p className="cren-body mt-3 text-lg" style={{ color: "var(--text-secondary)" }}>
                  {article.excerpt}
                </p>
              )}
              <div className="mt-6 flex items-center gap-3 border-t border-[color:var(--border)] pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--green)] text-sm font-bold text-white">
                  {initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[color:var(--text-hero)]">{article.author}</div>
                  <div className="text-xs text-[color:var(--text-muted)]">{article.date}</div>
                </div>
              </div>
            </header>

            {/* Hero image */}
            {article.image_url && (
              <figure className="overflow-hidden rounded-[var(--radius-sm)] cren-surface">
                <div className="relative aspect-[16/9] w-full">
                  <CoverImage src={article.image_url} alt={article.image_alt ?? article.title} sizes="(max-width: 1024px) 100vw, 720px" priority />
                </div>
                {article.image_caption && (
                  <figcaption className="px-4 py-3 text-xs text-[color:var(--text-muted)]">
                    {article.image_caption}
                  </figcaption>
                )}
              </figure>
            )}

            {/* Body */}
            <div className="cren-surface p-6 md:p-8">
              {article.body ? (
                renderBody(article.body)
              ) : (
                <p className="cren-body text-[color:var(--text-muted)]">
                  Full article content coming soon.
                </p>
              )}
            </div>

            {/* CTA */}
            <section className="cren-surface p-6" data-section-id="blog-cta">
              <h2 className="cren-heading-lg text-[length:1.25rem]">Stay Informed</h2>
              <p className="cren-body mt-2">
                Get the Columbus RE Insider newsletter — market data, neighborhood analysis, and investment insights delivered every Tuesday.
              </p>
              <Link href="/subscribe" className="cren-btn cren-btn-primary mt-4 inline-flex">
                Subscribe Free
              </Link>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="cren-surface h-fit p-5 lg:sticky lg:top-24">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">More Coverage</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {relatedArticles.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/blog/${generateSlug(item.title)}`}
                    className="cren-text-link block font-medium transition hover:opacity-90"
                  >
                    {item.title}
                  </Link>
                  <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
                    {item.category} · {item.date}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-[color:var(--border)] pt-4">
              <Link href="/blog" className="cren-text-link text-sm font-semibold">
                View all coverage
              </Link>
            </div>
          </aside>
        </article>
      </CrenPage>
    </>
  );
}
